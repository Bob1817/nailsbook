import { TechnicianInsightsService } from './technician-insights.service';

describe('TechnicianInsightsService', () => {
  const prisma = {
    order: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    customer: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    revenue: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    serviceReview: {
      aggregate: jest.fn(),
    },
    nailWork: {
      count: jest.fn(),
    },
    referralRelation: {
      count: jest.fn(),
    },
    referralQualification: {
      aggregate: jest.fn(),
    },
    rewardLedger: {
      aggregate: jest.fn(),
    },
  };

  let service: TechnicianInsightsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.order.findMany.mockResolvedValue([]);
    prisma.referralRelation.count.mockResolvedValue(0);
    prisma.referralQualification.aggregate.mockResolvedValue({
      _sum: { paidAmount: null },
    });
    prisma.rewardLedger.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.revenue.findMany.mockResolvedValue([]);
    prisma.customer.findMany.mockResolvedValue([]);
    service = new TechnicianInsightsService(prisma as never);
  });

  it('返回统一口径的收入、客单价和复购率', async () => {
    prisma.order.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(3);
    prisma.order.groupBy
      .mockResolvedValueOnce([
        { status: 'pending_quote', _count: { id: 2 } },
        { status: 'completed', _count: { id: 8 } },
      ])
      .mockResolvedValueOnce([
        { customerId: 11, _count: { id: 1 } },
        { customerId: 12, _count: { id: 2 } },
        { customerId: 13, _count: { id: 4 } },
      ]);
    prisma.customer.count.mockResolvedValueOnce(20).mockResolvedValueOnce(5);
    prisma.revenue.aggregate.mockResolvedValue({
      _sum: { amount: 1200 },
      _count: { id: 4 },
    });
    prisma.serviceReview.aggregate.mockResolvedValue({
      _avg: { rating: 4.75 },
      _count: { id: 8 },
    });
    prisma.nailWork.count.mockResolvedValue(10);
    prisma.order.findMany.mockResolvedValue([
      {
        customerId: 11,
        completedAt: new Date('2026-07-01T00:00:00Z'),
        customer: { name: 'Alice' },
      },
    ]);
    prisma.referralRelation.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2);
    prisma.referralQualification.aggregate.mockResolvedValue({
      _sum: { paidAmount: 500 },
    });
    prisma.rewardLedger.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 60 } })
      .mockResolvedValueOnce({ _sum: { amount: -20 } });
    prisma.revenue.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({
        amount: 100,
        recognizedAt: new Date(`2026-07-${24 + index}T04:00:00Z`),
        customerId: 11,
        customer: { name: 'Alice' },
        order: {
          customTitle: '手绘美甲',
          remark: null,
          serviceType: 'shop',
          startTime: new Date(`2026-07-${24 + index}T06:00:00Z`),
        },
      })),
    );
    prisma.customer.findMany.mockResolvedValue([
      { createdAt: new Date('2026-07-28T04:00:00Z') },
    ]);

    const result = await service.getOverview(
      7,
      new Date('2026-07-29T04:00:00.000Z'),
    );

    expect(result.revenue).toEqual({
      monthConfirmed: 1200,
      averageTicket: 300,
    });
    expect(result.customers).toEqual({
      total: 20,
      newThisMonth: 5,
      completed: 3,
      repeat: 2,
      repeatRate: 2 / 3,
      dueForRepurchase: 1,
    });
    expect(result.bookings.byStatus.pending_quote).toBe(2);
    expect(result.rating).toEqual({ average: 4.75, count: 8 });
    expect(result.works.total).toBe(10);
    expect(result.referrals).toEqual({
      total: 5,
      qualified: 2,
      conversionRate: 0.4,
      qualifiedRevenue: 500,
    });
    expect(result.funds).toEqual({ issued: 60, redeemed: 20 });
    expect(result.trends.sampleSize).toBe(5);
    expect(result.trends.daily.at(-1).newCustomers).toBe(1);
    expect(result.performance.sufficientData).toBe(true);
    expect(result.performance.services[0]).toMatchObject({
      name: '手绘美甲',
      orders: 5,
      revenue: 500,
    });
    expect(result.reminders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'due', customerId: 11 }),
      ]),
    );

    for (const call of prisma.order.count.mock.calls) {
      expect(call[0].where.technicianId).toBe(7);
    }
    for (const call of prisma.referralRelation.count.mock.calls) {
      expect(call[0].where.technicianId).toBe(7);
    }
    expect(prisma.referralQualification.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { relation: { technicianId: 7 } } }),
    );
    for (const call of prisma.rewardLedger.aggregate.mock.calls) {
      expect(call[0].where.account.technicianId).toBe(7);
    }
  });

  it('零数据时不伪造客单价、复购率或评分', async () => {
    prisma.order.count.mockResolvedValue(0);
    prisma.order.groupBy.mockResolvedValue([]);
    prisma.customer.count.mockResolvedValue(0);
    prisma.revenue.aggregate.mockResolvedValue({
      _sum: { amount: null },
      _count: { id: 0 },
    });
    prisma.serviceReview.aggregate.mockResolvedValue({
      _avg: { rating: null },
      _count: { id: 0 },
    });
    prisma.nailWork.count.mockResolvedValue(0);

    const result = await service.getOverview(
      9,
      new Date('2026-07-01T00:00:00.000Z'),
    );

    expect(result.revenue).toEqual({
      monthConfirmed: 0,
      averageTicket: null,
    });
    expect(result.customers.repeatRate).toBeNull();
    expect(result.rating).toEqual({ average: null, count: 0 });
    expect(result.referrals.conversionRate).toBeNull();
    expect(result.funds).toEqual({ issued: 0, redeemed: 0 });
    expect(result.trends).toEqual({ daily: [], weekly: [], sampleSize: 0 });
    expect(result.performance).toEqual({
      sufficientData: false,
      minimumSampleSize: 5,
      services: [],
      timeSlots: [],
    });
    expect(result.reminders).toEqual([]);
  });
});
