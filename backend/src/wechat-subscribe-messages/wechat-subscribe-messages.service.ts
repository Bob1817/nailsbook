import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WechatPlatformConfigService } from '../wechat-platform-config/wechat-platform-config.service';
import { getBusinessDateTimeParts } from '../orders/business-time';

type Role = 'client' | 'technician';
type ReminderType = 'day_before' | 'hour_before';
type BookingEventType = 'client_success' | 'technician_new';

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
      try {
        const delivered = await this.sendAuthorized(
          templateId,
          recipient.role,
          recipient.id,
          recipient.page,
          this.reminderData(
            order,
            type,
            recipient.role,
            launchConfig.storeName,
          ),
        );
        if (delivered) sent += 1;
      } catch (error) {
        this.logger.warn(
          `微信订阅消息发送失败 (${recipient.role}:${recipient.id}): ${(error as Error).message}`,
        );
      }
    }
    return { sent };
  }

  async sendBookingEvent(order: any, type: BookingEventType) {
    const templateIds = await this.platform.getBookingEventTemplateIds();
    const isClient = type === 'client_success';
    const templateId = isClient
      ? templateIds.clientSuccess
      : templateIds.technicianNew;
    if (!templateId) return { sent: 0, skipped: 'template_not_configured' };
    const recipient = {
      role: (isClient ? 'client' : 'technician') as Role,
      id: isClient ? order.clientUserId : order.technicianId,
      page: isClient
        ? `pages/client/order-detail/index?id=${order.id}`
        : `pages/technician/order-detail/index?id=${order.id}`,
    };
    if (!recipient.id) return { sent: 0, skipped: 'recipient_missing' };
    const launchConfig = await this.platform.getPublicLaunchConfig();
    const start = getBusinessDateTimeParts(new Date(order.startTime));
    const time = `${start.year}-${start.month}-${start.day} ${start.hour}:${start.minute}`;
    const serviceName = String(order.customTitle || '预约美甲服务').slice(
      0,
      20,
    );
    const data: Record<string, { value: string }> = isClient
      ? {
          thing7: { value: serviceName },
          time2: { value: time },
          thing8: {
            value: String(launchConfig.storeName || '听栖美甲工作室').slice(
              0,
              20,
            ),
          },
          thing4: {
            value: String(
              order.address || launchConfig.storeAddress || '请查看预约详情',
            ).slice(0, 20),
          },
          thing9: { value: '预约已确认，请按时到店' },
        }
      : {
          thing7: { value: serviceName },
          time2: { value: time },
          name6: {
            value: String(
              order.customer?.name || order.customerName || '客户',
            ).slice(0, 10),
          },
          thing9: { value: '收到新的预约申请，请及时确认' },
        };
    try {
      const delivered = await this.sendAuthorized(
        templateId,
        recipient.role,
        recipient.id,
        recipient.page,
        data,
      );
      return { sent: delivered ? 1 : 0 };
    } catch (error) {
      this.logger.warn(
        `微信订阅消息发送失败 (${recipient.role}:${recipient.id}): ${(error as Error).message}`,
      );
      return { sent: 0, failed: true };
    }
  }

  private reminderData(
    order: any,
    type: ReminderType,
    role: Role,
    storeName: string,
  ): Record<string, { value: string }> {
    const start = getBusinessDateTimeParts(new Date(order.startTime));
    const time = `${start.year}-${start.month}-${start.day} ${start.hour}:${start.minute}`;
    const serviceName = String(order.customTitle || '预约美甲服务').slice(
      0,
      20,
    );
    const shopName = String(storeName || '听栖美甲工作室').slice(0, 20);
    const tip =
      role === 'technician'
        ? type === 'day_before'
          ? '明天有预约，请提前准备接待客户'
          : '距离预约约1小时，请准备接待客户'
        : type === 'day_before'
          ? '明天有预约，请合理安排行程'
          : '距离预约约1小时，请准备按时到店';
    return type === 'day_before'
      ? {
          thing7: { value: serviceName },
          time2: { value: time },
          thing8: { value: shopName },
          thing9: { value: tip },
        }
      : {
          thing32: { value: serviceName },
          time2: { value: time },
          thing8: { value: shopName },
          thing9: { value: tip },
        };
  }

  private async sendAuthorized(
    templateId: string,
    role: Role,
    ownerId: number,
    page: string,
    data: Record<string, { value: string }>,
  ) {
    const ownerKey = `${role}:${ownerId}`;
    const authorization =
      await this.prisma.wechatSubscriptionAuthorization.findUnique({
        where: { ownerKey_templateId: { ownerKey, templateId } },
      });
    if (authorization?.status !== 'accept') return false;
    const identity = await this.prisma.wechatIdentity.findFirst({
      where:
        role === 'client'
          ? { clientUserId: ownerId }
          : { technicianId: ownerId },
      select: { openId: true },
    });
    if (!identity) return false;
    const accessToken = await this.accessToken();
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touser: identity.openId,
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
    return true;
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
