import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  ResolvedOfficialConfig,
  WechatOfficialConfigService,
} from './wechat-official-config.service';
import { OfficialAccessTokenService } from './official-access-token.service';
import {
  DEFAULT_FALLBACK_REPLY,
  DEFAULT_WELCOME_REPLY,
  matchKeywordRule,
} from './official-keyword-rules';
import {
  buildTextReply,
  parseWechatXml,
  WechatXmlMessage,
} from './official-xml.util';

/** 菜单点击事件 key，与附录菜单 JSON 保持一致。 */
export const MENU_KEY_CONTACT_SERVICE = 'MENU_CONTACT_SERVICE';
export const MENU_KEY_ABOUT_US = 'MENU_ABOUT_US';

const MENU_REPLIES: Record<string, string> = {
  [MENU_KEY_CONTACT_SERVICE]: `人工客服在线时间 10:00–21:00。
请直接在对话框描述你的问题（订单号 + 具体情况），客服看到会立即回复。`,
  [MENU_KEY_ABOUT_US]: `NailBook 是一个美甲预约平台，连接客户与实名认证的美甲师，支持上门与到店两种服务形式。
【立即预约】可直接下单，【了解我们】可查看作品与门店信息。`,
};

/** 微信文本回复上限约 2048 字节，这里按字符做保守截断。 */
const MAX_REPLY_LENGTH = 600;

@Injectable()
export class WechatOfficialMessageService {
  private readonly logger = new Logger(WechatOfficialMessageService.name);
  /** MsgId 幂等去重：微信 5 秒未收到响应会重试 3 次。 */
  private readonly handled = new Map<string, number>();
  private static readonly DEDUP_TTL_MS = 5 * 60 * 1000;
  private static readonly DEDUP_MAX = 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly officialConfig: WechatOfficialConfigService,
    private readonly accessToken: OfficialAccessTokenService,
  ) {}

  /** 处理入站消息，返回明文回复 XML；返回空串表示不回复。 */
  async handleMessage(xml: string): Promise<string> {
    const message = parseWechatXml(xml);
    const fromUserName = message.FromUserName;
    const toUserName = message.ToUserName;
    if (!fromUserName || !toUserName) {
      this.logger.warn('收到无法解析的微信消息，已忽略');
      return '';
    }
    if (this.isDuplicate(message)) {
      return '';
    }

    const { welcomeReply, fallbackReply } =
      await this.officialConfig.getReplyTemplates();
    const safeWelcome = welcomeReply || DEFAULT_WELCOME_REPLY;
    const safeFallback = fallbackReply || DEFAULT_FALLBACK_REPLY;

    if (message.MsgType === 'event') {
      return this.handleEvent({
        message,
        fromUserName,
        toUserName,
        welcomeReply: safeWelcome,
        fallbackReply: safeFallback,
      });
    }

    if (message.MsgType === 'text') {
      const rule = matchKeywordRule(message.Content ?? '');
      return buildTextReply({
        toUserName: fromUserName,
        fromUserName: toUserName,
        content: this.limit(rule ? rule.reply : safeFallback),
      });
    }

    // 图片、语音、位置等暂不单独处理，统一给出兜底指引。
    return buildTextReply({
      toUserName: fromUserName,
      fromUserName: toUserName,
      content: this.limit(safeFallback),
    });
  }

  private async handleEvent(input: {
    message: WechatXmlMessage;
    fromUserName: string;
    toUserName: string;
    welcomeReply: string;
    fallbackReply: string;
  }): Promise<string> {
    const { message, fromUserName, toUserName } = input;
    const event = (message.Event ?? '').toLowerCase();

    if (event === 'subscribe') {
      await this.recordIdentity(fromUserName, message.EventKey);
      return this.text(fromUserName, toUserName, input.welcomeReply);
    }

    if (event === 'unsubscribe') {
      this.logger.log(`用户取消关注：${fromUserName}`);
      return '';
    }

    if (event === 'scan') {
      // 已关注用户扫描带参二维码：记录来源，不重复发欢迎语。
      await this.recordIdentity(fromUserName, message.EventKey);
      return '';
    }

    if (event === 'click') {
      const key = message.EventKey ?? '';
      const reply = MENU_REPLIES[key] ?? input.fallbackReply;
      return this.text(fromUserName, toUserName, reply);
    }

    return '';
  }

  private text(toUserName: string, fromUserName: string, content: string) {
    return buildTextReply({
      toUserName,
      fromUserName,
      content: this.limit(content),
    });
  }

  private limit(content: string) {
    return content.length > MAX_REPLY_LENGTH
      ? `${content.slice(0, MAX_REPLY_LENGTH)}…`
      : content;
  }

  /**
   * 关注/扫码时登记身份，便于后续通过 unionId 与小程序账号打通。
   * 获取 unionId 失败不影响回复流程。
   */
  private async recordIdentity(openId: string, eventKey?: string) {
    const channel = this.parseChannel(eventKey);
    if (channel) {
      this.logger.log(`扫码关注来源：${channel}（${openId}）`);
    }
    try {
      const config = await this.officialConfig.requireResolvedConfig();
      const unionId = await this.fetchUnionId(config, openId);
      await this.prisma.wechatIdentity.upsert({
        where: {
          appId_openId: { appId: config.appId, openId },
        },
        create: { appId: config.appId, openId, unionId },
        update: unionId ? { unionId } : {},
      });
    } catch (error) {
      this.logger.warn(`登记公众号用户身份失败：${String(error)}`);
    }
  }

  private parseChannel(eventKey?: string) {
    if (!eventKey) {
      return null;
    }
    return eventKey.replace(/^qrscene_/, '');
  }

  private async fetchUnionId(config: ResolvedOfficialConfig, openId: string) {
    try {
      const token = await this.accessToken.getAccessTokenFor(
        config.appId,
        config.appSecret,
      );
      const url =
        `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${token}` +
        `&openid=${encodeURIComponent(openId)}&lang=zh_CN`;
      const response = await fetch(url, { method: 'GET' });
      const payload = (await response.json()) as { unionid?: string };
      return payload.unionid ?? null;
    } catch (error) {
      this.logger.warn(`获取 unionId 失败：${String(error)}`);
      return null;
    }
  }

  private isDuplicate(message: WechatXmlMessage) {
    const key = message.MsgId
      ? `msg:${message.MsgId}`
      : message.FromUserName && message.CreateTime
        ? `evt:${message.FromUserName}:${message.CreateTime}:${message.Event ?? ''}`
        : '';
    if (!key) {
      return false;
    }
    const now = Date.now();
    const previous = this.handled.get(key);
    if (previous && now - previous < WechatOfficialMessageService.DEDUP_TTL_MS) {
      this.logger.log(`忽略重复消息：${key}`);
      return true;
    }
    this.handled.set(key, now);
    if (this.handled.size > WechatOfficialMessageService.DEDUP_MAX) {
      for (const [itemKey, timestamp] of this.handled) {
        if (now - timestamp > WechatOfficialMessageService.DEDUP_TTL_MS) {
          this.handled.delete(itemKey);
        }
      }
    }
    return false;
  }
}
