import { ForbiddenException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService current entitlement', () => {
  const prisma: any = {
    subscriptionPlan: { upsert: jest.fn() },
    technicianSubscription: { findUnique: jest.fn(), upsert: jest.fn() },
    customer: { count: jest.fn() },
    order: { count: jest.fn() },
  };
  let service: SubscriptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubscriptionsService(prisma);
    prisma.subscriptionPlan.upsert.mockResolvedValue({
      id: 1,
      code: 'free',
      name: '免费版',
      price: 0,
      billingCycle: 'free',
      maxCustomers: 100,
      maxMonthlyBookings: 100,
      features: '["booking","works","referral_5_percent"]',
    });
    prisma.customer.count.mockResolvedValue(8);
    prisma.order.count.mockResolvedValue(3);
  });

  it('无订阅时自动创建免费版并返回用量', async () => {
    prisma.technicianSubscription.findUnique.mockResolvedValue(null);
    prisma.technicianSubscription.upsert.mockResolvedValue({
      id: 11,
      status: 'active',
      startedAt: new Date(),
      expiredAt: null,
      plan: await prisma.subscriptionPlan.upsert(),
    });

    const result = await service.getCurrentForTechnician(7);

    expect(result.plan.code).toBe('free');
    expect(result.plan.features).toContain('referral_5_percent');
    expect(result.usage).toEqual({ customerCount: 8, monthlyBookings: 3 });
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
      plan: await prisma.subscriptionPlan.upsert(),
    });

    const result = await service.getCurrentForTechnician(7);

    expect(result.plan.code).toBe('free');
    expect(prisma.technicianSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ planId: 1 }) }),
    );
  });

  it('服务端拒绝套餐未包含的功能', async () => {
    jest.spyOn(service, 'getCurrentForTechnician').mockResolvedValue({
      plan: { features: ['booking'] },
    } as any);
    await expect(service.assertFeature(7, 'insights')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('服务端拒绝超过月预约额度继续创建订单', async () => {
    jest.spyOn(service, 'getCurrentForTechnician').mockResolvedValue({
      limits: { monthlyBookingsReached: true },
    } as any);
    await expect(service.assertCanCreateBooking(7)).rejects.toThrow('预约额度已用完');
  });
});
