import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';

/** 美甲师端关键状态流转的「成功路径」全链路（写库 + 系统消息 + 实时推送）。 */
describe('OrdersService 流转成功路径', () => {
  let service: OrdersService;
  let prisma: any;
  let emit: jest.Mock;

  beforeEach(() => {
    emit = jest.fn();
    const chatGateway = { server: { to: jest.fn().mockReturnValue({ emit }) } };
    prisma = {
      $transaction: jest.fn(async (cb: (tx: any) => Promise<unknown>) =>
        cb(prisma),
      ),
      order: {
        update: jest.fn().mockResolvedValue({ id: 1 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      conversation: {
        upsert: jest.fn().mockResolvedValue({ id: 5 }),
        findUnique: jest.fn().mockResolvedValue({ id: 5 }),
      },
      message: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      blockedTimeSlot: {
        findFirst: jest.fn().mockResolvedValue(null),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 4 }),
      },
      bookingTradeOrder: {
        upsert: jest.fn().mockResolvedValue({ id: 20 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      paymentOrder: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      orderReminder: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      revenue: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 9, amount: 200 }),
        upsert: jest.fn().mockResolvedValue({ id: 9, amount: 200 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      serviceRecord: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      contentPublicationTask: { upsert: jest.fn().mockResolvedValue({ id: 1 }) },
      actionTask: { upsert: jest.fn().mockResolvedValue({ id: 1 }) },
      customer: { update: jest.fn().mockResolvedValue({ id: 3 }) },
      service: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    service = new OrdersService(prisma, chatGateway as never);
  });

  it('confirm 上门：pending_confirm → pending_home，并给客户发系统消息+推送', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1,
      status: 'pending_confirm',
      serviceType: '上门美甲',
      clientUserId: 11,
      technicianId: 7,
      depositAmount: 0,
      isDepositPaid: false,
      startTime: new Date('2026-06-10T10:00:00Z'),
      endTime: new Date('2026-06-10T12:00:00Z'),
    } as never);

    await service.confirm(1);

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending_home', bookingPhase: 'booking' }),
      }),
    );
    const msg = prisma.message.create.mock.calls[0][0].data;
    expect(msg.receiverType).toBe('client');
    expect(msg.relatedType).toBe('order');
    expect(prisma.blockedTimeSlot.create).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('confirm 到店：pending_confirm → pending_shop', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1,
      status: 'pending_confirm',
      serviceType: '到店美甲',
      clientUserId: 11,
      technicianId: 7,
      depositAmount: 0,
      startTime: new Date('2026-06-10T10:00:00Z'),
      endTime: new Date('2026-06-10T12:00:00Z'),
    } as never);

    await service.confirm(1);

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending_shop' }),
      }),
    );
  });

  it('confirm 遇到已锁定档期时不转正式预约', async () => {
    prisma.blockedTimeSlot.findFirst.mockResolvedValue({ id: 99 });
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1,
      status: 'pending_confirm',
      serviceType: '到店美甲',
      technicianId: 7,
      depositAmount: 0,
      startTime: new Date('2026-06-10T10:00:00Z'),
      endTime: new Date('2026-06-10T12:00:00Z'),
    } as never);

    await expect(service.confirm(1)).rejects.toThrow('该时间段已被预约');
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(prisma.blockedTimeSlot.create).not.toHaveBeenCalled();
  });

  it('confirm 带定金但支付未确认：创建交易并等待定金回调', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1,
      status: 'pending_confirm',
      serviceType: '上门美甲',
      clientUserId: 11,
      technicianId: 7,
      depositAmount: 50,
      isDepositPaid: false,
      startTime: new Date('2026-06-10T10:00:00Z'),
      endTime: new Date('2026-06-10T12:00:00Z'),
    } as never);

    await service.confirm(1);
    expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'pending_home',
        tradeStatus: 'deposit_pending',
        fulfillmentStatus: 'pending_home',
      }),
    }));
    expect(prisma.blockedTimeSlot.create).toHaveBeenCalledTimes(1);
  });

  it('complete：in_progress → completed，并生成收入记录', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1,
      status: 'in_progress',
      clientUserId: 11,
      technicianId: 7,
      paymentStatus: 'paid',
      customerId: 3,
      quotePrice: 200,
      paymentStatus: 'paid',
      paidAmount: 200,
      paymentStatus: 'paid',
    } as never);

    const res = await service.complete(1);

    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, status: 'in_progress' },
        data: expect.objectContaining({ status: 'completed' }),
      }),
    );
    expect(prisma.revenue.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ amount: 200, orderId: 1 }),
      }),
    );
    expect(res).toEqual({ id: 9, amount: 200 });
  });

  it('complete：已有定金收入记录时更新为实际收入', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1,
      status: 'in_progress',
      technicianId: 7,
      paymentStatus: 'paid',
    } as never);
    prisma.revenue.findUnique.mockResolvedValue({ id: 9 });

    await service.complete(1, { actualAmount: 200 });
    expect(prisma.revenue.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ amount: 200, status: 'confirmed' }),
      }),
    );
  });

  it('complete：并发请求未取得状态流转权时不生成收入', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1,
      status: 'in_progress',
      technicianId: 7,
      customerId: 3,
      quotePrice: 200,
      paymentStatus: 'paid',
    } as never);
    prisma.order.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.complete(1)).rejects.toThrow(
      '该订单已完成，无需重复处理',
    );
    expect(prisma.revenue.upsert).not.toHaveBeenCalled();
  });

  it('cancel：进行中已付定金选择不退时，定金确认为收入', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1,
      status: 'in_progress',
      technicianId: 7,
      customerId: 3,
      clientUserId: null,
      isDepositPaid: true,
      depositAmount: 50,
      paidAmount: 50,
      depositConfirmedAt: new Date('2026-08-01T00:00:00Z'),
    } as never);

    await service.cancel(1, '客户取消', false);

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ depositStatus: 'forfeited' }),
      }),
    );
    expect(prisma.revenue.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ amount: 50, status: 'confirmed' }),
      }),
    );
  });

  it('cancel：进行中已付定金选择退还时，定金收入作废', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1,
      status: 'in_progress',
      technicianId: 7,
      customerId: 3,
      clientUserId: null,
      isDepositPaid: true,
      depositAmount: 50,
      paidAmount: 50,
    } as never);

    await service.cancel(1, undefined, true);

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          depositStatus: 'refunded',
          isDepositPaid: false,
        }),
      }),
    );
    expect(prisma.revenue.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ amount: 0, status: 'voided' }),
      }),
    );
  });

  it('已完成预约可单独修改实际支付金额和收入快照', async () => {
    jest.spyOn(service, 'findOneForTechnician').mockResolvedValue({
      id: 1,
      status: 'completed',
    } as never);

    await service.updateActualAmount(1, 7, 688);

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { actualAmount: 688 },
    });
    expect(prisma.revenue.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 688 }) }),
    );
  });
});
