import { ForbiddenException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService current entitlement', () => {
  const prisma: any = {
    subscriptionPlan: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    technician: { findUnique: jest.fn() },
    technicianSubscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    customer: { count: jest.fn(), findFirst: jest.fn() },
    order: { count: jest.fn() },
    nailWork: { count: jest.fn() },
    subscriptionResourceUsage: { findUnique: jest.fn(), upsert: jest.fn() },
    subscriptionChange: {
      create: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    subscriptionUsageEvent: { findUnique: jest.fn(), create: jest.fn() },
    subscriptionMetricEvent: { create: jest.fn(), groupBy: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: SubscriptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubscriptionsService(prisma);
    const freePlan = {
      id: 1,
      code: 'free',
      name: '免费版',
      price: 0,
      billingCycle: 'free',
      maxCustomers: 30,
      maxMonthlyBookings: 30,
      maxWorks: 50,
      maxStorageBytes: 500 * 1024 * 1024,
      maxMarketingExports: 5,
      maxMonthlySms: 10,
      maxEmployees: 1,
      maxBookingPages: 1,
      features: '["booking","works","referral_5_percent"]',
    };
    prisma.subscriptionPlan.upsert.mockResolvedValue(freePlan);
    prisma.subscriptionPlan.findUniqueOrThrow.mockResolvedValue(freePlan);
    prisma.customer.count.mockResolvedValue(8);
    prisma.order.count.mockResolvedValue(3);
    prisma.nailWork.count.mockResolvedValue(4);
    prisma.subscriptionResourceUsage.findUnique.mockResolvedValue(null);
    prisma.subscriptionChange.create.mockResolvedValue({});
    prisma.subscriptionUsageEvent.findUnique.mockResolvedValue(null);
    prisma.subscriptionMetricEvent.create.mockResolvedValue({});
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(prisma),
    );
  });

  it('无订阅时自动创建免费版并返回用量', async () => {
    prisma.technicianSubscription.findUnique.mockResolvedValue(null);
    prisma.technicianSubscription.upsert.mockResolvedValue({
      id: 11,
      status: 'active',
      startedAt: new Date(),
      expiredAt: null,
      plan: await prisma.subscriptionPlan.findUniqueOrThrow(),
    });

    const result = await service.getCurrentForTechnician(7);

    expect(result.plan.code).toBe('free');
    expect(result.plan.features).toContain('referral_5_percent');
    expect(result.usage).toEqual({
      customerCount: 8,
      monthlyBookings: 3,
      worksCount: 4,
      storageBytes: 0,
      marketingExports: 0,
      monthlySms: 0,
    });
    expect(result.entitlements.customers).toEqual(
      expect.objectContaining({ used: 8, limit: 30, reached: false }),
    );
    expect(result.paymentReady).toBe(false);
  });

  it('已过期专业版自动降级免费版', async () => {
    prisma.technicianSubscription.findUnique.mockResolvedValue({
      id: 12,
      status: 'active',
      expiredAt: new Date(Date.now() - 1000),
      plan: { id: 2, code: 'pro', features: '["insights"]' },
    });
    prisma.technicianSubscription.upsert.mockResolvedValue({
      id: 12,
      status: 'active',
      startedAt: new Date(),
      expiredAt: null,
      plan: await prisma.subscriptionPlan.findUniqueOrThrow(),
    });

    const result = await service.getCurrentForTechnician(7);

    expect(result.plan.code).toBe('free');
    expect(prisma.technicianSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ planId: 1 }),
      }),
    );
    expect(prisma.subscriptionChange.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ reason: 'expired', toPlanCode: 'free' }),
    });
  });

  it('服务端拒绝套餐未包含的功能', async () => {
    jest.spyOn(service, 'getCurrentForTechnician').mockResolvedValue({
      plan: { features: ['booking'] },
    } as any);
    await expect(service.assertFeature(7, 'insights')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.subscriptionMetricEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        technicianId: 7,
        eventType: 'upgrade_trigger',
        source: 'feature_insights',
      }),
    });
  });

  it('服务端拒绝超过月预约额度继续创建订单', async () => {
    jest.spyOn(service, 'getCurrentForTechnician').mockResolvedValue({
      limits: { monthlyBookingsReached: true },
    } as any);
    await expect(service.assertCanCreateBooking(7)).rejects.toThrow(
      '预约额度已用完',
    );
  });

  it('服务端拒绝超过作品额度继续创建作品', async () => {
    jest.spyOn(service, 'getCurrentForTechnician').mockResolvedValue({
      entitlements: { works: { reached: true } },
    } as any);
    await expect(service.assertCanCreateWork(7)).rejects.toThrow(
      '作品额度已用完',
    );
  });

  it('已有活跃客户不重复占用客户额度', async () => {
    prisma.customer.findFirst.mockResolvedValue({ id: 9 });
    const currentSpy = jest.spyOn(service, 'getCurrentForTechnician');

    await expect(
      service.assertCanActivateCustomer(7, 3),
    ).resolves.toBeUndefined();
    expect(currentSpy).not.toHaveBeenCalled();
  });

  it('额度已满时拒绝激活新客户', async () => {
    prisma.customer.findFirst.mockResolvedValue(null);
    jest.spyOn(service, 'getCurrentForTechnician').mockResolvedValue({
      entitlements: { customers: { reached: true } },
    } as any);

    await expect(service.assertCanActivateCustomer(7, 3)).rejects.toThrow(
      '活跃客户额度已用完',
    );
  });

  it('上传会校验剩余空间并累计实际字节数', async () => {
    jest.spyOn(service, 'getCurrentForTechnician').mockResolvedValue({
      entitlements: { storage: { used: 80, limit: 100 } },
    } as any);

    await expect(service.assertCanUseStorage(7, 21)).rejects.toThrow(
      '存储空间不足',
    );
    await service.recordStorageUsage(7, 20);
    expect(prisma.subscriptionResourceUsage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { storageBytes: { increment: 20 } },
      }),
    );
  });

  it('宣传导出按幂等键仅扣减一次', async () => {
    jest.spyOn(service, 'getCurrentForTechnician').mockResolvedValue({
      entitlements: { marketingExports: { used: 2, limit: 5 } },
    } as any);

    await service.consumeMonthlyResource(7, 'marketingExports', 'poster-9', 1);
    expect(prisma.subscriptionUsageEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        resourceType: 'marketing_export',
        idempotencyKey: 'poster-9',
      }),
    });
    expect(prisma.subscriptionResourceUsage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { marketingExports: { increment: 1 } },
      }),
    );

    prisma.subscriptionUsageEvent.findUnique.mockResolvedValue({ id: 3 });
    prisma.subscriptionUsageEvent.create.mockClear();
    await service.consumeMonthlyResource(7, 'marketingExports', 'poster-9', 1);
    expect(prisma.subscriptionUsageEvent.create).not.toHaveBeenCalled();
  });

  it('付费套餐降级默认预约在周期结束时生效', async () => {
    const expiredAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    prisma.technician.findUnique.mockResolvedValue({ id: 7 });
    prisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: 1,
      code: 'free',
      billingCycle: 'free',
    });
    prisma.technicianSubscription.findUnique.mockResolvedValue({
      id: 12,
      technicianId: 7,
      expiredAt,
      plan: { id: 3, code: 'advanced' },
    });
    prisma.technicianSubscription.update.mockResolvedValue({ id: 12 });

    await service.updateTechnicianSubscription(7, { planId: 1 });

    expect(prisma.technicianSubscription.update).toHaveBeenCalledWith({
      where: { technicianId: 7 },
      data: { pendingPlanCode: 'free', changeEffectiveAt: expiredAt },
    });
    expect(prisma.subscriptionChange.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ reason: 'downgrade_scheduled' }),
    });
  });

  it('汇总升级触发和套餐变更指标', async () => {
    prisma.subscriptionMetricEvent.groupBy.mockResolvedValue([
      {
        eventType: 'upgrade_trigger',
        source: 'storage_quota_reached',
        planCode: 'free',
        _count: { id: 6 },
      },
    ]);
    prisma.subscriptionChange.groupBy.mockResolvedValue([
      { reason: 'downgrade_scheduled', _count: { id: 2 } },
    ]);

    const result = await service.getSubscriptionMetrics(
      '2026-08-01',
      '2026-08-31',
    );

    expect(result).toEqual({
      upgradeTriggers: [
        {
          eventType: 'upgrade_trigger',
          source: 'storage_quota_reached',
          planCode: 'free',
          count: 6,
        },
      ],
      subscriptionChanges: [{ reason: 'downgrade_scheduled', count: 2 }],
    });
    expect(prisma.subscriptionMetricEvent.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdAt: {
            gte: new Date('2026-08-01'),
            lte: new Date('2026-08-31T23:59:59.999'),
          },
        },
      }),
    );
  });
});
