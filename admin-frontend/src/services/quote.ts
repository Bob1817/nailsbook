import api from './api';
import type { PaginatedResponse } from './technician';

export interface Quote {
  id: number;
  quoteNo: string;
  technicianId: number;
  customerId: number;
  title?: string;
  description?: string;
  price: number;
  depositAmount?: number;
  status: string;
  expiredAt?: string;
  acceptedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  technician?: { id: number; name: string; phone: string };
  customer?: { id: number; name: string; phone: string };
}

export const quoteService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    technicianId?: number;
    customerId?: number;
    status?: string;
  }): Promise<PaginatedResponse<Quote>> => {
    const response = await api.get('/quotes', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Quote> => {
    const response = await api.get(`/quotes/${id}`);
    return response.data;
  },

  cancel: async (id: number): Promise<Quote> => {
    const response = await api.patch(`/quotes/${id}/cancel`);
    return response.data;
  },
};
