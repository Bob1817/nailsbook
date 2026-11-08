import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';

const RETRY_CODES = ['-1', '40001', '40014', '42001', '45009', '500', '502', '503', '504'];
const STATES = ['pending', 'sending', 'delivered', 'failed', 'obsolete', 'invalid_snapshot'];

@Injectable()
export class AdminNotificationsService {
  private readonly logger = new Logger(AdminNotificationsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async list(orderId?: string, page?: string, status?: string) {
    const currentPage = page ? Number(page) : 1;
    if (!Number.isSafeInteger(currentPage) || currentPage < 1) throw new BadRequestException('页码无效');
    if (orderId && (!Number.isSafeInteger(Number(orderId)) || Number(orderId) < 1)) throw new BadRequestException('预约ID无效');
    if (status && !STATES.includes(status)) throw new BadRequestException('状态无效');
    const where = { eventType: { startsWith: 'booking.' }, ...(orderId ? { orderId: Number(orderId) } : {}), ...(status ? { status } : {}) };
    const [events, total] = await this.prisma.$transaction([
      this.prisma.notificationEvent.findMany({ where, orderBy: { id: 'desc' }, skip: (currentPage - 1) * 20, take: 20,
        select: { id: true, eventType: true, orderId: true, recipientRole: true, recipientId: true, status: true,
          createdAt: true, availableAt: true, resolvedAt: true, deliveries: { select: { id: true, status: true,
            attemptCount: true, providerCode: true, providerMessage: true, sentAt: true, updatedAt: true } } } }),
      this.prisma.notificationEvent.count({ where }),
    ]);
    return { data: events.map(event => ({ ...event, deliveries: event.deliveries.map(delivery => ({ ...delivery,
      canRetry: delivery.status === 'failed' && delivery.attemptCount < 3 && RETRY_CODES.includes(delivery.providerCode || ''),
    })) })), total, page: currentPage };
  }

  async health() {
    const dayAgo = new Date(Date.now() - 86400000);
    const booking = { eventType: { startsWith: 'booking.' } };
    const [backlog, unknown, exhausted, misconfigured, noAuthorization] = await Promise.all([
      this.prisma.notificationEvent.count({ where: { ...booking, status: { in: ['pending', 'sending'] }, createdAt: { lt: new Date(Date.now() - 600000) } } }),
      this.prisma.notificationDelivery.count({ where: { status: 'unknown', notificationEvent: booking } }),
      this.prisma.notificationDelivery.count({ where: { status: 'failed', attemptCount: { gte: 3 }, updatedAt: { gte: dayAgo }, notificationEvent: booking } }),
      this.prisma.notificationDelivery.count({ where: { providerCode: 'template_not_configured', updatedAt: { gte: dayAgo }, notificationEvent: booking } }),
      this.prisma.notificationDelivery.count({ where: { providerCode: { in: ['authorization_unavailable', '43101'] }, updatedAt: { gte: dayAgo }, notificationEvent: booking } }),
    ]);
    return { backlog, unknown, exhausted, misconfigured, noAuthorization, checkedAt: new Date() };
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async monitor() {
    const health = await this.health();
    if (health.backlog || health.unknown || health.exhausted || health.misconfigured) {
      this.logger.warn(`微信预约通知异常 ${JSON.stringify(health)}`);
    }
  }

  async retry(id: number) {
    return this.prisma.$transaction(async tx => {
      const delivery = await tx.notificationDelivery.findUnique({ where: { id }, include: { notificationEvent: true } });
      if (!delivery) throw new NotFoundException('通知记录不存在');
      const event = delivery.notificationEvent;
      if (!event.eventType.startsWith('booking.') || delivery.channel !== 'wechat_subscribe'
        || delivery.status !== 'failed' || delivery.attemptCount >= 3 || !RETRY_CODES.includes(delivery.providerCode || '')) {
        throw new BadRequestException('当前记录不允许重试：已发送、未知结果、无授权或次数已用完');
      }
      let input;
      try { input = JSON.parse(event.payloadSnapshot); } catch { throw new BadRequestException('发送快照无效'); }
      const order = event.orderId ? await tx.order.findUnique({ where: { id: event.orderId } }) : null;
      const reminder = ['booking.day_before', 'booking.hour_before'].includes(event.eventType);
      if (!input.templateId || !order || input.orderId !== order.id || order.status !== input.orderStatus
        || (input.role === 'client' ? order.clientUserId : order.technicianId) !== input.ownerId
        || (input.orderQuoteVersion != null && order.quoteVersion !== input.orderQuoteVersion)
        || new Date(order.startTime).getTime() !== new Date(input.orderStartTime).getTime()
        || Date.now() - event.createdAt.getTime() > 86400000
        || (reminder && new Date(order.startTime).getTime() <= Date.now())) {
        throw new BadRequestException('预约状态、报价或时间已变化，禁止补发旧通知');
      }
      const changed = await tx.notificationDelivery.updateMany({ where: { id, status: 'failed', attemptCount: delivery.attemptCount }, data: { status: 'pending' } });
      if (changed.count !== 1) throw new BadRequestException('发送状态已变化，请刷新后查看');
      await tx.notificationEvent.update({ where: { id: event.id }, data: { status: 'pending', availableAt: new Date() } });
      return { id, queued: true };
    });
  }
}
