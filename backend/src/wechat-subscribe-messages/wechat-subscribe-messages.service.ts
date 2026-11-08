import { Prisma } from '@prisma/client';
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

  async enqueueBookingEvent(tx: Prisma.TransactionClient, order: any, type: BookingEventType) {
    return this.enqueueBooking(tx, order, type === 'client_success' ? 'client' : 'technician',
      `booking.${type}`, { kind: 'booking_event', type });
  }

  async enqueueOrderReminder(tx: Prisma.TransactionClient, order: any, type: ReminderType) {
    const roles: Role[] = order.clientUserId ? ['client', 'technician'] : ['technician'];
    for (const role of roles) {
      const key = `booking.${type}:${order.id}:${new Date(order.startTime).toISOString()}:${role}`;
      await this.enqueueBooking(tx, order, role, `booking.${type}`, { kind: 'booking_reminder', type }, undefined, key);
    }
  }

  async enqueueBookingStatusEvent(tx: Prisma.TransactionClient, order: any, role: Role,
    statusLabel: string, tip: string, eventVersion?: string) {
    return this.enqueueBooking(tx, order, role, `booking.status.${statusLabel}`,
      { kind: 'booking_status', statusLabel, tip }, eventVersion);
  }

  private async enqueueBooking(tx: Prisma.TransactionClient, order: any, role: Role,
    eventType: string, command: Record<string, string>, eventVersion?: string, persistedEventKey?: string) {
    // Persist only notification fields, never the full customer/order object.
    const snapshot = {
      id: order.id, status: order.status, quoteVersion: order.quoteVersion,
      startTime: order.startTime, updatedAt: order.updatedAt, createdAt: order.createdAt,
      clientUserId: order.clientUserId, technicianId: order.technicianId,
      customTitle: order.customTitle, serviceType: order.serviceType,
      address: order.address, shopName: order.shopName,
      technicianName: order.technician?.name || order.technicianName,
      customerName: order.customer?.name || order.customerName,
    };
    const version = eventVersion || `${order.quoteVersion ?? 0}:${new Date(order.updatedAt || order.createdAt || order.startTime).toISOString()}`;
    const eventKey = persistedEventKey || `${eventType}:${order.id}:${role}:${version}`;
    return tx.notificationEvent.upsert({
      where: { eventKey }, update: {},
      create: {
        eventKey, eventType, recipientRole: role,
        recipientId: (role === 'client' ? order.clientUserId : order.technicianId) || 0,
        orderId: order.id,
        payloadSnapshot: JSON.stringify({ ...command, order: snapshot, role }),
      },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processBookingOutbox() {
    const events = await this.prisma.notificationEvent.findMany({
      where: {
        eventType: { startsWith: 'booking.' }, status: { in: ['pending', 'sending'] },
        availableAt: { lte: new Date() },
        deliveries: { none: { status: { in: ['sending', 'sent', 'failed', 'skipped', 'unknown'] } } },
      },
      orderBy: { id: 'asc' }, take: 50,
    });
    for (const event of events) {
      try {
        const command = JSON.parse(event.payloadSnapshot);
        // A dispatch may have persisted its rendered payload before a restart.
        const snapshot = command.order || {
          status: command.orderStatus, startTime: command.orderStartTime,
          quoteVersion: command.orderQuoteVersion,
        };
        const order = await this.prisma.order.findUnique({ where: { id: event.orderId! },
          include: { technician: { select: { name: true, shopAddresses: true, brandProfile: true } } } });
        const isReminder = ['booking.day_before', 'booking.hour_before'].includes(event.eventType);
        const invalid = !order || order.status !== snapshot.status
          || (isReminder && new Date(order.startTime).getTime() <= Date.now())
          || (snapshot.quoteVersion != null && order.quoteVersion !== snapshot.quoteVersion)
          || new Date(order.startTime).getTime() !== new Date(snapshot.startTime).getTime()
          || Date.now() - event.createdAt.getTime() > 86400000
          || (event.recipientId > 0 && (event.recipientRole === 'client' ? order.clientUserId : order.technicianId) !== event.recipientId);
        if (invalid) {
          await this.prisma.notificationEvent.update({ where: { id: event.id }, data: { status: 'obsolete', resolvedAt: new Date() } });
          continue;
        }
        if (command.order && order.technician) {
          const technician = order.technician;
          command.order.technicianName = technician.brandProfile?.publicationStatus === 'published'
            ? technician.brandProfile.brandName || technician.name : technician.name;
          if (!command.order.shopName && command.order.serviceType !== '上门美甲') {
            // Only an exact, unambiguous address match identifies the booked shop.
            let shops: any[] = [];
            try { const parsed = JSON.parse(technician.shopAddresses || '[]'); if (Array.isArray(parsed)) shops = parsed; } catch {}
            const matches = shops.filter(shop => shop && shop.enabled !== false && shop.address && shop.address === command.order.address);
            if (matches.length === 1) command.order.shopName = matches[0].name;
          }
        }
        if (command.kind === 'booking_event') {
          await this.sendBookingEvent(command.order, command.type, event.eventKey);
        } else if (command.kind === 'booking_reminder') {
          await this.sendOrderReminder(command.order, command.type, command.role, event.eventKey);
        } else if (command.kind === 'booking_status') {
          await this.sendBookingStatusEvent(command.order, command.role, command.statusLabel, command.tip, undefined, event.eventKey);
        } else if (command.templateId !== undefined && command.eventKey) {
          await this.dispatchAuthorized(command);
        } else {
          await this.prisma.notificationEvent.update({ where: { id: event.id }, data: { status: 'invalid_snapshot' } });
        }
        if (isReminder) await this.reconcileReminder(order, event.eventType, new Date(snapshot.startTime).toISOString());
      } catch (error) {
        // Database/configuration reads can fail before a channel claim; keep the
        // durable event for a later pass without blocking unrelated orders.
        await this.prisma.notificationEvent.update({ where: { id: event.id },
          data: { availableAt: new Date(Date.now() + 300000) } });
        this.logger.warn(`预约通知任务失败 #${event.id}: ${(error as Error).message}`);
      }
    }
    // A process may die after submitting to WeChat. Do not blindly resend.
    await this.prisma.notificationDelivery.updateMany({
      where: { channel: 'wechat_subscribe', status: 'sending', updatedAt: { lt: new Date(Date.now() - 600000) } },
      data: { status: 'unknown', providerCode: 'delivery_outcome_unknown', providerMessage: '发送结果未确认，需核查，禁止自动重发' },
    });
  }

  async sendOrderReminder(order: any, type: ReminderType, recipientRole?: Role, persistedEventKey?: string) {
    const templateIds = await this.platform.getBookingReminderTemplateIds();
    const templateId =
      type === 'day_before' ? templateIds.dayBefore : templateIds.hourBefore;
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
    for (const recipient of recipients.filter(item => !recipientRole || item.role === recipientRole)) {
      const delivered = await this.dispatchAuthorized({
        eventKey: persistedEventKey || `booking.${type}:${order.id}:${new Date(order.startTime).toISOString()}:${recipient.role}`,
        eventType: `booking.${type}`,
        templateId: templateId || '',
        role: recipient.role,
        ownerId: recipient.id || 0,
        orderId: order.id,
        orderStatus: order.status,
      orderQuoteVersion: order.quoteVersion,
        orderStartTime: new Date(order.startTime).toISOString(),
        page: recipient.page,
        data: this.reminderData(
          order,
          type,
          recipient.role,
        ),
      });
      if (delivered) sent += 1;
    }
    return { sent };
  }

  async sendBookingEvent(order: any, type: BookingEventType, persistedEventKey?: string) {
    const templateIds = await this.platform.getBookingEventTemplateIds();
    const isClient = type === 'client_success';
    const templateId = isClient
      ? templateIds.clientSuccess
      : templateIds.technicianNew;
    const recipient = {
      role: (isClient ? 'client' : 'technician') as Role,
      id: isClient ? order.clientUserId : order.technicianId,
      page: isClient
        ? `pages/client/order-detail/index?id=${order.id}`
        : `pages/technician/order-detail/index?id=${order.id}`,
    };
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
            value: String(order.shopName || order.technicianName || '美甲服务').slice(
              0,
              20,
            ),
          },
          thing4: {
            value: String(
              order.address || '请查看预约详情',
            ).slice(0, 20),
          },
          thing9: { value: order.serviceType === '上门美甲' ? '预约已确认，请留意上门服务时间' : '预约已确认，请按时到店' },
        }
      : {
          thing7: { value: serviceName },
          time2: { value: time },
          name6: {
            value: String(
              order.customer?.name || order.customerName || '客户',
            ).slice(0, 10),
          },
          thing9: { value: ['pending_shop', 'pending_home'].includes(order.status) ? '收到已确认预约，请按时安排服务' : '收到新的预约申请，请及时确认' },
        };
    const version = order.quoteVersion ?? order.updatedAt ?? order.createdAt ?? 1;
    const delivered = await this.dispatchAuthorized({
      eventKey: persistedEventKey || `booking.${type}:${order.id}:${String(version)}`,
      eventType: `booking.${type}`,
      templateId: templateId || '',
      role: recipient.role,
      ownerId: recipient.id || 0,
      orderId: order.id,
      orderStatus: order.status,
      orderQuoteVersion: order.quoteVersion,
      orderStartTime: new Date(order.startTime).toISOString(),
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
    persistedEventKey?: string,
  ) {
    const templates = await this.platform.getNotificationTemplateIds();
    const templateId =
      role === 'client' ? templates.clientStatus : templates.technicianStatus;
    const ownerId = role === 'client' ? order.clientUserId : order.technicianId;
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
            value: String(order.technicianName || order.technician?.name || '美甲师').slice(0, 20),
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
      eventKey: persistedEventKey || `booking.status.${statusLabel}:${order.id}:${role}:${version}`,
      eventType: `booking.status.${statusLabel}`,
      templateId: templateId || '',
      role,
      ownerId: ownerId || 0,
      orderId: order.id,
      orderStatus: order.status,
      orderQuoteVersion: order.quoteVersion,
      orderStartTime: new Date(order.startTime).toISOString(),
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
  ): Record<string, { value: string }> {
    const start = getBusinessDateTimeParts(new Date(order.startTime));
    const time = `${start.year}-${start.month}-${start.day} ${start.hour}:${start.minute}`;
    const serviceName = String(order.customTitle || '预约美甲服务').slice(
      0,
      20,
    );
    const shopName = String(order.shopName || order.technicianName || '美甲服务').slice(0, 20);
    const tip =
      role === 'technician'
        ? type === 'day_before'
          ? '明天有预约，请提前准备接待客户'
          : '距离预约约1小时，请准备接待客户'
        : type === 'day_before'
          ? '明天有预约，请合理安排行程'
          : order.serviceType === '上门美甲' ? '距离预约约1小时，请准备上门服务' : '距离预约约1小时，请准备按时到店';
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

  // Only retry definite provider rejections. Network timeouts can mean the
  // provider accepted the message: leave those for inspection to avoid duplicates.
  @Cron(CronExpression.EVERY_MINUTE)
  async retryBookingNotifications() {
    const deliveries = await this.prisma.notificationDelivery.findMany({
      where: {
        channel: 'wechat_subscribe', status: 'failed', attemptCount: { lt: 3 },
        providerCode: { in: ['-1', '40001', '40014', '42001', '45009', '500', '502', '503', '504'] },
        updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
        notificationEvent: { eventType: { startsWith: 'booking.' } },
      },
      include: { notificationEvent: true },
      orderBy: { updatedAt: 'asc' }, take: 50,
    });
    for (const delivery of deliveries) {
      try {
        const event = delivery.notificationEvent;
        const input = JSON.parse(event.payloadSnapshot);
        // Older snapshots cannot be replayed safely.
        if (!input.templateId || !input.orderId || !input.orderStatus || !input.orderStartTime) {
          await this.prisma.notificationDelivery.updateMany({
            where: { id: delivery.id, status: 'failed' },
            data: { status: 'skipped', providerCode: 'snapshot_incomplete', providerMessage: '旧记录缺少安全补发信息，需人工核查' },
          });
          continue;
        }
        const order = await this.prisma.order.findUnique({ where: { id: input.orderId } });
        const reminder = ['booking.day_before', 'booking.hour_before'].includes(event.eventType);
        const expired = !order || order.status !== input.orderStatus
          || (input.orderQuoteVersion != null && order.quoteVersion !== input.orderQuoteVersion)
          || (input.role === 'client' ? order.clientUserId : order.technicianId) !== input.ownerId
          || new Date(order.startTime).toISOString() !== input.orderStartTime
          || Date.now() - event.createdAt.getTime() > 24 * 60 * 60 * 1000
          || (reminder && new Date(order.startTime).getTime() <= Date.now());
        if (expired) {
          await this.prisma.notificationDelivery.updateMany({
            where: { id: delivery.id, status: 'failed' },
            data: { status: 'skipped', providerCode: 'event_obsolete', providerMessage: '预约状态或时间已变化，停止补发' },
          });
          continue;
        }
        if (['40001', '40014', '42001'].includes(delivery.providerCode || '')) this.token = null;
        await this.dispatchAuthorized(input);
        if (reminder) await this.reconcileReminder(order, event.eventType, input.orderStartTime);
      } catch (error) {
        this.logger.warn(`预约通知补发失败 #${delivery.id}: ${(error as Error).message}`);
      }
    }
  }

  private async reconcileReminder(order: any, eventType: string, startTime: string) {
    const roles = order.clientUserId ? ['client', 'technician'] : ['technician'];
    const sent = await this.prisma.notificationDelivery.count({ where: {
      status: 'sent', channel: 'wechat_subscribe',
      notificationEvent: { eventKey: { in: roles.map(role => `${eventType}:${order.id}:${startTime}:${role}`) } },
    } });
    await this.prisma.orderReminder.updateMany({
      where: { orderId: order.id, type: eventType.slice('booking.'.length), status: { in: ['queued', 'partial'] } },
      data: { status: sent === roles.length ? 'sent' : 'partial',
        sentAt: sent === roles.length ? new Date() : null,
        lastError: sent === roles.length ? null : `微信接口接受 ${sent}/${roles.length}，详见渠道发送记录` },
    });
  }

  private async dispatchAuthorized(input: {
    eventKey: string;
    eventType: string;
    templateId: string;
    role: Role;
    ownerId: number;
    orderId?: number;
    orderStatus?: string;
    orderQuoteVersion?: number;
    orderStartTime?: string;
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
      return true;
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
        payloadSnapshot: JSON.stringify(input),
      },
      update: { status: 'sending', payloadSnapshot: JSON.stringify(input) },
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
      select: { status: true, providerCode: true },
    });
    if (['40001', '40014', '42001'].includes(delivery.providerCode || '')) this.token = null;
    if (delivery.status === 'sent') return true;
    const claimed = await this.prisma.notificationDelivery.updateMany({
      where: {
        dedupeKey,
        status: { in: ['pending', 'failed'] },
        attemptCount: { lt: 3 },
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
            providerCode: outcome.providerCode ?? outcome.reason,
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
    if (!templateId) return { sent: false, reason: 'template_not_configured' };
    if (!ownerId) return { sent: false, reason: 'recipient_missing' };
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
