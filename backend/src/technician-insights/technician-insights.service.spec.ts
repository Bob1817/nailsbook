import { TechnicianInsightsService } from './technician-insights.service';

describe('TechnicianInsightsService', () => {
  const prisma = {
    order: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    customer: {
      count: jest.fn(),
    },
    revenue: {
      aggregate: jest.fn(),
    },
    serviceReview: {
      aggregate: jest.fn(),
    },
    nailWork: {
      count: jest.fn(),
    },
  };

  let service: TechnicianInsightsService;

  beforeEach(() => {
    jest.clearAllMocks();
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
    });
    expect(result.bookings.byStatus.pending_quote).toBe(2);
    expect(result.rating).toEqual({ average: 4.75, count: 8 });
    expect(result.works.total).toBe(10);

    for (const call of prisma.order.count.mock.calls) {
      expect(call[0].where.technicianId).toBe(7);
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
  });
});
