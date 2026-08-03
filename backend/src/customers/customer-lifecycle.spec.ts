import { calculateCustomerLifecycle } from './customer-lifecycle';

describe('calculateCustomerLifecycle', () => {
  const now = new Date('2026-07-30T00:00:00.000Z');

  it.each([
    [[], 'new', '尚未完成首次服务'],
    [['2026-07-20'], 'new', '仍在首个复购周期内'],
    [['2026-06-01', '2026-07-01', '2026-07-20'], 'active', '尚未达到预计复购日期'],
    [['2026-05-20', '2026-06-20'], 'due', '建议主动跟进'],
    [['2026-04-01', '2026-05-01'], 'dormant', '超过预计复购日期'],
  ])('固定服务日期得到稳定分群：%s → %s', (rawDates, status, reason) => {
    const result = calculateCustomerLifecycle(
      rawDates.map((date) => new Date(`${date}T00:00:00.000Z`)),
      now,
    );
    expect(result.status).toBe(status);
    expect(result.reason).toContain(reason);
  });

  it('两次以上服务使用个人平均周期，否则使用 28 天默认周期', () => {
    expect(
      calculateCustomerLifecycle(
        [new Date('2026-07-10T00:00:00.000Z')],
        now,
      ).serviceCycleSource,
    ).toBe('default');
    expect(
      calculateCustomerLifecycle(
        [
          new Date('2026-06-01T00:00:00.000Z'),
          new Date('2026-06-22T00:00:00.000Z'),
        ],
        now,
      ),
    ).toEqual(
      expect.objectContaining({
        serviceCycleDays: 21,
        serviceCycleSource: 'personal',
      }),
    );
  });
});
