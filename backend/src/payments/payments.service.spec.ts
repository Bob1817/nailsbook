import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const prisma: any = {
    paymentOrder: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    order: { findFirst: jest.fn() },
    wechatIdentity: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const config = { get: jest.fn() };
  let service: PaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentsService(prisma, config as any);
    prisma.paymentOrder.findUnique.mockResolvedValue(null);
    prisma.order.findFirst.mockResolvedValue({
      id: 10,
      technicianId: 3,
      status: 'pending_confirm',
      quotePrice: 200,
      fundDiscountAmount: 20,
      depositAmount: 50,
      tradeOrder: { id: 20, status: 'pending' },
    });
    prisma.paymentOrder.aggregate.mockResolvedValue({
      _sum: { amountCents: null },
    });
  });

  it('创建定金支付单并以分保存金额', async () => {
    config.get.mockReturnValue('mock');
    prisma.paymentOrder.create.mockImplementation(({ data }: any) => ({
      id: 1,
      createdAt: new Date(),
      paidAt: null,
      ...data,
    }));

    const result = await service.createOrderPayment(
      8,
      10,
      'deposit',
      'deposit-10-v1',
    );

    expect(prisma.paymentOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amountCents: 5000, status: 'pending' }),
    });
    expect(result.amount).toBe(50);
  });

  it('正式支付配置未生效时拒绝创建支付单', async () => {
    config.get.mockReturnValue(undefined);
    await expect(
      service.createOrderPayment(8, 10, 'deposit', 'deposit-10-v2'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.paymentOrder.create).not.toHaveBeenCalled();
  });

  it('相同幂等键返回原支付单，跨业务复用则拒绝', async () => {
    prisma.paymentOrder.findUnique.mockResolvedValue({
      id: 1,
      paymentNo: 'PAY1',
      clientUserId: 8,
      orderId: 10,
      amountCents: 5000,
      paymentType: 'deposit',
      channel: 'wechat',
      status: 'pending',
      providerPayload: null,
    });
    await expect(
      service.createOrderPayment(8, 10, 'deposit', 'same'),
    ).resolves.toMatchObject({ id: 1 });
    await expect(
      service.createOrderPayment(9, 10, 'deposit', 'same'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('服务未开始时拒绝创建尾款支付单', async () => {
    await expect(
      service.createOrderPayment(8, 10, 'final', 'final-10'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('配置生效且用户有当前 AppID openid 时返回 JSAPI 调起参数', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'NODE_ENV' ? 'test' : undefined,
    );
    const platformConfig = {
      isPaymentAvailable: jest.fn().mockResolvedValue(true),
      getPaymentCredentials: jest.fn().mockResolvedValue({ appId: 'wx-app' }),
    };
    const wechatPay = {
      createJsapiPayment: jest.fn().mockResolvedValue({
        timeStamp: '1',
        nonceStr: 'nonce',
        package: 'prepay_id=1',
        signType: 'RSA',
        paySign: 'sign',
      }),
    };
    service = new PaymentsService(
      prisma,
      config as any,
      undefined,
      platformConfig as any,
      wechatPay as any,
    );
    prisma.wechatIdentity.findFirst.mockResolvedValue({ openId: 'openid-1' });
    prisma.paymentOrder.create.mockImplementation(({ data }: any) => ({
      id: 1,
      createdAt: new Date(),
      paidAt: null,
      ...data,
    }));
    prisma.paymentOrder.update.mockImplementation(({ data }: any) => ({
      id: 1,
      createdAt: new Date(),
      paidAt: null,
      paymentNo: 'PAY1',
      orderId: 10,
      subscriptionId: null,
      paymentType: 'deposit',
      amountCents: 5000,
      channel: 'wechat',
      status: 'pending',
      ...data,
    }));

    const result = await service.createOrderPayment(8, 10, 'deposit', 'real-1');

    expect(wechatPay.createJsapiPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 5000, openId: 'openid-1' }),
    );
    expect(result.providerPayload.package).toBe('prepay_id=1');
  });

  it('定金到账后推进预约到预定履约状态', async () => {
    const paidAt = new Date('2026-08-15T10:00:00Z');
    const tx: any = {
      paymentOrder: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: 5000 } }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 1, paymentNo: 'PAY1', paymentType: 'deposit', amountCents: 5000,
          channel: 'wechat', status: 'paid', paidAt,
        }),
      },
      order: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 10, clientUserId: 8, technicianId: 3, status: 'pending_confirm',
          fulfillmentStatus: 'pending_shop', serviceType: '到店美甲',
          quotePrice: 200, fundDiscountAmount: 0,
        }),
        update: jest.fn().mockImplementation(({ data }: any) => ({ id: 10, status: data.status, ...data })),
      },
      conversation: { upsert: jest.fn().mockResolvedValue({ id: 6 }) },
      message: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      bookingTradeOrder: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    prisma.paymentOrder.findUnique.mockResolvedValue({
      id: 1, paymentNo: 'PAY1', orderId: 10, clientUserId: 8,
      paymentType: 'deposit', amountCents: 5000, status: 'pending',
    });
    prisma.$transaction.mockImplementation((callback: any) => callback(tx));

    await service.confirmPaid('PAY1', 'WX1');

    expect(tx.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'pending_shop', bookingPhase: 'booking', tradeStatus: 'deposit_paid',
      }),
    }));
  });

  it('尾款到账后完成进行中的预约与交易订单', async () => {
    const tx: any = {
      paymentOrder: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: 20000 } }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 2, paymentNo: 'PAY2', paymentType: 'final', amountCents: 15000,
          channel: 'wechat', status: 'paid', paidAt: new Date(),
        }),
      },
      order: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 10, clientUserId: 8, technicianId: 3, status: 'in_progress',
          quotePrice: 200, fundDiscountAmount: 0,
        }),
        update: jest.fn().mockImplementation(({ data }: any) => ({ id: 10, status: data.status, ...data })),
      },
      conversation: { upsert: jest.fn().mockResolvedValue({ id: 6 }) },
      message: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      bookingTradeOrder: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      revenue: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    prisma.paymentOrder.findUnique.mockResolvedValue({
      id: 2, paymentNo: 'PAY2', orderId: 10, clientUserId: 8,
      paymentType: 'final', amountCents: 15000, status: 'pending',
    });
    prisma.$transaction.mockImplementation((callback: any) => callback(tx));

    await service.confirmPaid('PAY2', 'WX2');

    expect(tx.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'completed', bookingPhase: 'finished', tradeStatus: 'paid', paymentStatus: 'paid',
      }),
    }));
  });
});
