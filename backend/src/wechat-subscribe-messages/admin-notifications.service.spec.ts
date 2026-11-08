import { AdminNotificationsService } from './admin-notifications.service';

describe('AdminNotificationsService safe retry', () => {
  function setup(code = '45009', status = 'failed', attempts = 1) {
    const startTime = new Date(Date.now() + 3600000);
    const snapshot = { templateId: 'template', orderId: 18, orderStatus: 'pending_shop', role: 'client', ownerId: 7, orderQuoteVersion: 2, orderStartTime: startTime.toISOString() };
    const event = { id: 2, orderId: 18, eventType: 'booking.client_success', createdAt: new Date(), payloadSnapshot: JSON.stringify(snapshot) };
    const delivery = { id: 3, channel: 'wechat_subscribe', status, attemptCount: attempts, providerCode: code, notificationEvent: event };
    const order = { id: 18, status: 'pending_shop', clientUserId: 7, technicianId: 8, quoteVersion: 2, startTime };
    const tx = { notificationDelivery: { findUnique: jest.fn().mockResolvedValue(delivery), updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, notificationEvent: { update: jest.fn() }, order: { findUnique: jest.fn().mockResolvedValue(order) } };
    const prisma = { $transaction: jest.fn(callback => callback(tx)) };
    return { service: new AdminNotificationsService(prisma as any), tx, event, order };
  }
  it('queues a definite transient rejection without resetting the attempt budget', async () => {
    const { service, tx } = setup();
    await expect(service.retry(3)).resolves.toEqual({ id: 3, queued: true });
    expect(tx.notificationDelivery.updateMany).toHaveBeenCalledWith({ where: { id: 3, status: 'failed', attemptCount: 1 }, data: { status: 'pending' } });
    expect(tx.notificationEvent.update).toHaveBeenCalledTimes(1);
  });
  it.each([['43101', 'failed', 1], ['network_error', 'failed', 1], ['45009', 'unknown', 1], ['45009', 'sent', 1], ['45009', 'failed', 3]])('rejects unsafe retry %s/%s/%s', async (code, status, attempts) => {
    const { service, tx } = setup(code as string, status as string, attempts as number);
    await expect(service.retry(3)).rejects.toThrow('不允许重试');
    expect(tx.notificationDelivery.updateMany).not.toHaveBeenCalled();
  });
  it.each(['status', 'recipient', 'version', 'time', 'age'])('rejects stale %s', async reason => {
    const { service, tx, order, event } = setup();
    if (reason === 'status') order.status = 'cancelled';
    if (reason === 'recipient') order.clientUserId = 99;
    if (reason === 'version') order.quoteVersion++;
    if (reason === 'time') order.startTime = new Date(Date.now() + 7200000);
    if (reason === 'age') event.createdAt = new Date(Date.now() - 86400001);
    await expect(service.retry(3)).rejects.toThrow('禁止补发旧通知');
    expect(tx.notificationDelivery.updateMany).not.toHaveBeenCalled();
  });
  it('does not requeue when a worker already claimed the delivery', async () => {
    const { service, tx } = setup();
    tx.notificationDelivery.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.retry(3)).rejects.toThrow('状态已变化');
    expect(tx.notificationEvent.update).not.toHaveBeenCalled();
  });
  it('validates filters before querying', async () => {
    const { service } = setup();
    await expect(service.list('-1')).rejects.toThrow('预约ID无效');
    await expect(service.list(undefined, '0')).rejects.toThrow('页码无效');
    await expect(service.list(undefined, undefined, 'anything')).rejects.toThrow('状态无效');
  });
});
