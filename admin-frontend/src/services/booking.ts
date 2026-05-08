import api from './api';
import type { PaginatedResponse } from './technician';

export interface Booking {
  id: number;
  bookingNo: string;
  quoteId: number;
  technicianId: number;
  customerId: number;
  startTime: string;
  endTime: string;
  address?: string;
  status: string;
  isDepositPaid: boolean;
  depositConfirmedAt?: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  technician?: { id: number; name: string; phone: string };
  customer?: { id: number; name: string; phone: string };
  quote?: { id: number; quoteNo: string; price: number };
}

export const bookingService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    technicianId?: number;
    customerId?: number;
    status?: string;
  }): Promise<PaginatedResponse<Booking>> => {
    const response = await api.get('/bookings', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Booking> => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  confirm: async (id: number): Promise<Booking> => {
    const response = await api.patch(`/bookings/${id}/confirm`);
    return response.data;
  },

  complete: async (id: number): Promise<unknown> => {
    const response = await api.patch(`/bookings/${id}/complete`);
    return response.data;
  },

  cancel: async (id: number): Promise<Booking> => {
    const response = await api.patch(`/bookings/${id}/cancel`);
    return response.data;
  },
};
