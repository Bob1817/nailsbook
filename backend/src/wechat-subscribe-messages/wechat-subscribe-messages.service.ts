import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { WechatPlatformConfigService } from '../wechat-platform-config/wechat-platform-config.service';
import { getBusinessDateTimeParts } from '../orders/business-time';

type Role = 'client' | 'technician';
type ReminderType = 'day_before' | 'hour_before';
type BookingEventType = 'client_success' | 'technician_new';
type SendOutcome =
  | { sent: true }
  | {
      sent: false;
      reason: string;
      providerCode?: string;
      providerMessage?: string;
    };

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
    const now = new Date();
    await this.prisma.$transaction(
      entries.map(([templateId, status]) => {
        const accepted = status === 'accept';
        const banned = status === 'ban';
        return this.prisma.wechatSubscriptionAuthorization.upsert({
          where: { ownerKey_templateId: { ownerKey, templateId } },
          create: {
            ownerKey,
            role,
            templateId,
            status,
            availableCount: accepted ? 1 : 0,
            acceptedCount: accepted ? 1 : 0,
            grantedAt: accepted ? now : null,
            lastAcceptedAt: accepted ? now : null,
          },
          update: {
            status,
            ...(accepted
              ? {
                  availableCount: { increment: 1 },
                  acceptedCount: { increment: 1 },
                  grantedAt: now,
                  lastAcceptedAt: now,
                  lastErrorCode: null,
                  lastErrorMessage: null,
                }
              : banned
                ? { availableCount: 0 }
                : {}),
          },
        });
      }),
    );
    return { recorded: entries.length };
  }

  async getAuthorizationStatus(role: Role, ownerId: number) {
    const reminderTemplates =
      await this.platform.getBookingReminderTemplateIds();
    const eventTemplates = await this.platform.getBookingEventTemplateIds();
    const notificationTemplates =
      await this.platform.getNotificationTemplateIds();
    const templates = {
      bookingEvent:
        role === 'technician'
          ? eventTemplates.technicianNew
          : eventTemplates.clientSuccess,
      bookingStatus:
        role === 'technician'
          ? notificationTemplates.technicianStatus
          : notificationTemplates.clientStatus,
      dayBefore: reminderTemplates.dayBefore,
      hourBefore: reminderTemplates.hourBefore,
      consultationReply: notificationTemplates.consultationReply,
    };
    const templateIds = Object.values(templates).filter(
      (templateId, index, values) =>
        Boolean(templateId) && values.indexOf(templateId) === index,
    ) as string[];
    const authorizations = templateIds.length
      ? await this.prisma.wechatSubscriptionAuthorization.findMany({
          where: {
            ownerKey: `${role}:${ownerId}`,
            templateId: { in: templateIds },
          },
          select: { templateId: true, availableCount: true, status: true },
        })
      : [];
    const byTemplate = new Map(
      authorizations.map((item) => [item.templateId, item]),
    );
    const availableTemplates = templateIds.filter(
      (templateId) => (byTemplate.get(templateId)?.availableCount ?? 0) > 0,
    ).length;
    const templateStatuses = Object.fromEntries(
      Object.entries(templates).map(([key, templateId]) => {
        const authorization = templateId ? byTemplate.get(templateId) : null;
        const availableCount = authorization?.availableCount ?? 0;
        return [
          key,
          {
            configured: Boolean(templateId),
            enabled: Boolean(templateId) && availableCount > 0,
            availableCount,
            status: authorization?.status ?? 'missing',
          },
        ];
      }),
    );
    const recentDeliveries = await this.prisma.notificationDelivery.findMany({
      where: {
        notificationEvent: {
          recipientRole: role,
          recipientId: ownerId,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        status: true,
        sentAt: true,
        providerCode: true,
        providerMessage: true,
        updatedAt: true,
        notificationEvent: { select: { eventType: true } },
      },
    });
    return {
      status:
        templateIds.length > 0 && availableTemplates === templateIds.length
          ? 'normal'
          : availableTemplates > 0
            ? 'needs_top_up'
            : 'needs_enable',
      configuredTemplates: templateIds.length,
      availableTemplates,
      banned: authorizations.some((item) => item.status === 'ban'),
      templates,
      templateStatuses,
      recentDeliveries: recentDeliveries.map((delivery) => ({
        eventType: delivery.notificationEvent.eventType,
        status: delivery.status,
        sentAt: delivery.sentAt,
        errorCode: delivery.providerCode,
        errorMessage: delivery.providerMessage,
        updatedAt: delivery.updatedAt,
      })),
    };
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
      const delivered = await this.dispatchAuthorized({
        eventKey: `booking.${type}:${order.id}:${new Date(order.startTime).toISOString()}:${recipient.role}`,
        eventType: `booking.${type}`,
        templateId,
        role: recipient.role,
        ownerId: recipient.id,
        orderId: order.id,
        page: recipient.page,
        data: this.reminderData(
          order,
          type,
          recipient.role,
          launchConfig.storeName,
        ),
      });
      if (delivered) sent += 1;
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
    const version = order.quoteVersion ?? order.updatedAt ?? order.createdAt ?? 1;
    const delivered = await this.dispatchAuthorized({
      eventKey: `booking.${type}:${order.id}:${String(version)}`,
      eventType: `booking.${type}`,
      templateId,
      role: recipient.role,
      ownerId: recipient.id,
      orderId: order.id,
      page: recipient.page,
      data,
    });
    return { sent: delivered ? 1 : 0 };
  }

  async sendBookingStatusEvent(
    order: any,
    role: Role,
    statusLabel: string,
    tip: string,
    eventVersion?: string,
  ) {
    const templates = await this.platform.getNotificationTemplateIds();
    const templateId =
      role === 'client' ? templates.clientStatus : templates.technicianStatus;
    if (!templateId) return { sent: 0, skipped: 'template_not_configured' };
    const ownerId = role === 'client' ? order.clientUserId : order.technicianId;
    if (!ownerId) return { sent: 0, skipped: 'recipient_missing' };
    const start = getBusinessDateTimeParts(new Date(order.startTime));
    const time = `${start.year}-${start.month}-${start.day} ${start.hour}:${start.minute}`;
    const serviceName = String(order.customTitle || '预约美甲服务').slice(0, 20);
    const common = {
      thing7: { value: serviceName },
      time2: { value: time },
      phrase11: { value: String(statusLabel).slice(0, 5) },
    };
    const data = role === 'client'
      ? {
          ...common,
          thing38: {
            value: String(order.technician?.name || order.technicianName || '美甲师').slice(0, 20),
          },
          thing9: { value: String(tip).slice(0, 20) },
        }
      : {
          ...common,
          name6: {
            value: String(order.customer?.name || order.customerName || '客户').slice(0, 10),
          },
          thing9: { value: String(tip).slice(0, 20) },
        };
    const version = eventVersion || String(order.updatedAt || Date.now());
    const delivered = await this.dispatchAuthorized({
      eventKey: `booking.status.${statusLabel}:${order.id}:${role}:${version}`,
      eventType: `booking.status.${statusLabel}`,
      templateId,
      role,
      ownerId,
      orderId: order.id,
      page: role === 'client'
        ? `pages/client/order-detail/index?id=${order.id}`
        : `pages/technician/order-detail/index?id=${order.id}`,
      data,
    });
    return { sent: delivered ? 1 : 0 };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async sendUnreadConversationNotifications() {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const messages = await this.prisma.message.findMany({
      where: {
        isRead: false,
        createdAt: { lte: cutoff },
        senderType: { in: ['client', 'technician'] },
        receiverType: { in: ['client', 'technician'] },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        conversation: {
          include: {
            client: { select: { nickname: true, phone: true } },
            technician: { select: { name: true } },
          },
        },
      },
    });
    const groups = new Map<string, any[]>();
    for (const message of messages) {
      const key = `${message.conversationId}:${message.receiverType}:${message.receiverId}`;
      const current = groups.get(key) || [];
      current.push(message);
      groups.set(key, current);
    }
    let sent = 0;
    for (const group of groups.values()) {
      if (await this.sendConversationReplyNotification(group)) sent += 1;
    }
    return { sent, groups: groups.size };
  }

  private async sendConversationReplyNotification(messages: any[]) {
    const first = messages[0];
    const last = messages[messages.length - 1];
    const role = first.receiverType as Role;
    const ownerId = Number(first.receiverId);
    if (!ownerId || !['client', 'technician'].includes(role)) return false;
    const templates = await this.platform.getNotificationTemplateIds();
    if (!templates.consultationReply) return false;
    const senderName = role === 'technician'
      ? first.conversation.client?.nickname || first.conversation.client?.phone || '客户'
      : first.conversation.technician?.name || '美甲师';
    const timeParts = getBusinessDateTimeParts(new Date(last.createdAt));
    const time = `${timeParts.year}-${timeParts.month}-${timeParts.day} ${timeParts.hour}:${timeParts.minute}`;
    const hasImage = messages.some((message) => message.messageType === 'image');
    const summary = `${messages.length}条新消息${hasImage ? '，含图片' : ''}`;
    return this.dispatchAuthorized({
      eventKey: `chat.unread:${first.conversationId}:${role}:${first.id}`,
      eventType: 'chat.unread',
      templateId: templates.consultationReply,
      role,
      ownerId,
      conversationId: first.conversationId,
      messageId: first.id,
      page: role === 'client'
        ? `pages/client/chat-detail/index?conversationId=${first.conversationId}`
        : `pages/technician/chat-detail/index?conversationId=${first.conversationId}`,
      data: {
        thing2: { value: String(senderName).slice(0, 20) },
        time3: { value: time },
        thing1: { value: summary.slice(0, 20) },
        thing4: { value: '请进入小程序及时查看并回复'.slice(0, 20) },
      },
    });
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

  private async dispatchAuthorized(input: {
    eventKey: string;
    eventType: string;
    templateId: string;
    role: Role;
    ownerId: number;
    orderId?: number;
    conversationId?: number;
    messageId?: number;
    page: string;
    data: Record<string, { value: string }>;
  }) {
    const previous = await this.prisma.notificationEvent.findUnique({
      where: { eventKey: input.eventKey },
      include: { deliveries: true },
    });
    if (
      previous?.status === 'delivered' ||
      previous?.deliveries.some((delivery) => delivery.status === 'sent')
    ) {
      return false;
    }
    const event = await this.prisma.notificationEvent.upsert({
      where: { eventKey: input.eventKey },
      create: {
        eventKey: input.eventKey,
        eventType: input.eventType,
        recipientRole: input.role,
        recipientId: input.ownerId,
        orderId: input.orderId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        payloadSnapshot: JSON.stringify({ page: input.page, data: input.data }),
      },
      update: { status: 'sending' },
    });
    const dedupeKey = `${input.eventKey}:wechat_subscribe`;
    const delivery = await this.prisma.notificationDelivery.upsert({
      where: { dedupeKey },
      create: {
        notificationEventId: event.id,
        channel: 'wechat_subscribe',
        status: 'pending',
        attemptCount: 0,
        dedupeKey,
      },
      update: {},
      select: { status: true },
    });
    if (delivery.status === 'sent') return false;
    const claimed = await this.prisma.notificationDelivery.updateMany({
      where: {
        dedupeKey,
        status: { in: ['pending', 'failed', 'skipped'] },
      },
      data: { status: 'sending', attemptCount: { increment: 1 } },
    });
    if (claimed.count !== 1) return false;
    let outcome: SendOutcome;
    try {
      outcome = await this.sendAuthorized(
        input.templateId,
        input.role,
        input.ownerId,
        input.page,
        input.data,
      );
    } catch (error) {
      outcome = {
        sent: false,
        reason: 'provider_error',
        providerCode: 'unexpected_error',
        providerMessage: (error as Error).message,
      };
    }
    await this.prisma.notificationDelivery.update({
      where: { dedupeKey },
      data: outcome.sent
        ? {
            status: 'sent',
            sentAt: new Date(),
            providerCode: null,
            providerMessage: null,
          }
        : {
            status: outcome.reason === 'provider_error' ? 'failed' : 'skipped',
            providerCode: outcome.providerCode ?? null,
            providerMessage: outcome.providerMessage ?? outcome.reason,
          },
    });
    await this.prisma.notificationEvent.update({
      where: { id: event.id },
      data: {
        status: outcome.sent ? 'delivered' : 'failed',
        resolvedAt: outcome.sent ? new Date() : null,
      },
    });
    if (!outcome.sent && outcome.reason === 'provider_error') {
      this.logger.warn(
        `微信订阅消息发送失败 (${input.role}:${input.ownerId}): ${outcome.providerMessage || outcome.providerCode}`,
      );
    }
    return outcome.sent;
  }

  private async sendAuthorized(
    templateId: string,
    role: Role,
    ownerId: number,
    page: string,
    data: Record<string, { value: string }>,
  ): Promise<SendOutcome> {
    const ownerKey = `${role}:${ownerId}`;
    const authorization =
      await this.prisma.wechatSubscriptionAuthorization.findUnique({
        where: { ownerKey_templateId: { ownerKey, templateId } },
      });
    if (
      !authorization ||
      authorization.status === 'ban' ||
      authorization.availableCount < 1
    ) {
      return { sent: false, reason: 'authorization_unavailable' };
    }
    const identity = await this.prisma.wechatIdentity.findFirst({
      where:
        role === 'client'
          ? { clientUserId: ownerId }
          : { technicianId: ownerId },
      select: { openId: true },
    });
    if (!identity) return { sent: false, reason: 'wechat_identity_missing' };
    const accessToken = await this.accessToken();
    const reserved =
      await this.prisma.wechatSubscriptionAuthorization.updateMany({
        where: {
          id: authorization.id,
          status: { not: 'ban' },
          availableCount: { gt: 0 },
        },
        data: { availableCount: { decrement: 1 } },
      });
    if (reserved.count !== 1) {
      return { sent: false, reason: 'authorization_unavailable' };
    }

    let result: { errcode?: number; errmsg?: string } = {};
    let response: Response;
    try {
      response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            touser: identity.openId,
            template_id: templateId,
            page,
            miniprogram_state: this.miniProgramState(),
            lang: 'zh_CN',
            data,
          }),
        },
      );
      result = (await response.json()) as {
        errcode?: number;
        errmsg?: string;
      };
    } catch (error) {
      await this.restoreAuthorization(
        authorization.id,
        'network_error',
        (error as Error).message,
      );
      return {
        sent: false,
        reason: 'provider_error',
        providerCode: 'network_error',
        providerMessage: (error as Error).message,
      };
    }
    if (!response.ok || result.errcode) {
      const code = String(result.errcode ?? response.status);
      const message = result.errmsg || `微信返回 HTTP ${response.status}`;
      if (Number(result.errcode) === 43101) {
        await this.prisma.wechatSubscriptionAuthorization.update({
          where: { id: authorization.id },
          data: {
            status: 'reject',
            availableCount: 0,
            lastErrorCode: code,
            lastErrorMessage: message,
          },
        });
      } else {
        await this.restoreAuthorization(authorization.id, code, message);
      }
      return {
        sent: false,
        reason: 'provider_error',
        providerCode: code,
        providerMessage: message,
      };
    }
    await this.prisma.wechatSubscriptionAuthorization.update({
      where: { id: authorization.id },
      data: {
        consumedCount: { increment: 1 },
        lastConsumedAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
    return { sent: true };
  }

  private restoreAuthorization(id: number, code: string, message: string) {
    return this.prisma.wechatSubscriptionAuthorization.update({
      where: { id },
      data: {
        availableCount: { increment: 1 },
        lastErrorCode: code,
        lastErrorMessage: message,
      },
    });
  }

  private miniProgramState() {
    const configured = process.env.WECHAT_MINIPROGRAM_STATE?.trim();
    if (configured && ['developer', 'trial', 'formal'].includes(configured)) {
      return configured;
    }
    return process.env.NODE_ENV === 'production' ? 'formal' : 'developer';
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
