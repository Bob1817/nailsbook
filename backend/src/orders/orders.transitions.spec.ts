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
      paymentOrder: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: 0 } }), create: jest.fn().mockResolvedValue({ id: 30 }) },
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
    jest.spyOn(service as any, 'assertTechnicianWorkSchedule').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'assertTechnicianShopSchedule').mockResolvedValue(undefined);
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
      startTime: new Date('2099-06-10T10:00:00Z'),
      endTime: new Date('2099-06-10T12:00:00Z'),
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
      startTime: new Date('2099-06-10T10:00:00Z'),
      endTime: new Date('2099-06-10T12:00:00Z'),
    } as never);

    await service.confirm(1);

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending_shop' }),
      }),
    );
  });

  it('确认时改价转为客户确认，不直接排期', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 1, technicianId: 7, status: 'pending_confirm', finalPriceFen: 28000, depositAmount: 0, startTime: new Date('2099-06-10T02:00:00Z') } as never);
    const review = jest.spyOn(service, 'review').mockResolvedValue({ status: 'pending_agree' } as never);
    await service.confirm(1, 268);
    expect(review).toHaveBeenCalledWith(1, 7, expect.objectContaining({ finalPriceFen: 26800, serviceDate: '2099-06-10', startTime: '10:00' }));
    expect(prisma.blockedTimeSlot.create).not.toHaveBeenCalled();
  });

  it('confirm 遇到已锁定档期时不转正式预约', async () => {
    prisma.blockedTimeSlot.findFirst.mockResolvedValue({ id: 99 });
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1,
      status: 'pending_confirm',
      serviceType: '到店美甲',
      technicianId: 7,
      depositAmount: 0,
      startTime: new Date('2099-06-10T10:00:00Z'),
      endTime: new Date('2099-06-10T12:00:00Z'),
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
      quotePrice: 200,
      depositAmount: 50,
      isDepositPaid: false,
      startTime: new Date('2099-06-10T10:00:00Z'),
      endTime: new Date('2099-06-10T12:00:00Z'),
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

  describe('确认时同步报价和定金', () => {
    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1, status: 'pending_confirm', serviceType: '到店美甲', clientUserId: 11,
        technicianId: 7, quotePrice: 598, finalPriceFen: 59800, depositAmount: 100, isDepositPaid: false,
        startTime: new Date('2099-09-10T10:00:00Z'), endTime: new Date('2099-09-10T12:00:00Z'),
      } as never);
    });
    it('已确认总价和实收定金同步到预约、交易和线下收款记录', async () => {
      await service.confirm(1, 598, 100, true);
      expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
        quotePrice: 598, finalPriceFen: 59800, depositAmount: 100, isDepositPaid: true,
        tradeStatus: 'deposit_paid', paidAmount: 100, paymentStatus: 'partial',
      }) }));
      expect(prisma.bookingTradeOrder.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({
        totalAmount: 598, depositAmount: 100, balanceAmount: 498, paidAmount: 100, currentPayStage: 'balance',
      }) }));
      expect(prisma.paymentOrder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
        channel: 'offline', amountCents: 10000, status: 'paid', paymentType: 'deposit',
      }) }));
    });
    it('未收定金使用已确认金额提示客户支付', async () => {
      await service.confirm(1, 598, 100, false);
      expect(prisma.order.update.mock.calls[0][0].data.tradeStatus).toBe('deposit_pending');
      expect(prisma.message.create.mock.calls[0][0].data.content).toContain('100.00');
      expect(prisma.paymentOrder.create).not.toHaveBeenCalled();
    });
    it.each([[0, 0], [-1, 0], [598.001, 0], [598, -1], [598, 599], [598, 0.001]])('拒绝无效总价 %s 或定金 %s', async (price, deposit) => {
      await expect(service.confirm(1, price, deposit, false)).rejects.toThrow(BadRequestException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });
    it('无定金时不会记录虚假收款', async () => {
      const order = await service.findOne(1);
      jest.spyOn(service, 'findOne').mockResolvedValue({ ...order, depositAmount: 0 } as never);
      await service.confirm(1, 598, 0, true);
      expect(prisma.order.update.mock.calls[0][0].data.isDepositPaid).toBe(false);
      expect(prisma.paymentOrder.create).not.toHaveBeenCalled();
    });
    it('已有支付凭据的定金不能取消或降低', async () => {
      prisma.paymentOrder.aggregate.mockResolvedValue({ _sum: { amountCents: 10000 } });
      await expect(service.confirm(1, 598, 100, false)).rejects.toThrow('已有定金收款记录');
      const order = await service.findOne(1);
      jest.spyOn(service, 'findOne').mockResolvedValue({ ...order, depositAmount: 50 } as never);
      await expect(service.confirm(1, 598, 50, true)).rejects.toThrow('已有定金收款记录');
    });
    it('已有定金凭据不重复记录收款', async () => {
      prisma.paymentOrder.aggregate.mockResolvedValue({ _sum: { amountCents: 10000 } });
      await service.confirm(1, 598, 100, true);
      expect(prisma.paymentOrder.create).not.toHaveBeenCalled();
      expect(prisma.order.update.mock.calls[0][0].data.paidAmount).toBe(100);
    });
    it('重复确认不重复写入或发送通知', async () => {
      prisma.order.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.confirm(1, 598, 100, true)).rejects.toThrow('预约状态已变化');
      expect(prisma.paymentOrder.create).not.toHaveBeenCalled();
      expect(prisma.message.create).not.toHaveBeenCalled();
    });
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

  it.each([[undefined, 80], [0, 0], [30, 30]])(
    'manual complete retains existing cost unless explicitly supplied (%s)', async (materialCost, expectedCost) => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1, status: 'in_progress', technicianId: 7, customerId: 3,
        startTime: new Date('2026-08-27T00:00:00Z'), quotePrice: 300,
        paidAmount: 50, paymentStatus: 'partial', materialCost: 80,
      } as never);
      await service.complete(1, { actualAmount: 280, materialCost });
      expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ paidAmount: 280, materialCost: expectedCost }),
      }));
      expect(prisma.serviceRecord.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ materialCost: expectedCost }),
      }));
    },
  );

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
      quotePrice: 200,
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
      quotePrice: 200,
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
