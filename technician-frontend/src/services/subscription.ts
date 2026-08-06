import api from './api';
import type { TechnicianSubscription } from '../contexts/authTypes';

export type PlanCode = 'free' | 'starter' | 'advanced' | 'ultimate';

export interface PlanFeature {
  code: string;
  name: string;
  description: string;
}

export interface PlanDefinition {
  id?: number;
  code: PlanCode;
  name: string;
  price: number;
  billingCycle: string;
  maxCustomers: number | null;
  maxMonthlyBookings: number | null;
  maxWorks?: number | null;
  maxStorageBytes?: number | null;
  maxMarketingExports?: number | null;
  maxMonthlySms?: number | null;
  maxEmployees?: number | null;
  targetStage?: string | null;
  description?: string | null;
  features: PlanFeature[];
  highlights: string[];
}

export interface SubscriptionPlanApiItem {
  id: number;
  name: string;
  code: string;
  price: number;
  billingCycle: string;
  maxCustomers: number | null;
  maxMonthlyBookings: number | null;
  maxWorks: number | null;
  maxStorageBytes: number | null;
  maxMarketingExports: number | null;
  maxMonthlySms: number | null;
  maxEmployees: number | null;
  targetStage: string | null;
  description: string | null;
  features: string | string[] | null;
  status: string;
}

const PLAN_ORDER: PlanCode[] = ['free', 'starter', 'advanced', 'ultimate'];
const PLAN_NAMES: Record<PlanCode, string> = {
  free: '免费版',
  starter: '入门版',
  advanced: '高阶版',
  ultimate: '终极版',
};

const FEATURE_NAMES: Record<string, string> = {
  customer_management: '客户管理',
  booking: '预约管理',
  works: '作品管理',
  branding: '品牌定制',
  basic_insights: '基础经营数据',
  monthly_insights: '月度经营统计',
  insights: '高级经营分析',
  smart_repurchase: '智能复购提醒',
  customer_segmentation: '客户分层',
  team_management: '团队管理',
  team_branding: '团队品牌',
  team_insights: '团队报表',
  automation: '自动化运营',
};

function parseFeatures(value: SubscriptionPlanApiItem['features']): string[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function mapPlan(plan: SubscriptionPlanApiItem): PlanDefinition {
  const features = parseFeatures(plan.features).map((code) => ({
    code,
    name: FEATURE_NAMES[code] || code,
    description: '',
  }));
  const highlights = [
    plan.maxCustomers == null ? '活跃客户不限' : `${plan.maxCustomers} 名活跃客户`,
    plan.maxMonthlyBookings == null ? '每月预约不限' : `每月 ${plan.maxMonthlyBookings} 次预约`,
    plan.maxWorks == null ? '作品高额度' : `${plan.maxWorks} 个作品`,
    plan.maxEmployees && plan.maxEmployees > 1 ? `最多 ${plan.maxEmployees} 人协作` : '',
  ].filter(Boolean);
  return {
    ...plan,
    code: PLAN_ORDER.includes(plan.code as PlanCode)
      ? (plan.code as PlanCode)
      : 'free',
    features,
    highlights,
  };
}

export function getCurrentPlan(
  subscription?: TechnicianSubscription | null,
): PlanDefinition {
  const code =
    subscription?.status === 'active' &&
    PLAN_ORDER.includes(subscription.planCode as PlanCode)
      ? (subscription.planCode as PlanCode)
      : 'free';
  return {
    code,
    name: PLAN_NAMES[code],
    price: 0,
    billingCycle: code === 'free' ? 'free' : 'monthly',
    maxCustomers: null,
    maxMonthlyBookings: null,
    features: [],
    highlights: [],
  };
}

export function getSubscriptionStatusLabel(
  subscription?: TechnicianSubscription | null,
): string {
  if (!subscription) return PLAN_NAMES.free;
  if (['cancelled', 'expired'].includes(subscription.status)) return '已过期';
  const code = PLAN_ORDER.includes(subscription.planCode as PlanCode)
    ? (subscription.planCode as PlanCode)
    : 'free';
  return PLAN_NAMES[code];
}

export const subscriptionService = {
  async getPlans(): Promise<PlanDefinition[]> {
    const response = await api.get<SubscriptionPlanApiItem[]>('/subscriptions/plans');
    return response.data.map(mapPlan);
  },
};
