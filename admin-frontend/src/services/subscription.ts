import api from './api';

export interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  price: number;
  billingCycle: string;
  maxCustomers?: number;
  maxMonthlyBookings?: number;
  features?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

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

export const subscriptionService = {
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await api.get('/subscription-plans');
    return response.data;
  },

  getPlanById: async (id: number): Promise<SubscriptionPlan> => {
    const response = await api.get(`/subscription-plans/${id}`);
    return response.data;
  },

  createPlan: async (data: {
    name: string;
    code: string;
    price: number;
    billingCycle: string;
    maxCustomers?: number;
    maxMonthlyBookings?: number;
    features?: string[];
  }): Promise<SubscriptionPlan> => {
    const response = await api.post('/subscription-plans', data);
    return response.data;
  },

  updatePlan: async (id: number, data: Partial<{
    name: string;
    code: string;
    price: number;
    billingCycle: string;
    maxCustomers?: number;
    maxMonthlyBookings?: number;
    features?: string[];
    status: string;
  }>): Promise<SubscriptionPlan> => {
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

  updateTechnicianSubscription: async (technicianId: number, planId: number): Promise<TechnicianSubscription> => {
    const response = await api.patch(`/technician-subscriptions/technicians/${technicianId}`, { planId });
    return response.data;
  },
};
