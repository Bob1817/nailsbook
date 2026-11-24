import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
    subscriptionPlan: { findFirst: jest.fn(), findUnique: jest.fn() },
    technicianSubscription: { findUnique: jest.fn(), upsert: jest.fn() },
    subscriptionChange: { create: jest.fn() },
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

  it('创建订阅支付单并计算分', async () => {
    config.get.mockReturnValue('mock');
    prisma.subscriptionPlan.findFirst.mockResolvedValue({
      id: 2,
      code: 'starter',
      name: '起步版',
      price: 39,
      billingCycle: 'monthly',
      status: 'active',
    });
    prisma.technicianSubscription.findUnique.mockResolvedValue({ id: 10 });
    prisma.paymentOrder.create.mockImplementation(({ data }: any) => ({
      id: 101,
      paymentNo: 'SUB101',
      createdAt: new Date(),
      paidAt: null,
      ...data,
    }));

    const result = await service.createSubscriptionPayment(
      5,
      'starter',
      'idemp-sub-1',
    );

    expect(prisma.paymentOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subscriptionId: 10,
        technicianId: 5,
        paymentType: 'subscription',
        amountCents: 3900,
        status: 'pending',
      }),
    });
    expect(result.amount).toBe(39);
  });

  it('订阅支付成功后更新美甲师订阅并延长30天', async () => {
    const tx: any = {
      paymentOrder: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 101,
          paymentNo: 'SUB101',
          paymentType: 'subscription',
          subscriptionId: 2,
          technicianId: 5,
          amountCents: 3900,
          channel: 'wechat',
          status: 'paid',
          paidAt: new Date(),
        }),
      },
      subscriptionPlan: {
        findFirst: jest.fn().mockResolvedValue({
          id: 2,
          code: 'starter',
          name: '起步版',
          price: 39,
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 2,
          code: 'starter',
          name: '起步版',
          price: 39,
        }),
      },
      technicianSubscription: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 1, status: 'active' }),
      },
      subscriptionChange: {
        create: jest.fn().mockResolvedValue({ id: 1 }),
      },
    };
    prisma.paymentOrder.findUnique.mockResolvedValue({
      id: 101,
      paymentNo: 'SUB101',
      subscriptionId: 10,
      technicianId: 5,
      paymentType: 'subscription',
      amountCents: 3900,
      status: 'pending',
      providerPayload: JSON.stringify({ targetPlanCode: 'starter', targetPlanId: 2 }),
    });
    prisma.$transaction.mockImplementation((callback: any) => callback(tx));

    const res = await service.confirmPaid('SUB101', 'WX_SUB_101');
    expect(tx.technicianSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { technicianId: 5 },
        create: expect.objectContaining({
          technicianId: 5,
          planId: 2,
          status: 'active',
        }),
      }),
    );
    expect(tx.subscriptionChange.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          technicianId: 5,
          toPlanCode: 'starter',
          reason: 'wechat_pay',
        }),
      }),
    );
  });

  it('createSubscriptionPayment 校验套餐代码有效性并禁止为免费套餐发起在线支付', async () => {
    await expect(service.createSubscriptionPayment(5, '')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    prisma.subscriptionPlan.findFirst.mockResolvedValueOnce({
      id: 1,
      code: 'free',
      name: '免费版',
      price: 0,
    });
    await expect(service.createSubscriptionPayment(5, 'free')).rejects.toThrow(
      '免费套餐无需在线支付',
    );
  });

  it('生产环境或微信支付未配置时禁止订阅支付静默降级为 mock', async () => {
    prisma.subscriptionPlan.findFirst.mockResolvedValue({
      id: 2,
      code: 'starter',
      name: '入门版',
      price: 29,
      billingCycle: 'monthly',
      status: 'active',
    });
    config.get.mockImplementation((key: string) =>
      key === 'NODE_ENV' ? 'production' : undefined,
    );
    await expect(
      service.createSubscriptionPayment(5, 'starter', 'prod-no-wx'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.paymentOrder.create).not.toHaveBeenCalled();

    config.get.mockImplementation((key: string) =>
      key === 'NODE_ENV' ? 'production' : key === 'PAYMENT_PROVIDER' ? 'mock' : undefined,
    );
    await expect(
      service.createSubscriptionPayment(5, 'starter', 'prod-mock'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('生产环境或非 mock 模式禁止调用 confirmMockSubscriptionPayment', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'NODE_ENV' ? 'production' : 'mock',
    );
    await expect(
      service.confirmMockSubscriptionPayment(5, 'SUB101'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    config.get.mockImplementation((key: string) =>
      key === 'NODE_ENV' ? 'development' : undefined,
    );
    await expect(
      service.confirmMockSubscriptionPayment(5, 'SUB101'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('getSubscriptionPaymentStatus 主动向微信支付查单并在金额匹配时确认生效', async () => {
    const platformConfig = {
      isPaymentAvailable: jest.fn().mockResolvedValue(true),
      getPaymentCredentials: jest.fn().mockResolvedValue({ appId: 'wx-app' }),
    };
    const wechatPay = {
      queryTransactionByOutTradeNo: jest.fn().mockResolvedValue({
        trade_state: 'SUCCESS',
        transaction_id: 'WX_TX_999',
        out_trade_no: 'SUB999',
        amount: { total: 2900 },
      }),
    };
    service = new PaymentsService(
      prisma,
      config as any,
      undefined,
      platformConfig as any,
      wechatPay as any,
    );
    prisma.paymentOrder.findUnique.mockResolvedValue({
      id: 999,
      paymentNo: 'SUB999',
      technicianId: 5,
      paymentType: 'subscription',
      amountCents: 2900,
      status: 'pending',
      providerPayload: JSON.stringify({ targetPlanCode: 'starter', targetPlanId: 2 }),
    });
    const confirmSpy = jest.spyOn(service, 'confirmPaid').mockResolvedValue({
      id: 999,
      paymentNo: 'SUB999',
      status: 'paid',
    } as any);

    const res = await service.getSubscriptionPaymentStatus(5, 'SUB999');
    expect(wechatPay.queryTransactionByOutTradeNo).toHaveBeenCalledWith('SUB999');
    expect(confirmSpy).toHaveBeenCalledWith('SUB999', 'WX_TX_999');
    expect(res.paid).toBe(true);
  });
});
