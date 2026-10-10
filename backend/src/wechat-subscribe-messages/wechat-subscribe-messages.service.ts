import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WechatPlatformConfigService } from '../wechat-platform-config/wechat-platform-config.service';
import { getBusinessDateTimeParts } from '../orders/business-time';

type Role = 'client' | 'technician';
type ReminderType = 'day_before' | 'hour_before';

@Injectable()
export class WechatSubscribeMessagesService {
  private readonly logger = new Logger(WechatSubscribeMessagesService.name);
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly platform: WechatPlatformConfigService,
  ) {}

  async recordAuthorization(
    role: Role,
    ownerId: number,
    decisions: Record<string, string> = {},
  ) {
    const ownerKey = `${role}:${ownerId}`;
    const entries = Object.entries(decisions).filter(
      ([templateId, status]) =>
        templateId.trim().length > 0 &&
        ['accept', 'reject', 'ban'].includes(status),
    );
    await this.prisma.$transaction(
      entries.map(([templateId, status]) =>
        this.prisma.wechatSubscriptionAuthorization.upsert({
          where: { ownerKey_templateId: { ownerKey, templateId } },
          create: {
            ownerKey,
            role,
            templateId,
            status,
            grantedAt: status === 'accept' ? new Date() : null,
          },
          update: {
            status,
            grantedAt: status === 'accept' ? new Date() : null,
          },
        }),
      ),
    );
    return { recorded: entries.length };
  }

  async sendOrderReminder(order: any, type: ReminderType) {
    const templateIds = await this.platform.getBookingReminderTemplateIds();
    const templateId =
      type === 'day_before' ? templateIds.dayBefore : templateIds.hourBefore;
    if (!templateId) return { sent: 0, skipped: 'template_not_configured' };
    const launchConfig = await this.platform.getPublicLaunchConfig();
    const recipients: Array<{ role: Role; id: number; page: string }> = [];
    if (order.clientUserId) {
      recipients.push({
        role: 'client',
        id: order.clientUserId,
        page: `pages/client/order-detail/index?id=${order.id}`,
      });
    }
    recipients.push({
      role: 'technician',
      id: order.technicianId,
      page: `pages/technician/order-detail/index?id=${order.id}`,
    });

    let sent = 0;
    for (const recipient of recipients) {
      const ownerKey = `${recipient.role}:${recipient.id}`;
      const authorization =
        await this.prisma.wechatSubscriptionAuthorization.findUnique({
          where: { ownerKey_templateId: { ownerKey, templateId } },
        });
      if (authorization?.status !== 'accept') continue;
      const identity = await this.prisma.wechatIdentity.findFirst({
        where:
          recipient.role === 'client'
            ? { clientUserId: recipient.id }
            : { technicianId: recipient.id },
        select: { openId: true },
      });
      if (!identity) continue;
      try {
        await this.send(
          templateId,
          identity.openId,
          recipient.page,
          order,
          type,
          launchConfig.storeName,
        );
        sent += 1;
      } catch (error) {
        this.logger.warn(
          `微信订阅消息发送失败 (${ownerKey}): ${(error as Error).message}`,
        );
      }
    }
    return { sent };
  }

  private async send(
    templateId: string,
    openId: string,
    page: string,
    order: any,
    type: ReminderType,
    storeName: string,
  ) {
    const accessToken = await this.accessToken();
    const start = getBusinessDateTimeParts(new Date(order.startTime));
    const time = `${start.year}-${start.month}-${start.day} ${start.hour}:${start.minute}`;
    const serviceName = String(order.customTitle || '预约美甲服务').slice(
      0,
      20,
    );
    const shopName = String(storeName || '听栖美甲工作室').slice(0, 20);
    const data =
      type === 'day_before'
        ? {
            thing7: { value: serviceName },
            time2: { value: time },
            thing8: { value: shopName },
            thing9: { value: '明天有预约，请合理安排行程' },
          }
        : {
            thing32: { value: serviceName },
            time2: { value: time },
            thing8: { value: shopName },
            thing9: { value: '距离预约约1小时，请准备到店' },
          };
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touser: openId,
          template_id: templateId,
          page,
          miniprogram_state:
            process.env.NODE_ENV === 'production' ? 'formal' : 'developer',
          lang: 'zh_CN',
          data,
        }),
      },
    );
    const result = (await response.json()) as {
      errcode?: number;
      errmsg?: string;
    };
    if (!response.ok || result.errcode) {
      throw new Error(result.errmsg || `微信返回 HTTP ${response.status}`);
    }
  }

  private async accessToken() {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token.value;
    }
    const credentials = await this.platform.getLoginCredentials();
    const params = new URLSearchParams({
      grant_type: 'client_credential',
      appid: credentials.appId,
      secret: credentials.appSecret,
    });
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?${params.toString()}`,
    );
    const result = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      errmsg?: string;
    };
    if (!response.ok || !result.access_token) {
      throw new Error(result.errmsg || '微信 access token 获取失败');
    }
    this.token = {
      value: result.access_token,
      expiresAt: Date.now() + (result.expires_in || 7200) * 1000,
    };
    return this.token.value;
  }
}
