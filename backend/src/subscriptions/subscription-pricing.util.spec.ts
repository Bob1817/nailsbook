import {
  calculateSubscriptionExpiry,
  calculateUpgradeProration,
  isPlanCurrentlyEffective,
  resolvePlanPricing,
} from './subscription-pricing.util';

describe('subscription-pricing.util', () => {
  const now = new Date('2026-11-25T12:00:00.000Z');

  it('校验套餐生效时间窗口（未到时间/生效中/已过期）', () => {
    expect(
      isPlanCurrentlyEffective(
        { status: 'active', effectiveStartAt: '2026-11-26T00:00:00.000Z' },
        now,
      ),
    ).toBe(false);
    expect(
      isPlanCurrentlyEffective(
        {
          status: 'active',
          effectiveStartAt: '2026-11-20T00:00:00.000Z',
          effectiveEndAt: '2026-11-30T00:00:00.000Z',
        },
        now,
      ),
    ).toBe(true);
    expect(
      isPlanCurrentlyEffective(
        { status: 'active', effectiveEndAt: '2026-11-24T23:59:59.000Z' },
        now,
      ),
    ).toBe(false);
    expect(isPlanCurrentlyEffective({ status: 'inactive' }, now)).toBe(false);
  });

  it('校验原价与折扣价及折扣时间窗口', () => {
    const activeDiscount = resolvePlanPricing(
      {
        price: 199,
        discountPrice: 99,
        discountStartAt: '2026-11-20T00:00:00.000Z',
        discountEndAt: '2026-11-30T00:00:00.000Z',
      },
      now,
    );
    expect(activeDiscount.discountActive).toBe(true);
    expect(activeDiscount.originalPrice).toBe(199);
    expect(activeDiscount.effectivePrice).toBe(99);

    const expiredDiscount = resolvePlanPricing(
      {
        price: 199,
        discountPrice: 99,
        discountStartAt: '2026-11-01T00:00:00.000Z',
        discountEndAt: '2026-11-24T00:00:00.000Z',
      },
      now,
    );
    expect(expiredDiscount.discountActive).toBe(false);
    expect(expiredDiscount.effectivePrice).toBe(199);
  });

  it('校验按月、按季度、按年与永久四种周期到期计算', () => {
    const base = new Date('2026-11-01T00:00:00.000Z');
    expect(
      calculateSubscriptionExpiry('monthly', base)!.getTime() - base.getTime(),
    ).toBe(30 * 24 * 60 * 60 * 1000);
    expect(
      calculateSubscriptionExpiry('quarterly', base)!.getTime() - base.getTime(),
    ).toBe(90 * 24 * 60 * 60 * 1000);
    expect(
      calculateSubscriptionExpiry('yearly', base)!.getTime() - base.getTime(),
    ).toBe(365 * 24 * 60 * 60 * 1000);
    expect(calculateSubscriptionExpiry('permanent', base)).toBeNull();
  });

  it('按当前套餐剩余未履约时长自动折算升级抵扣金额', () => {
    const startedAt = new Date('2026-11-10T12:00:00.000Z');
    const expiredAt = new Date('2026-12-10T12:00:00.000Z'); // 30天周期，now为11-25刚好剩15天（50%）
    const currentSub = {
      planId: 2,
      status: 'active',
      startedAt,
      expiredAt,
      lastPaidAmountCents: 6000, // 实付 ¥60.00
      plan: { id: 2, code: 'starter', price: 60 },
    };
    const targetPlan = { id: 3, code: 'advanced', price: 100, status: 'active' };

    const proration = calculateUpgradeProration(currentSub, targetPlan, now);
    expect(proration.isUpgrade).toBe(true);
    expect(proration.remainingDays).toBe(15);
    expect(proration.deductionCents).toBe(3000); // 折抵 ¥30.00
    expect(proration.payableCents).toBe(7000); // 实付 ¥70.00

    // 同套餐续费不触发升级抵扣
    const renewal = calculateUpgradeProration(currentSub, currentSub.plan, now);
    expect(renewal.isRenewal).toBe(true);
    expect(renewal.deductionCents).toBe(0);
    expect(renewal.payableCents).toBe(6000);
  });
});
