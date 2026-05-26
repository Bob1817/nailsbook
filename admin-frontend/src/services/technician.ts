import api from './api';

export interface Technician {
  id: number;
  name: string;
  phone: string;
  avatarUrl?: string;
  city?: string;
  serviceArea?: string;
  socialMedia?: Record<string, string>;
  status: string;
  invitationCode?: string;
  invitedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  subscription?: {
    id: number;
    planId: number;
    status: string;
    startedAt: string;
    expiredAt?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const technicianService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<Technician>> => {
    const response = await api.get('/technicians', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Technician> => {
    const response = await api.get(`/technicians/${id}`);
    return response.data;
  },

  create: async (data: {
    name: string;
    phone: string;
    avatarUrl?: string;
    city?: string;
    serviceArea?: string;
  }): Promise<Technician> => {
    const response = await api.post('/technicians', data);
    return response.data;
  },

  updateStatus: async (id: number, status: string): Promise<Technician> => {
    const response = await api.patch(`/technicians/${id}/status`, { status });
    return response.data;
  },

  update: async (
    id: number,
    data: Partial<{
      name: string;
      phone: string;
      avatarUrl: string;
      city: string;
      serviceArea: string;
      status: string;
    }>,
  ): Promise<Technician> => {
    const response = await api.patch(`/technicians/${id}`, data);
    return response.data;
  },

  generateInviteKey: async (
    id: number,
    note?: string,
  ): Promise<{ id: number; key: string; note: string | null; usedAt: string | null }> => {
    const response = await api.post(`/technicians/${id}/invite-key`, { note });
    return response.data;
  },
};
