import { OrdersScheduler } from './orders.scheduler';

describe('OrdersScheduler 自动完成收入', () => {
  it('到达结束时间后按报价写入实际支付金额和确认收入', async () => {
    const now = new Date('2026-08-26T12:00:00Z');
    const order = {
      id: 1,
      status: 'in_progress',
      technicianId: 7,
      customerId: 3,
      clientUserId: null,
      quotePrice: 798,
      fundDiscountAmount: 0,
      actualAmount: null,
    };
    const prisma: any = {
      order: {
        findMany: jest.fn().mockResolvedValue([order]),
        update: jest.fn().mockResolvedValue({ ...order, status: 'completed' }),
      },
      revenue: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 1 }),
      },
      $transaction: jest.fn(async (callback: (tx: any) => Promise<void>) =>
        callback(prisma),
      ),
    };
    const scheduler = new OrdersScheduler(prisma, {} as never, {} as never);

    await (scheduler as any).autoTransitionToCompleted(now);

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: 'completed',
        completedAt: now,
        actualAmount: 798,
      }),
    });
    expect(prisma.revenue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 1,
        amount: 798,
        status: 'confirmed',
      }),
    });
  });
});
