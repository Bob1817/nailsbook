import { TechnicianInsightsService } from './technician-insights.service';

describe('TechnicianInsightsService', () => {
  const prisma = {
    order: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
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
    workPromotion: {
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
    conversionEvent: {
      findMany: jest.fn(),
    },
    nailWorkShareEvent: {
      findMany: jest.fn(),
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
    prisma.conversionEvent.findMany.mockResolvedValue([]);
    prisma.nailWorkShareEvent.findMany.mockResolvedValue([]);
    prisma.workPromotion.count.mockResolvedValue(0);
    prisma.order.aggregate.mockResolvedValue({ _sum: { discountAmountFen: null } });
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
    prisma.order.findMany
      .mockResolvedValueOnce([
        {
          status: 'completed',
          actualAmount: null,
          quotePrice: 1200,
          fundDiscountAmount: 0,
          depositAmount: 100,
          paidAmount: 100,
        },
        {
          status: 'pending_shop',
          actualAmount: null,
          quotePrice: 500,
          fundDiscountAmount: 0,
          depositAmount: 50,
          paidAmount: 50,
        },
      ])
      .mockResolvedValueOnce([
        {
          customerId: 11,
          completedAt: new Date('2026-07-01T00:00:00Z'),
          customer: { name: 'Alice' },
        },
      ]);
    prisma.serviceReview.aggregate.mockResolvedValue({
      _avg: { rating: 4.75 },
      _count: { id: 8 },
    });
    prisma.nailWork.count.mockResolvedValue(10);
    prisma.workPromotion.count.mockResolvedValue(2);
    prisma.order.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(4);
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
      monthConfirmed: 1250,
      averageTicket: 625,
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
    expect(result.conversion.homepage).toMatchObject({
      sufficientData: false,
      minimumViews: 20,
      views: 0,
      rates: null,
    });
    expect(result.conversion.works).toMatchObject({
      sufficientData: false,
      minimumViews: 30,
      views: 0,
      rates: null,
    });
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

  it('定金先计入确认收入，完成后按订单总额计入且不重复累计定金', async () => {
    prisma.order.count.mockResolvedValue(0);
    prisma.order.groupBy.mockResolvedValue([]);
    prisma.customer.count.mockResolvedValue(0);
    prisma.order.findMany
      .mockResolvedValueOnce([
        {
          status: 'pending_shop',
          actualAmount: null,
          quotePrice: 798,
          fundDiscountAmount: 0,
          depositAmount: 50,
          paidAmount: 50,
        },
        {
          status: 'completed',
          actualAmount: null,
          quotePrice: 998,
          fundDiscountAmount: 100,
          depositAmount: 50,
          paidAmount: 50,
        },
        {
          status: 'cancelled',
          actualAmount: null,
          quotePrice: 398,
          fundDiscountAmount: 0,
          depositAmount: 30,
          paidAmount: 30,
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.serviceReview.aggregate.mockResolvedValue({
      _avg: { rating: null },
      _count: { id: 0 },
    });
    prisma.nailWork.count.mockResolvedValue(0);

    const result = await service.getOverview(
      7,
      new Date('2026-07-29T04:00:00.000Z'),
    );

    expect(result.revenue).toEqual({
      monthConfirmed: 978,
      averageTicket: 326,
    });
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
    expect(result.conversion.homepage.rates).toBeNull();
    expect(result.conversion.works.rates).toBeNull();
  });
  describe('月份选择', () => {
    const now = new Date('2026-08-30T12:00:00Z');
    beforeEach(() => {
      (prisma as any).technician = { findUnique: jest.fn().mockResolvedValue({ createdAt: new Date('2025-12-31T16:00:00Z') }) };
      prisma.order.count.mockResolvedValue(0);
      prisma.order.groupBy.mockResolvedValue([]);
      prisma.customer.count.mockResolvedValue(0);
      prisma.serviceReview.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { id: 0 } });
      prisma.nailWork.count.mockResolvedValue(0);
    });
    it('注册时间以北京时间归属月份，并拒绝越界和非法月份', async () => {
      for (const month of ['2025-12', '2026-09', '2026-13', '2026-1', '']) {
        await expect(service.getOverview(7, now, month)).rejects.toThrow();
      }
      expect(prisma.order.count).not.toHaveBeenCalled();
    });
    it('历史月份所有流量统计使用同一自然月，不混入本月数据', async () => {
      const result = await service.getOverview(7, now, '2026-02');
      const gte = new Date('2026-01-31T16:00:00Z');
      const lt = new Date('2026-02-28T16:00:00Z');
      expect(result.period).toMatchObject({ selectedMonth: '2026-02', minMonth: '2026-01', maxMonth: '2026-08', monthStart: gte.toISOString(), endExclusive: lt.toISOString() });
      expect(prisma.order.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ completedAt: { gte, lt } }) }));
      expect(prisma.serviceReview.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { technicianId: 7, createdAt: { gte, lt } } }));
      expect(prisma.nailWork.count).toHaveBeenCalledWith({ where: { techId: 7, createdAt: { gte, lt } } });
      expect(prisma.customer.count).toHaveBeenCalledWith({ where: { technicianId: 7, createdAt: { lt } } });
      expect(prisma.revenue.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ recognizedAt: { gte, lte: new Date(lt.getTime() - 1) } }) }));
      expect(prisma.conversionEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { technicianId: 7, createdAt: { gte, lte: new Date(lt.getTime() - 1) } } }));
    });
    it('当前月截止到当前时刻，注册当月可选', async () => {
      const result = await service.getOverview(7, now, '2026-08');
      expect(result.period.endExclusive).toBe(new Date(now.getTime() + 1).toISOString());
      await expect(service.getOverview(7, now, '2026-01')).resolves.toBeDefined();
    });
  });

});
