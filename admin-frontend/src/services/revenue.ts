import api from './api';
import type { PaginatedResponse } from './technician';

export interface Revenue {
  id: number;
  revenueNo: string;
  orderId: number;
  quoteId: number;
  technicianId: number;
  customerId: number;
  amount: number;
  status: string;
  recognizedAt: string;
  voidedAt?: string;
  createdAt: string;
  updatedAt: string;
  technician?: { id: number; name: string; phone: string };
  customer?: { id: number; name: string; phone: string };
  order?: { id: number; orderNo: string };
}

export interface RevenueStatistics {
  totalRevenue: number;
  count: number;
  avgAmount: number;
  technicianCount: number;
}

export const revenueService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    technicianId?: number;
    customerId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<Revenue>> => {
    const response = await api.get('/revenues', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Revenue> => {
    const response = await api.get(`/revenues/${id}`);
    return response.data;
  },

  getStatistics: async (params?: {
    technicianId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<RevenueStatistics> => {
    const response = await api.get('/revenues/statistics', { params });
    return response.data;
  },
};
