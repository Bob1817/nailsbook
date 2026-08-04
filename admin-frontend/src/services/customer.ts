import api from './api';
import type { PaginatedResponse } from './technician';

export interface Customer {
  id: number;
  technicianId: number;
  name: string;
  phone?: string;
  avatarUrl?: string;
  gender?: string;
  birthday?: string;
  address?: string;
  tags?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  account: {
    linked: boolean;
    passwordConfigured: boolean;
    status: string | null;
  };
  technician?: {
    id: number;
    name: string;
    phone: string;
  };
}

export const customerService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    technicianId?: number;
    search?: string;
    tags?: string;
  }): Promise<PaginatedResponse<Customer>> => {
    const response = await api.get('/customers', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Customer> => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  resetPassword: async (id: number): Promise<{ tempPassword: string }> => {
    const response = await api.post(`/customers/${id}/reset-password`);
    return response.data;
  },
};
