import { OrdersScheduler } from './orders.scheduler';

describe('OrdersScheduler reminders', () => {
  const order = {
    id: 31,
    clientUserId: 8,
    technicianId: 7,
    startTime: new Date('2026-08-01T10:00:00.000Z'),
  };

  function createScheduler(reminder: Record<string, unknown>) {
    const prisma = {
      orderReminder: {
        upsert: jest.fn().mockResolvedValue(reminder),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const scheduler = new OrdersScheduler(
      prisma as never,
      { server: { to: jest.fn() } } as never,
      {} as never,
    );
    return { scheduler, prisma };
  }

  it('同一提醒已成功时不会重复发送', async () => {
    const { scheduler, prisma } = createScheduler({
      id: 91,
      status: 'sent',
      attempts: 1,
    });
    const broadcast = jest
      .spyOn(scheduler as any, 'broadcastOrderReminder')
      .mockResolvedValue(undefined);

    await (scheduler as any).processReminder(
      order,
      'day_before',
      '明日提醒',
      new Date('2026-07-31T12:00:00.000Z'),
    );

    expect(prisma.orderReminder.updateMany).not.toHaveBeenCalled();
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('发送失败时记录失败原因，后续扫描可以重试', async () => {
    const { scheduler, prisma } = createScheduler({
      id: 91,
      status: 'failed',
      attempts: 1,
    });
    jest
      .spyOn(scheduler as any, 'broadcastOrderReminder')
      .mockRejectedValue(new Error('temporary channel error'));

    await (scheduler as any).processReminder(
      order,
      'hour_before',
      '一小时提醒',
      new Date('2026-08-01T09:00:00.000Z'),
    );

    expect(prisma.orderReminder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['pending', 'failed'] },
          attempts: { lt: 3 },
        }),
        data: expect.objectContaining({
          status: 'sending',
          attempts: { increment: 1 },
        }),
      }),
    );
    expect(prisma.orderReminder.update).toHaveBeenCalledWith({
      where: { id: 91 },
      data: {
        status: 'failed',
        lastError: 'temporary channel error',
      },
    });
  });
});
