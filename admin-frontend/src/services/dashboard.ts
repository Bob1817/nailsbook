import api from './api';

export interface DashboardOverview {
  technicianStats: {
    total: number;
    active: number;
    newLast30Days: number;
  };
  customerStats: {
    total: number;
    newLast30Days: number;
  };
  orderStats: {
    total: number;
    pending: number;
    pendingHome: number;
    pendingShop: number;
    completed: number;
  };
  revenueStats: {
    total: number;
    last30Days: number;
  };
  subscriptionStats: {
    total: number;
    active: number;
    byPlan: Array<{
      planId: number;
      planName: string;
      planCode: string;
      count: number;
    }>;
  };
  recentOrders: Array<{
    id: number;
    orderNo: string;
    startTime: string;
    status: string;
    technician?: { id: number; name: string };
    customer?: { id: number; name: string };
  }>;
  recentRevenues: Array<{
    id: number;
    revenueNo: string;
    amount: number;
    recognizedAt: string;
    technician?: { id: number; name: string };
    customer?: { id: number; name: string };
  }>;
}

export interface BusinessStats {
  dailyRevenue: Array<{
    date: string;
    totalAmount: number;
    count: number;
  }>;
  topTechnicians: Array<{
    technicianId: number;
    technicianName: string;
    totalRevenue: number;
    orderCount: number;
  }>;
}

export const dashboardService = {
  getOverview: async (): Promise<DashboardOverview> => {
    const response = await api.get('/dashboard/overview');
    return response.data;
  },

  getBusinessStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<BusinessStats> => {
    const response = await api.get('/dashboard/business-stats', { params });
    return response.data;
  },
};
