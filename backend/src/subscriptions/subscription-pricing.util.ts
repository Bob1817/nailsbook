export const PLAN_TEMPLATES = [
  {
    templateCode: 'starter',
    name: '起步版',
    description: '适合刚起步的独立美甲师，建立专属客户档案与线上预约闭环',
    targetStage: '个人起步、兼职接单',
    billingCycle: 'monthly',
    price: 39,
    maxCustomers: 30,
    maxMonthlyBookings: 60,
    maxWorks: 30,
    maxStorageBytes: 1 * 1024 * 1024 * 1024,
    maxMarketingExports: 20,
    maxMonthlySms: 30,
    maxEmployees: 1,
    maxBookingPages: 1,
    features: [
      'basic_profile',
      'customer_management',
      'booking',
      'works',
      'basic_insights',
      'basic_export',
      'referral_5_percent',
    ],
  },
  {
    templateCode: 'advanced',
    name: '高阶版',
    description: '适合稳定经营的个人主理人，全面提升复购率与客单价',
    targetStage: '稳定经营的个人主理人',
    billingCycle: 'monthly',
    price: 99,
    maxCustomers: 200,
    maxMonthlyBookings: 300,
    maxWorks: 300,
    maxStorageBytes: 5 * 1024 * 1024 * 1024,
    maxMarketingExports: 100,
    maxMonthlySms: 100,
    maxEmployees: 1,
    maxBookingPages: 3,
    features: [
      'basic_profile',
      'customer_management',
      'booking',
      'works',
      'monthly_insights',
      'branding',
      'basic_export',
      'repurchase_reminder',
      'customer_segmentation',
      'referral_5_percent',
    ],
  },
  {
    templateCode: 'ultimate',
    name: '终极版',
    description: '全功能无限额工作台，深度经营分析与智能复购全解锁',
    targetStage: '成熟个人工作室、高客单手艺人',
    billingCycle: 'yearly',
    price: 699,
    maxCustomers: null,
    maxMonthlyBookings: null,
    maxWorks: null,
    maxStorageBytes: 20 * 1024 * 1024 * 1024,
    maxMarketingExports: null,
    maxMonthlySms: 500,
    maxEmployees: 1,
    maxBookingPages: null,
    features: [
      'basic_profile',
      'customer_management',
      'booking',
      'works',
      'insights',
      'branding',
      'full_export',
      'smart_repurchase',
      'customer_segmentation',
      'automation',
      'referral_5_percent',
    ],
  },
];

export const BILLING_CYCLE_DAYS: Record<string, number | null> = {
  free: null,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
  permanent: null,
};

export function calculateSubscriptionExpiry(
  billingCycle: string,
  baseDate: Date,
): Date | null {
  const days = BILLING_CYCLE_DAYS[String(billingCycle || '').toLowerCase()];
  if (days == null) return null;
  return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isPlanCurrentlyEffective(
  plan: any,
  now = new Date(),
): boolean {
  if (!plan || plan.status !== 'active') return false;
  if (plan.effectiveStartAt) {
    const start = new Date(plan.effectiveStartAt);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }
  if (plan.effectiveEndAt) {
    const end = new Date(plan.effectiveEndAt);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}

export function resolvePlanPricing(plan: any, now = new Date()) {
  const originalPrice = Math.max(0, Number(plan?.price || 0));
  const rawDiscount =
    plan?.discountPrice != null ? Number(plan.discountPrice) : null;
  const hasValidDiscountPrice =
    rawDiscount != null &&
    Number.isFinite(rawDiscount) &&
    rawDiscount >= 0 &&
    rawDiscount < originalPrice;

  let withinDiscountWindow = true;
  if (plan?.discountStartAt) {
    const dStart = new Date(plan.discountStartAt);
    if (!Number.isNaN(dStart.getTime()) && now < dStart) {
      withinDiscountWindow = false;
    }
  }
  if (plan?.discountEndAt) {
    const dEnd = new Date(plan.discountEndAt);
    if (!Number.isNaN(dEnd.getTime()) && now > dEnd) {
      withinDiscountWindow = false;
    }
  }

  const discountActive = hasValidDiscountPrice && withinDiscountWindow;
  const effectivePrice = discountActive ? rawDiscount! : originalPrice;

  return {
    originalPrice,
    discountPrice: rawDiscount,
    discountActive,
    effectivePrice,
    originalPriceCents: Math.round(originalPrice * 100),
    effectivePriceCents: Math.round(effectivePrice * 100),
  };
}

export function calculateUpgradeProration(
  currentSub: any,
  targetPlan: any,
  now = new Date(),
  fallbackPaidCents?: number,
) {
  const targetPricing = resolvePlanPricing(targetPlan, now);
  const targetPriceCents = targetPricing.effectivePriceCents;

  const isSamePlan =
    currentSub?.planId === targetPlan.id ||
    currentSub?.plan?.code === targetPlan.code;
  const currentPrice = Number(currentSub?.plan?.price || 0);
  const currentActivePaid =
    currentSub &&
    currentSub.status === 'active' &&
    !isSamePlan &&
    currentPrice > 0 &&
    (!currentSub.expiredAt || new Date(currentSub.expiredAt) > now);

  if (!currentActivePaid || targetPriceCents <= 0) {
    return {
      isUpgrade: Boolean(currentSub && !isSamePlan && targetPriceCents > 0),
      isRenewal: isSamePlan,
      deductionCents: 0,
      deductionAmount: 0,
      payableCents: targetPriceCents,
      payableAmount: targetPriceCents / 100,
      remainingDays: 0,
      totalDays: 0,
    };
  }

  const basePaidCents =
    Number(currentSub.lastPaidAmountCents || 0) > 0
      ? Number(currentSub.lastPaidAmountCents)
      : typeof fallbackPaidCents === 'number' && fallbackPaidCents > 0
        ? fallbackPaidCents
        : resolvePlanPricing(
            currentSub.plan,
            currentSub.startedAt ? new Date(currentSub.startedAt) : now,
          ).effectivePriceCents;

  let deductionCents = 0;
  let remainingDays = 0;
  let totalDays = 0;

  if (!currentSub.expiredAt) {
    deductionCents = basePaidCents;
  } else {
    const startMs = new Date(currentSub.startedAt).getTime();
    const endMs = new Date(currentSub.expiredAt).getTime();
    const nowMs = now.getTime();
    const totalMs = Math.max(1, endMs - startMs);
    const remainingMs = Math.max(0, endMs - nowMs);
    const ratio = Math.min(1, remainingMs / totalMs);
    totalDays = Math.max(1, Math.ceil(totalMs / (24 * 60 * 60 * 1000)));
    remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
    deductionCents = Math.floor(basePaidCents * ratio);
  }

  const appliedDeductionCents = Math.min(deductionCents, targetPriceCents);
  const payableCents = Math.max(0, targetPriceCents - appliedDeductionCents);

  return {
    isUpgrade: true,
    isRenewal: false,
    deductionCents: appliedDeductionCents,
    deductionAmount: Math.round(appliedDeductionCents) / 100,
    payableCents,
    payableAmount: Math.round(payableCents) / 100,
    remainingDays,
    totalDays,
  };
}
