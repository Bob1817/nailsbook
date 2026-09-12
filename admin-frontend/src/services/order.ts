import api from './api';
import type { PaginatedResponse } from './technician';

export interface OrderServiceLine {
  id: number;
  nameSnapshot: string;
  unitPriceFen: number;
  quantity: number;
  subtotalFen: number;
  durationMinutes: number;
  source: string;
}

export interface AdminOrder {
  id: number;
  orderNo: string;
  status: string;
  bookingType: string;
  serviceType?: string;
  startTime: string;
  endTime: string;
  finalPriceFen?: number | null;
  quotePrice?: number | null;
  depositAmount?: number | null;
  depositModeSnapshot?: string;
  depositValueSnapshot?: number;
  isDepositPaid: boolean;
  quoteVersion: number;
  pricingDetails?: { coreFen?: number; extrasFen?: number; finalDiscountFen?: number } | null;
  acceptedProposal?: unknown;
  technician: { id: number; name: string; phone?: string };
  customer: { id: number; name: string; phone?: string | null };
  serviceLines?: OrderServiceLine[];
  address?: string | null;
  remark?: string | null;
  createdAt: string;
}

export const orderService = {
  getAll: async (params: { page: number; limit: number; status?: string; search?: string }): Promise<PaginatedResponse<AdminOrder>> =>
    (await api.get('/orders', { params })).data,
  getById: async (id: number): Promise<AdminOrder> => (await api.get(`/orders/${id}`)).data,
};
