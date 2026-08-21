import { CustomersService } from './customers.service';

describe('CustomersService business summary', () => {
  function fixture(
    orders: Array<Record<string, unknown>>,
    revenues: Array<Record<string, unknown>>,
  ) {
    return {
      id: 12,
      technicianId: 7,
      name: '小雅',
      phone: '13800000000',
      address: null,
      technician: { id: 7, name: 'Luna', phone: '13900000000' },
      orders,
      revenues,
      workAccesses: [],
    };
  }

  it('基于已完成服务和确认收入返回可下钻的经营指标', async () => {
    const prisma = {
      customer: {
        findUnique: jest.fn().mockResolvedValue(
          fixture(
            [
              {
                id: 3,
                orderNo: 'O3',
                status: 'completed',
                startTime: new Date('2026-03-02T10:00:00.000Z'),
                completedAt: new Date('2026-03-02T12:00:00.000Z'),
                createdAt: new Date(),
                address: null,
              },
              {
                id: 2,
                orderNo: 'O2',
                status: 'cancelled',
                startTime: new Date('2026-02-15T10:00:00.000Z'),
                completedAt: null,
                createdAt: new Date(),
                address: null,
              },
              {
                id: 1,
                orderNo: 'O1',
                status: 'completed',
                startTime: new Date('2026-02-02T10:00:00.000Z'),
                completedAt: new Date('2026-02-02T12:00:00.000Z'),
                createdAt: new Date(),
                address: null,
              },
            ],
            [
              { id: 22, orderId: 3, amount: 380 },
              { id: 21, orderId: 1, amount: 220 },
            ],
          ),
        ),
      },
    };
    const service = new CustomersService(prisma as never);

    const result = await service.findOneForTechnician(12, 7);

    expect(result.businessSummary).toEqual(
      expect.objectContaining({
        firstServiceAt: new Date('2026-02-02T12:00:00.000Z'),
        lastServiceAt: new Date('2026-03-02T12:00:00.000Z'),
        completedServiceCount: 2,
        confirmedSpend: 600,
        averageTicket: 300,
        averageServiceCycleDays: 28,
        expectedNextServiceAt: new Date('2026-03-30T12:00:00.000Z'),
        serviceCycleSource: 'personal',
        completedOrderIds: [1, 3],
        revenueIds: [22, 21],
      }),
    );
  });

  it('仅一次完成服务时使用 28 天默认周期，无服务时不生成日期', async () => {
    const prisma = {
      customer: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(
            fixture(
              [
                {
                  id: 1,
                  orderNo: 'O1',
                  status: 'completed',
                  startTime: new Date('2026-02-02T10:00:00.000Z'),
                  completedAt: null,
                  createdAt: new Date(),
                  address: null,
                },
              ],
              [],
            ),
          )
          .mockResolvedValueOnce(fixture([], [])),
      },
    };
    const service = new CustomersService(prisma as never);

    const first = await service.findOneForTechnician(12, 7);
    expect(first.businessSummary).toEqual(
      expect.objectContaining({
        averageServiceCycleDays: null,
        serviceCycleDays: 28,
        serviceCycleSource: 'default',
        expectedNextServiceAt: new Date('2026-03-02T10:00:00.000Z'),
      }),
    );

    const empty = await service.findOneForTechnician(12, 7);
    expect(empty.businessSummary).toEqual(
      expect.objectContaining({
        completedServiceCount: 0,
        averageTicket: null,
        firstServiceAt: null,
        lastServiceAt: null,
        expectedNextServiceAt: null,
      }),
    );
  });
});
