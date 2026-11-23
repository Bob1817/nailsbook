export const DEFAULT_FREE_PLAN_CODE = 'free';

export const DEFAULT_FREE_PLAN_DATA = {
  code: 'free',
  name: '免费版',
  price: 0,
  billingCycle: 'free',
  maxCustomers: 3,
  maxMonthlyBookings: 5,
  maxWorks: 6,
  maxStorageBytes: 50 * 1024 * 1024,
  maxMarketingExports: 3,
  maxMonthlySms: 5,
  maxEmployees: 1,
  maxBookingPages: 1,
  targetStage: '新手体验、个人起步',
  description: '零门槛建立专属高定档案与预约避坑闭环',
  features: JSON.stringify([
    'customer_management',
    'booking',
    'works',
    'basic_insights',
  ]),
  status: 'active',
};

/**
 * 确保美甲师账号初始化时默认绑定生效中的免费版订阅。
 * 支持传入 PrismaClient 或 TransactionClient，幂等执行。
 */
export async function ensureDefaultFreeSubscription(
  prismaOrTx: any,
  technicianId: number,
  startedAt?: Date,
) {
  if (!prismaOrTx?.technicianSubscription) {
    return null;
  }

  const existing = await prismaOrTx.technicianSubscription.findUnique?.({
    where: { technicianId },
    include: { plan: true },
  });

  if (existing) {
    return existing;
  }

  let freePlan = await prismaOrTx.subscriptionPlan?.findUnique?.({
    where: { code: DEFAULT_FREE_PLAN_CODE },
  });

  if (!freePlan && prismaOrTx.subscriptionPlan?.create) {
    freePlan = await prismaOrTx.subscriptionPlan.create({
      data: DEFAULT_FREE_PLAN_DATA,
    });
  }

  if (!freePlan && prismaOrTx.subscriptionPlan?.findFirst) {
    freePlan = await prismaOrTx.subscriptionPlan.findFirst();
  }

  if (!freePlan) {
    return null;
  }

  return prismaOrTx.technicianSubscription.create?.({
    data: {
      technicianId,
      planId: freePlan.id,
      status: 'active',
      startedAt: startedAt ?? new Date(),
      expiredAt: null,
    },
    include: { plan: true },
  });
}
