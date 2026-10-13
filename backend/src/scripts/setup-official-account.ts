/**
 * 公众号接入一键初始化。
 *
 * 作用：校验 AppID/AppSecret、自动生成 Token 与 EncodingAESKey、写入配置，
 * 并打印需要粘贴到微信后台的三项值（无需手工计算任何参数）。
 *
 * 推荐在后端容器内执行（这样 AppSecret 不必离开服务器）：
 *   docker exec -it nailbook-backend-1 node dist/src/scripts/setup-official-account.js \
 *     --appid=wx... --secret=...
 *
 * 本地开发也可用：
 *   npx ts-node -r tsconfig-paths/register src/scripts/setup-official-account.ts \
 *     --appid=wx... --secret=...
 *
 * 可选参数：
 *   --create-menu   校验通过后立即创建默认菜单
 *   --keep-token    沿用已保存的 Token/EncodingAESKey，不重新生成
 */

import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { OfficialCryptoService } from '../wechat-official/official-crypto.service';
import { OfficialAccessTokenService } from '../wechat-official/official-access-token.service';
import { OfficialMenuService } from '../wechat-official/official-menu.service';
import { WechatOfficialConfigService } from '../wechat-official/wechat-official-config.service';

interface Args {
  appId?: string;
  secret?: string;
  createMenu: boolean;
  keepToken: boolean;
  callbackUrl: string;
}

const DEFAULT_CALLBACK_URL = 'https://api.lunails.cn/api/wechat/official/callback';

function parseArgs(argv: string[]): Args {
  const result: Args = {
    createMenu: argv.includes('--create-menu'),
    keepToken: argv.includes('--keep-token'),
    callbackUrl: DEFAULT_CALLBACK_URL,
  };
  for (const item of argv) {
    if (item.startsWith('--appid=')) result.appId = item.slice(8).trim();
    if (item.startsWith('--secret=')) result.secret = item.slice(9).trim();
    if (item.startsWith('--callback-url=')) result.callbackUrl = item.slice(15).trim();
  }
  return result;
}

function generateToken() {
  return randomBytes(16).toString('hex');
}

/** 微信规定 EncodingAESKey 为 43 位，对应 32 字节密钥的 base64 去掉结尾 '='。 */
function generateEncodingAesKey() {
  return randomBytes(32).toString('base64').replace(/=/g, '');
}

async function probeAccessToken(appId: string, secret: string) {
  const url =
    'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential' +
    `&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(secret)}`;
  try {
    const response = await fetch(url);
    return (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      errcode?: number;
      errmsg?: string;
    };
  } catch (error) {
    return { errcode: -1, errmsg: `网络请求失败：${String(error)}` };
  }
}

function explainError(errcode?: number, errmsg?: string) {
  switch (errcode) {
    case 40013:
      return 'AppID 不正确，请核对公众号 AppID（注意不要填成小程序的）';
    case 40125:
      return 'AppSecret 不正确，请在开发者平台「开发密钥」中重新复制';
    case 40164:
      return '当前服务器 IP 不在 API IP 白名单内，请在开发者平台添加后重试（修改需数分钟生效）';
    case 40243:
      return 'AppSecret 已被冻结，请先在开发者平台解冻';
    default:
      return `微信返回错误 ${errcode ?? 'unknown'}：${errmsg ?? ''}`;
  }
}

function printFillInBlock(input: {
  callbackUrl: string;
  token: string;
  encodingAesKey: string;
}) {
  console.log('');
  console.log('================ 请把以下内容填到微信后台 ================');
  console.log('入口：微信开发者平台 → 我的业务与服务 → 服务号 → 基础信息 → 域名与消息推送配置');
  console.log(`服务器地址(URL)：${input.callbackUrl}`);
  console.log(`Token：          ${input.token}`);
  console.log(`EncodingAESKey：  ${input.encodingAesKey}`);
  console.log('消息加解密方式：  明文模式（验证稳定后可切「安全模式」并同步修改配置）');
  console.log('==========================================================');
  console.log('');
  console.log('填写顺序建议：');
  console.log('  1) 先确认 API IP 白名单已加入本服务器公网 IP');
  console.log('  2) 在「消息推送」中填入上述 URL / Token / EncodingAESKey 并保存');
  console.log('  3) 保存成功后，用微信关注公众号验证欢迎语与关键词回复');
  console.log('  4) 执行菜单同步：node dist/src/scripts/sync-official-menu.js create');
  console.log('');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.appId || !args.secret) {
    console.error('缺少参数。用法：');
    console.error(
      '  node dist/src/scripts/setup-official-account.js --appid=wx... --secret=...',
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  const configService = new ConfigService();
  const crypto = new OfficialCryptoService(configService);
  const officialConfig = new WechatOfficialConfigService(
    prisma as never,
    crypto,
  );
  const accessToken = new OfficialAccessTokenService(officialConfig);
  const menuService = new OfficialMenuService(accessToken);

  try {
    console.log(`校验公众号凭据（AppID：${args.appId}）...`);
    const probe = await probeAccessToken(args.appId, args.secret);
    const credentialOk = !!probe.access_token;
    if (credentialOk) {
      console.log('凭据校验通过，且当前服务器 IP 已在白名单内。');
    } else {
      console.warn(`凭据校验未通过：${explainError(probe.errcode, probe.errmsg)}`);
      if (probe.errcode !== 40164) {
        console.warn('配置未写入，请修正后重试。');
        process.exitCode = 1;
        return;
      }
      console.warn(
        '仍会写入配置，但必须先在开发者平台把本机公网 IP 加入 API IP 白名单，否则后续接口不可用。',
      );
    }

    const current = await officialConfig.getAdminConfig();
    const useExisting = args.keepToken && current.token;
    const token = useExisting ? current.token : generateToken();
    const encodingAesKey = useExisting ? '' : generateEncodingAesKey();

    await officialConfig.update({
      enabled: true,
      appId: args.appId,
      appSecret: args.secret,
      token,
      ...(encodingAesKey ? { encodingAesKey } : {}),
      encryptMode: 'plaintext',
    });
    console.log('配置已写入数据库（AppSecret 与 EncodingAESKey 已加密存储）。');

    if (credentialOk) {
      await officialConfig.markValidated();
    } else {
      await officialConfig.markValidated(
        explainError(probe.errcode, probe.errmsg),
      );
    }

    const finalConfig = await officialConfig.getAdminConfig();
    const aesKeyForDisplay = encodingAesKey
      ? encodingAesKey
      : '(沿用已保存的 EncodingAESKey，未重新生成)';
    printFillInBlock({
      callbackUrl: args.callbackUrl,
      token: finalConfig.token,
      encodingAesKey: aesKeyForDisplay,
    });

    if (args.createMenu) {
      if (!credentialOk) {
        console.warn('凭据未通过，跳过菜单创建。');
      } else {
        console.log('创建默认菜单 ...');
        await menuService.createMenu();
        console.log('菜单创建成功（老用户最长 24 小时内更新）。');
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('初始化失败：', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
