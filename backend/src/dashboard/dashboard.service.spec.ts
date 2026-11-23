import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  const prisma: any = {
    technician: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    customer: {
      count: jest.fn(),
    },
    order: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    revenue: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    technicianSubscription: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    subscriptionPlan: {
      findMany: jest.fn(),
    },
    paymentOrder: {
      findMany: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: 0 }, _count: { id: 0 } }),
    },
    artistApplication: { count: jest.fn() },
    nailWork: { count: jest.fn() },
    accountDeletionRequest: { count: jest.fn() },
    nailWorkReport: { count: jest.fn() },
    feedback: { count: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(prisma);

    prisma.technician.count.mockResolvedValue(13);
    prisma.customer.count.mockResolvedValue(8);
    prisma.order.count.mockResolvedValue(59);
    prisma.revenue.aggregate.mockResolvedValue({ _sum: { amount: 13739 } });
    prisma.technicianSubscription.count.mockResolvedValue(13);
    prisma.order.findMany.mockResolvedValue([]);
    prisma.revenue.findMany.mockResolvedValue([]);
    prisma.artistApplication.count.mockResolvedValue(0);
    prisma.nailWork.count.mockResolvedValue(0);
    prisma.accountDeletionRequest.count.mockResolvedValue(0);
    prisma.nailWorkReport.count.mockResolvedValue(0);
    prisma.feedback.count.mockResolvedValue(0);
  });

  it('getOverview 返回动态全量生效套餐的有效订阅分布', async () => {
    prisma.subscriptionPlan.findMany.mockResolvedValue([
      { id: 4, name: '免费版', code: 'free', price: 0, billingCycle: 'free' },
      { id: 1, name: '入门版', code: 'starter', price: 29, billingCycle: 'monthly' },
      { id: 2, name: '高阶版', code: 'advanced', price: 79, billingCycle: 'monthly' },
      { id: 3, name: '终极版', code: 'ultimate', price: 199, billingCycle: 'monthly' },
    ]);

    prisma.technicianSubscription.groupBy.mockResolvedValue([
      { planId: 4, _count: { id: 12 } },
      { planId: 3, _count: { id: 1 } },
    ]);

    const result = await service.getOverview();

    expect(result.subscriptionStats.total).toBe(13);
    expect(result.subscriptionStats.active).toBe(13);
    expect(result.subscriptionStats.byPlan).toHaveLength(4);

    const freePlan = result.subscriptionStats.byPlan.find((p) => p.code === 'free' || p.planCode === 'free');
    expect(freePlan?.count).toBe(12);
    expect(freePlan?.percentage).toBe(92.3);

    const ultimatePlan = result.subscriptionStats.byPlan.find((p) => p.code === 'ultimate' || p.planCode === 'ultimate');
    expect(ultimatePlan?.count).toBe(1);
    expect(ultimatePlan?.percentage).toBe(7.7);

    const starterPlan = result.subscriptionStats.byPlan.find((p) => p.code === 'starter' || p.planCode === 'starter');
    expect(starterPlan?.count).toBe(0);
    expect(starterPlan?.percentage).toBe(0);
  });

  it('getBusinessStats 返回美甲师入驻趋势、订阅收入趋势及履约确认收入', async () => {
    prisma.technician.findMany.mockResolvedValue([
      { createdAt: new Date('2026-11-15T08:00:00Z') },
      { createdAt: new Date('2026-11-18T10:00:00Z') },
    ]);
    prisma.paymentOrder.findMany.mockResolvedValue([
      { amountCents: 19900, paidAt: new Date('2026-11-20T12:00:00Z') },
    ]);
    prisma.revenue.findMany.mockResolvedValue([
      { amount: 328, recognizedAt: new Date('2026-11-22T14:00:00Z') },
    ]);
    prisma.revenue.groupBy.mockResolvedValue([]);

    const result = await service.getBusinessStats();

    expect(result.dailyTechnicians).toBeDefined();
    expect(result.dailyTechnicians.length).toBeGreaterThanOrEqual(1);
    expect(result.dailySubscriptionRevenue).toBeDefined();
    expect(result.dailySubscriptionRevenue[0].totalAmount).toBe(199);
    expect(result.dailyRevenue).toBeDefined();
    expect(result.dailyRevenue[0].totalAmount).toBe(328);
  });
});
