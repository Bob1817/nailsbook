import { Injectable, Logger } from '@nestjs/common';
import { WechatOfficialConfigService } from './wechat-official-config.service';
import { OfficialAccessTokenService } from './official-access-token.service';

export interface CustomerServiceAlertPayload {
  source: string;
  role: string;
  name?: string;
  phone?: string;
  content: string;
}

@Injectable()
export class WechatOfficialAlertService {
  private readonly logger = new Logger(WechatOfficialAlertService.name);
  private readonly defaultAdminOpenId = 'oLHIK3eE4o76OHTDTs-nBLFgulUw';

  constructor(
    private readonly configService: WechatOfficialConfigService,
    private readonly accessTokenService: OfficialAccessTokenService,
  ) {}

  async notifyCustomerServiceMessage(
    payload: CustomerServiceAlertPayload,
  ): Promise<boolean> {
    try {
      const config = await this.configService.requireResolvedConfig();
      if (!config.appId || !config.appSecret) {
        this.logger.warn('微信公众号未配置完成，跳过微信推送');
        return false;
      }
      const token = await this.accessTokenService.getAccessTokenFor(
        config.appId,
        config.appSecret,
      );
      const targetOpenId =
        process.env.ADMIN_WECHAT_OPENID || this.defaultAdminOpenId;
      const timeStr = new Date().toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
      });

      const text = [
        '【OnlyNail 在线客服新留言】',
        '━━━━━━━━━━━━━━',
        `👤 用户身份：${payload.role}`,
        `📛 联系称呼：${payload.name || '未提供'}`,
        `📱 联系方式：${payload.phone || '未提供'}`,
        `📍 来源页面：${payload.source}`,
        `🕒 提交时间：${timeStr}`,
        '━━━━━━━━━━━━━━',
        '📝 留言内容：',
        payload.content,
        '━━━━━━━━━━━━━━',
        '💡 提示：超管后台「问题反馈」已同步入库，可登录后台进行查看与回复处理。',
      ].join('\n');

      const response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            touser: targetOpenId,
            msgtype: 'text',
            text: { content: text },
          }),
        },
      );
      const resData = (await response.json()) as {
        errcode?: number;
        errmsg?: string;
      };
      if (resData.errcode === 0) {
        this.logger.log(`成功通过微信公众号向超管推送客服消息 (${targetOpenId})`);
        return true;
      } else {
        this.logger.warn(
          `微信公众号客服消息推送未成功: ${JSON.stringify(resData)}`,
        );
        return false;
      }
    } catch (err) {
      this.logger.error(`微信公众号推送客服消息异常: ${String(err)}`);
      return false;
    }
  }
}
