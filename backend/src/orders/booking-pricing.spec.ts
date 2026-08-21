import {
  buildServiceSnapshotLines,
  finalPriceFen,
  summarizeSnapshotLines,
} from './booking-pricing';

describe('standardized booking pricing', () => {
  const services = [
    {
      id: 1,
      publicId: 'svc_remove',
      name: '卸甲',
      priceMinFen: 3000,
      durationMinutes: 20,
    },
    {
      id: 2,
      publicId: 'svc_draw',
      name: '手绘',
      priceMinFen: 12000,
      durationMinutes: 60,
    },
  ];

  it('creates immutable price and duration snapshots', () => {
    const lines = buildServiceSnapshotLines(services, [
      { servicePublicId: 'svc_remove' },
      { servicePublicId: 'svc_draw', quantity: 2 },
    ]);
    expect(summarizeSnapshotLines(lines)).toEqual({
      serviceSubtotalFen: 27000,
      totalDurationMinutes: 140,
    });
    expect(lines[1]).toMatchObject({
      nameSnapshot: '手绘',
      unitPriceFen: 12000,
      quantity: 2,
      subtotalFen: 24000,
    });
  });

  it('applies a bounded discount', () => {
    expect(finalPriceFen(30000, 1200)).toBe(28800);
    expect(() => finalPriceFen(30000, 30001)).toThrow(
      '优惠金额不能超过服务合计',
    );
  });
});
