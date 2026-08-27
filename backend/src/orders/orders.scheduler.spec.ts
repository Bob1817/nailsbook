import { OrdersScheduler } from './orders.scheduler';

describe('OrdersScheduler 自动完成收入', () => {
  it('到达结束时间后通过统一事务完成订单，保留实际结束时间', async () => {
    const now = new Date('2026-08-26T12:00:00Z');
    const startTime = new Date('2026-08-26T10:00:00Z');
    const prisma = { order: { findMany: jest.fn().mockResolvedValue([{ id: 1, startTime }]) } };
    const orders = { complete: jest.fn().mockResolvedValue({ status: 'confirmed' }) };
    const scheduler = new OrdersScheduler(prisma as never, {} as never, {} as never, orders as never);
    await (scheduler as any).autoTransitionToCompleted(now);
    expect(orders.complete).toHaveBeenCalledWith(1, {
      actualStartTime: startTime.toISOString(), actualEndTime: now.toISOString(),
    }, 'automatic');
  });
});
