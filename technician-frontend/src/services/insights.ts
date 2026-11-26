import api from './api';

export interface InsightsOverview {
  customers: {
    total: number;
    newThisMonth: number;
    completed: number;
    repeat: number;
    repeatRate: number | null;
    dueForRepurchase: number;
  };
  revenue: {
    monthConfirmed: number;
    averageTicket: number | null;
  };
  rating: {
    average: number | null;
    count: number;
  };
  works: {
    total: number;
  };
  trends: {
    daily: Array<{ period: string; orders: number; revenue: number; newCustomers: number }>;
    weekly: Array<{ period: string; orders: number; revenue: number; newCustomers: number }>;
    sampleSize: number;
  };
  performance: {
    sufficientData: boolean;
    minimumSampleSize: number;
    services: Array<{ name: string; orders: number; revenue: number }>;
    timeSlots: Array<{ name: string; orders: number; revenue: number }>;
  };
  reminders: Array<{
    key: string;
    type: string;
    customerId: number;
    customerName: string;
    reason: string;
  }>;
  conversion: {
    periodDays: number;
    homepage: {
      views: number;
      uniqueVisitors: number;
      shares: number;
      follows: number;
      bookingIntents: number;
      orders: number;
    };
    works: {
      views: number;
      shares: number;
      bookingIntents: number;
      orders: number;
      items?: Array<{
        workId: number;
        title: string;
        views: number;
        shares: number;
        bookingIntents: number;
        orders: number;
      }>;
    };
  };
}

export const insightsService = {
  async getOverview(month?: string): Promise<InsightsOverview> {
    const response = await api.get('/insights/overview', {
      params: month ? { month } : undefined,
    });
    return response.data;
  },
};
