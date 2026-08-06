const FEATURE_LABELS = {
  customer_management: '客户管理',
  booking: '预约管理',
  works: '作品管理',
  referral_5_percent: '客户邀请与5%美甲基金',
  insights: '经营分析',
  branding: '高级主页展示'
};

const ENTITLEMENT_META = {
  customers: { label: '活跃客户' },
  monthlyBookings: { label: '本月预约' },
  works: { label: '作品' },
  storage: { label: '存储空间', format: formatBytes },
  marketingExports: { label: '本月宣传导出' },
  monthlySms: { label: '本月短信' },
  employees: { label: '员工账号' },
  bookingPages: { label: '预约页面' }
};

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(bytes % (1024 * 1024 * 1024) ? 1 : 0)}GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) ? 1 : 0)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${bytes}B`;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildUsageItem(label, used, limit, formatter) {
  const safeUsed = Number.isFinite(Number(used)) ? Number(used) : 0;
  const hasLimit = limit !== null && limit !== undefined;
  const safeLimit = hasLimit && Number(limit) >= 0 ? Number(limit) : null;
  const percent = safeLimit === null
    ? 0
    : safeLimit === 0
      ? (safeUsed > 0 ? 100 : 0)
      : clampPercent((safeUsed / safeLimit) * 100);
  let level = 'normal';
  let hint = '';

  if (safeLimit !== null && percent >= 100) {
    level = 'limit';
    hint = '已达到上限，升级后可继续新增';
  } else if (safeLimit !== null && percent >= 90) {
    level = 'warning';
    hint = '即将用完，请提前规划';
  } else if (safeLimit !== null && percent >= 70) {
    level = 'notice';
    hint = '用量已超过 70%';
  }

  return {
    label,
    used: safeUsed,
    limit: safeLimit,
    usedText: formatter ? formatter(safeUsed) : String(safeUsed),
    limitText: safeLimit === null ? '不限' : formatter ? formatter(safeLimit) : String(safeLimit),
    percent,
    level,
    hint
  };
}

function normalizeCurrentSubscription(subscription) {
  if (!subscription) return null;
  const plan = subscription.plan || {};
  const usage = subscription.usage || {};
  const features = Array.isArray(plan.features) ? plan.features : [];
  const entitlementEntries = subscription.entitlements
    ? Object.entries(subscription.entitlements)
    : [];
  const usageItems = entitlementEntries.length
    ? entitlementEntries
      .filter(([key]) => ENTITLEMENT_META[key])
      .map(([key, value]) => {
        const meta = ENTITLEMENT_META[key];
        return buildUsageItem(meta.label, value.used, value.limit, meta.format);
      })
    : [
      buildUsageItem('活跃客户', usage.customerCount, plan.maxCustomers),
      buildUsageItem('本月预约', usage.monthlyBookings, plan.maxMonthlyBookings)
    ];

  return {
    ...subscription,
    displayName: plan.name || '免费版',
    featureText: features.length
      ? features.map((code) => FEATURE_LABELS[code] || code).join('、')
      : '基础经营功能',
    usageItems
  };
}

function normalizePlans(plans) {
  const list = plans && (plans.list || plans.data || plans);
  if (!Array.isArray(list)) return [];
  return list.map((plan) => ({
    ...plan,
    cycle: plan.billingCycle === 'free' ? '长期' : plan.billingCycle === 'yearly' ? '年' : '月',
    quotaText: [
      plan.maxCustomers == null ? '客户不限' : `${plan.maxCustomers} 名活跃客户`,
      plan.maxMonthlyBookings == null ? '预约不限' : `${plan.maxMonthlyBookings} 次预约/月`,
      plan.maxWorks == null ? '作品不限' : `${plan.maxWorks} 个作品`
    ].join(' · ')
  }));
}

module.exports = {
  buildUsageItem,
  normalizeCurrentSubscription,
  normalizePlans
};
