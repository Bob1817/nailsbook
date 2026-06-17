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
      $transaction: jest.fn(async (cb: (tx: any) => Promise<unknown>) => cb(prisma)),
      order: { update: jest.fn().mockResolvedValue({ id: 1 }) },
      conversation: {
        upsert: jest.fn().mockResolvedValue({ id: 5 }),
        findUnique: jest.fn().mockResolvedValue({ id: 5 }),
      },
      message: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      revenue: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 9, amount: 200 }),
      },
    };
    service = new OrdersService(prisma, chatGateway as never);
  });

  it('confirm 上门：pending_confirm → pending_home，并给客户发系统消息+推送', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1, status: 'pending_confirm', serviceType: '上门美甲',
      clientUserId: 11, technicianId: 7, depositAmount: 0, isDepositPaid: false,
    } as never);

    await service.confirm(1);

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending_home' }),
      }),
    );
    const msg = prisma.message.create.mock.calls[0][0].data;
    expect(msg.receiverType).toBe('client');
    expect(msg.relatedType).toBe('order');
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('confirm 到店：pending_confirm → pending_shop', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1, status: 'pending_confirm', serviceType: '到店美甲',
      clientUserId: 11, technicianId: 7, depositAmount: 0,
    } as never);

    await service.confirm(1);

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending_shop' }),
      }),
    );
  });

  it('confirm 带定金 + depositConfirmed=true：标记定金已付', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1, status: 'pending_confirm', serviceType: '上门美甲',
      clientUserId: 11, technicianId: 7, depositAmount: 50, isDepositPaid: false,
    } as never);

    await service.confirm(1, true);

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isDepositPaid: true, depositStatus: 'paid' }),
      }),
    );
  });

  it('complete：in_progress → completed，并生成收入记录', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1, status: 'in_progress', clientUserId: 11, technicianId: 7,
      customerId: 3, quotePrice: 200,
    } as never);

    const res = await service.complete(1);

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }),
    );
    expect(prisma.revenue.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 200, orderId: 1 }) }),
    );
    expect(res).toEqual({ id: 9, amount: 200 });
  });

  it('complete：已有收入记录 → BadRequest（防重复入账）', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 1, status: 'in_progress', technicianId: 7,
    } as never);
    prisma.revenue.findUnique.mockResolvedValue({ id: 9 });

    await expect(service.complete(1)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.order.update).not.toHaveBeenCalled();
  });
});
