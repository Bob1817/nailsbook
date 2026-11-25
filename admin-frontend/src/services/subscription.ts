import api from './api';

export interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  price: number;
  billingCycle: string;
  maxCustomers?: number;
  maxMonthlyBookings?: number;
  maxWorks?: number;
  maxStorageBytes?: number;
  maxMarketingExports?: number;
  maxMonthlySms?: number;
  maxEmployees?: number;
  maxBookingPages?: number;
  targetStage?: string;
  description?: string;
  features?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionPlanInput = Omit<
  SubscriptionPlan,
  'id' | 'createdAt' | 'updatedAt' | 'status' | 'features'
> & { features?: string[]; status?: string };

export interface TechnicianSubscription {
  id: number;
  technicianId: number;
  planId: number;
  status: string;
  startedAt: string;
  expiredAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  technician?: { id: number; name: string; phone: string };
  plan?: SubscriptionPlan;
}

export interface SubscriptionMetrics {
  upgradeTriggers: Array<{
    eventType: string;
    source: string;
    planCode?: string;
    count: number;
  }>;
  subscriptionChanges: Array<{ reason: string; count: number }>;
}

export interface SubscriptionPayment {
  id: number;
  paymentNo: string;
  providerTradeNo?: string | null;
  amount: number;
  payableAmount: number;
  paidAmount: number | null;
  channel: string;
  status: string;
  failureReason?: string | null;
  paidAt?: string | null;
  createdAt: string;
  technicianId?: number | null;
  technician?: { id: number; name: string; phone: string } | null;
  plan?: { id: number; name: string; code: string; price: number } | null;
}

export interface SubscriptionPaymentResponse {
  data: SubscriptionPayment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: {
    totalRevenue: number;
    last30DaysRevenue: number;
    paidCount: number;
    paidLast30DaysCount: number;
    expiringIn7Days: number;
  };
}

export interface EntitlementItem {
  used: number;
  limit: number | null;
  remaining: number | null;
  percent: number | null;
  reached: boolean;
  reminderLevel: string;
}

export interface TechnicianSubscriptionDetail {
  id: number;
  status: string;
  startedAt: string;
  expiredAt?: string | null;
  plan: {
    id: number;
    code: string;
    name: string;
    price: number;
    billingCycle: string;
    features: string[];
  };
  entitlements: {
    customers: EntitlementItem;
    monthlyBookings: EntitlementItem;
    works: EntitlementItem;
    storage: EntitlementItem;
    marketingExports: EntitlementItem;
    monthlySms: EntitlementItem;
  };
}

export const subscriptionService = {
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await api.get('/subscription-plans');
    return response.data;
  },

  getPlanById: async (id: number): Promise<SubscriptionPlan> => {
    const response = await api.get(`/subscription-plans/${id}`);
    return response.data;
  },

  createPlan: async (data: SubscriptionPlanInput): Promise<SubscriptionPlan> => {
    const response = await api.post('/subscription-plans', data);
    return response.data;
  },

  updatePlan: async (id: number, data: Partial<SubscriptionPlanInput>): Promise<SubscriptionPlan> => {
    const response = await api.patch(`/subscription-plans/${id}`, data);
    return response.data;
  },

  getTechnicianSubscriptions: async (params?: {
    technicianId?: number;
    status?: string;
  }): Promise<TechnicianSubscription[]> => {
    const response = await api.get('/technician-subscriptions', { params });
    return response.data;
  },

  updateTechnicianSubscription: async (
    technicianId: number,
    payload: {
      planId: number;
      expiredAt?: string | null;
      applyAtPeriodEnd?: boolean;
      note?: string;
    },
  ): Promise<TechnicianSubscription> => {
    const response = await api.patch(
      `/technician-subscriptions/technicians/${technicianId}`,
      payload,
    );
    return response.data;
  },

  getMetrics: async (): Promise<SubscriptionMetrics> => {
    const response = await api.get('/technician-subscriptions/metrics/overview');
    return response.data;
  },

  getPayments: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    technicianId?: number;
  }): Promise<SubscriptionPaymentResponse> => {
    const response = await api.get('/technician-subscriptions/payments', { params });
    return response.data;
  },

  getTechnicianDetail: async (technicianId: number): Promise<TechnicianSubscriptionDetail> => {
    const response = await api.get(`/technician-subscriptions/technicians/${technicianId}/detail`);
    return response.data;
  },
};
