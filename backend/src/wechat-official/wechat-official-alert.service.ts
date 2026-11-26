import { Injectable, Logger } from '@nestjs/common';
import { WechatOfficialConfigService } from './wechat-official-config.service';
import { OfficialAccessTokenService } from './official-access-token.service';

export interface CustomerServiceAlertPayload {
  source: string;
  role: string;
  name?: string;
  phone?: string;
  content: string;
  attachmentCount?: number;
}

export interface FeedbackAlertPayload {
  id: number;
  sourceType: 'client' | 'technician';
  sourceName?: string | null;
  sourcePhone?: string | null;
  type: string;
  title: string;
  content: string;
  attachmentCount?: number;
}

@Injectable()
export class WechatOfficialAlertService {
  private readonly logger = new Logger(WechatOfficialAlertService.name);
  private readonly defaultAdminOpenId = 'oLHIK3eE4o76OHTDTs-nBLFgulUw';

  constructor(
    private readonly configService: WechatOfficialConfigService,
    private readonly accessTokenService: OfficialAccessTokenService,
  ) {}

  private async sendAdminTextMessage(text: string, logLabel: string): Promise<boolean> {
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
        this.logger.log(`成功通过微信公众号向超管推送${logLabel} (${targetOpenId})`);
        return true;
      } else {
        this.logger.warn(
          `微信公众号${logLabel}推送未成功: ${JSON.stringify(resData)}`,
        );
        return false;
      }
    } catch (err) {
      this.logger.error(`微信公众号推送${logLabel}异常: ${String(err)}`);
      return false;
    }
  }

  async notifyCustomerServiceMessage(
    payload: CustomerServiceAlertPayload,
  ): Promise<boolean> {
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
      payload.attachmentCount ? `🖼️ 附带截图：${payload.attachmentCount} 张` : '',
      `🕒 提交时间：${timeStr}`,
      '━━━━━━━━━━━━━━',
      '📝 留言内容：',
      payload.content,
      '━━━━━━━━━━━━━━',
      '💡 提示：超管后台「客服与反馈」已同步入库，可登录后台查看截图并回复处理。',
    ]
      .filter(Boolean)
      .join('\n');

    return this.sendAdminTextMessage(text, '客服消息');
  }

  async notifyFeedbackSubmission(
    payload: FeedbackAlertPayload,
  ): Promise<boolean> {
    const timeStr = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    });
    const roleLabel = payload.sourceType === 'technician' ? '美甲师' : '客户';
    const isCs = payload.type === '客服咨询';

    const text = [
      isCs ? '【OnlyNail 客服新问询】' : '【OnlyNail 新问题反馈】',
      '━━━━━━━━━━━━━━',
      `🔖 编号：#${payload.id}`,
      `👤 提交身份：${roleLabel}`,
      `📛 姓名/昵称：${payload.sourceName || '未提供'}`,
      `📱 联系方式：${payload.sourcePhone || '未提供'}`,
      `🏷️ 分类：${payload.type}`,
      `📌 标题：${payload.title}`,
      payload.attachmentCount ? `🖼️ 问题截图：${payload.attachmentCount} 张` : '',
      `🕒 提交时间：${timeStr}`,
      '━━━━━━━━━━━━━━',
      '📝 详细内容：',
      payload.content,
      '━━━━━━━━━━━━━━',
      '💡 提示：已同步保存至超管后台「客服与反馈」，请及时查看截图并回复处理。',
    ]
      .filter(Boolean)
      .join('\n');

    return this.sendAdminTextMessage(text, isCs ? '客服问询' : '问题反馈');
  }

  async notifyArtistApplication(params: {
    name: string;
    phone: string;
    city?: string;
    serviceMode?: string;
    note?: string;
  }): Promise<boolean> {
    const timeStr = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    });
    const isCampaign = params.serviceMode === 'model_artist';
    const text = [
      isCampaign ? '【OnlyNail 官方活动新申请】' : '【OnlyNail 美甲师试用新申请】',
      '━━━━━━━━━━━━━━',
      `👤 申请人：${params.name}`,
      `📱 手机号：${params.phone}`,
      `📍 城市：${params.city || '未填写'}`,
      `🏷️ 类型：${isCampaign ? '模特美甲师官方活动' : params.serviceMode || '未指定'}`,
      params.note ? `📝 备注：${params.note}` : '',
      `🕒 提交时间：${timeStr}`,
      '━━━━━━━━━━━━━━',
      '💡 请及时登录超管后台「入驻/活动审批」处理。',
    ]
      .filter(Boolean)
      .join('\n');

    return this.sendAdminTextMessage(text, isCampaign ? '活动申请' : '入驻申请');
  }

  async notifyUserRegistration(params: {
    role: 'client' | 'technician';
    name?: string | null;
    phone: string;
    source?: string;
  }): Promise<boolean> {
    const timeStr = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    });
    const roleLabel = params.role === 'technician' ? '美甲师' : '客户';
    const text = [
      `【OnlyNail 新${roleLabel}注册】`,
      '━━━━━━━━━━━━━━',
      `👤 身份：${roleLabel}`,
      `📛 姓名/昵称：${params.name || '未填写'}`,
      `📱 手机号：${params.phone}`,
      `📍 注册来源：${params.source || '直接注册'}`,
      `🕒 注册时间：${timeStr}`,
      '━━━━━━━━━━━━━━',
      '💡 可登录超管后台查看用户详情。',
    ].join('\n');

    return this.sendAdminTextMessage(text, `新${roleLabel}注册`);
  }
}
