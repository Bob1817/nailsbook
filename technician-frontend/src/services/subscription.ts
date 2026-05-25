import api from './api';
import type { TechnicianSubscription } from '../contexts/authTypes';

export type PlanCode = 'free' | 'pro' | 'studio_plus';

export interface PlanFeature {
  code: string;
  name: string;
  description: string;
}

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  price: number;
  billingCycle: string;
  maxCustomers: number | null;
  maxMonthlyBookings: number | null;
  features: PlanFeature[];
  highlights: string[];
}

export const TRIAL_DURATION_DAYS = 7;

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    code: 'free',
    name: '免费版',
    price: 0,
    billingCycle: 'free',
    maxCustomers: 20,
    maxMonthlyBookings: 40,
    features: [
      { code: 'basic_profile', name: '基础主页', description: '展示基本资料和服务项目' },
      { code: 'design_request', name: '设计咨询', description: '接收客户设计需求（限量）' },
    ],
    highlights: ['最多 20 位客户', '每月 40 单预约上限', '基础功能使用'],
  },
  {
    code: 'pro',
    name: 'Pro 版',
    price: 29,
    billingCycle: 'monthly',
    maxCustomers: null,
    maxMonthlyBookings: null,
    features: [
      { code: 'basic_profile', name: '基础主页', description: '展示基本资料和服务项目' },
      { code: 'design_request', name: '设计咨询', description: '接收客户设计需求' },
      { code: 'customer_tags', name: '客户标签', description: '自定义客户标签和分组管理' },
      { code: 'analytics', name: '数据统计', description: '收入趋势、客户分析等数据看板' },
      { code: 'unlimited_bookings', name: '无限预约', description: '不限客户数和预约数量' },
      { code: 'home_service', name: '上门服务', description: '开启上门美甲服务模式' },
    ],
    highlights: ['不限客户数和预约量', '上门服务功能', '数据统计分析', '客户标签管理'],
  },
  {
    code: 'studio_plus',
    name: 'Studio Plus',
    price: 99,
    billingCycle: 'monthly',
    maxCustomers: null,
    maxMonthlyBookings: null,
    features: [
      { code: 'basic_profile', name: '基础主页', description: '展示基本资料和服务项目' },
      { code: 'design_request', name: '设计咨询', description: '接收客户设计需求' },
      { code: 'customer_tags', name: '客户标签', description: '自定义客户标签和分组管理' },
      { code: 'analytics', name: '数据统计', description: '收入趋势、客户分析等数据看板' },
      { code: 'unlimited_bookings', name: '无限预约', description: '不限客户数和预约数量' },
      { code: 'home_service', name: '上门服务', description: '开启上门美甲服务模式' },
      { code: 'advanced_analytics', name: '高级分析', description: '深度客户画像和收入预测' },
      { code: 'priority_support', name: '优先客服', description: '专属客服通道优先响应' },
    ],
    highlights: ['Pro 版全部功能', '高级数据分析', '优先客服支持', '专属功能抢先体验'],
  },
];

const PLAN_ORDER: PlanCode[] = ['free', 'pro', 'studio_plus'];

export function getPlanByCode(code: string): PlanDefinition | undefined {
  return PLAN_DEFINITIONS.find((plan) => plan.code === code);
}

export function getCurrentPlan(subscription?: TechnicianSubscription | null): PlanDefinition {
  if (!subscription || subscription.status !== 'active') {
    return PLAN_DEFINITIONS[0];
  }
  return getPlanByCode(subscription.planCode) ?? PLAN_DEFINITIONS[0];
}

export function isTrialActive(subscription?: TechnicianSubscription | null): boolean {
  if (!subscription) return false;
  return subscription.planCode === 'studio_plus' && subscription.status === 'active';
}

export function isTrialPlan(subscription?: TechnicianSubscription | null): boolean {
  return isTrialActive(subscription);
}

export function getTrialDaysRemaining(subscription?: TechnicianSubscription | null): number {
  if (!subscription?.expiredAt) return 0;
  const expiry = new Date(subscription.expiredAt);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getSubscriptionStatusLabel(subscription?: TechnicianSubscription | null): string {
  if (!subscription) return '免费版';
  if (subscription.status === 'cancelled') return '已过期';
  if (subscription.status === 'expired') return '已过期';
  if (isTrialActive(subscription)) {
    const days = getTrialDaysRemaining(subscription);
    return days > 0 ? `试用中 · 剩余 ${days} 天` : '试用已到期';
  }
  const plan = getPlanByCode(subscription.planCode);
  return plan?.name ?? '免费版';
}

export function getPlanLevel(code: string): number {
  return PLAN_ORDER.indexOf(code as PlanCode);
}

export function hasFeatureAccess(
  subscription: TechnicianSubscription | null | undefined,
  featureCode: string,
): boolean {
  const plan = getCurrentPlan(subscription);
  return plan.features.some((f) => f.code === featureCode);
}

export function hasPlanOrHigher(
  subscription: TechnicianSubscription | null | undefined,
  requiredCode: PlanCode,
): boolean {
  const current = getCurrentPlan(subscription);
  return getPlanLevel(current.code) >= getPlanLevel(requiredCode);
}

export interface SubscriptionPlanApiItem {
  id: number;
  name: string;
  code: string;
  price: number;
  billingCycle: string;
  maxCustomers: number | null;
  maxMonthlyBookings: number | null;
  features: string | null;
  status: string;
}

export const subscriptionService = {
  async getPlans(): Promise<SubscriptionPlanApiItem[]> {
    const response = await api.get<SubscriptionPlanApiItem[]>('/subscriptions/plans');
    return response.data;
  },
};
