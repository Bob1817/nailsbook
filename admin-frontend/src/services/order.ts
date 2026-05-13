import api from './api';
import type { PaginatedResponse } from './technician';

export interface Order {
  id: number;
  orderNo: string;
  quoteId: number;
  technicianId: number;
  customerId: number;
  startTime: string;
  endTime: string;
  address?: string;
  status: string;
  isDepositPaid: boolean;
  depositConfirmedAt?: string;
  quoteRemark?: string;
  quotedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  technician?: { id: number; name: string; phone: string };
  customer?: { id: number; name: string; phone: string };
  quote?: { id: number; quoteNo: string; price: number };
}

export const orderService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    technicianId?: number;
    customerId?: number;
    status?: string;
  }): Promise<PaginatedResponse<Order>> => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Order> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  confirm: async (id: number): Promise<Order> => {
    const response = await api.patch(`/orders/${id}/confirm`);
    return response.data;
  },

  complete: async (id: number): Promise<unknown> => {
    const response = await api.patch(`/orders/${id}/complete`);
    return response.data;
  },

  cancel: async (id: number): Promise<Order> => {
    const response = await api.patch(`/orders/${id}/cancel`);
    return response.data;
  },
};
