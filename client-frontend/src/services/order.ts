import api from './api';
import type { ShopAddress } from './auth';

export interface Order {
  id: number;
  orderNo: string;
  status: string;
  source: string | null;
  startTime: string;
  endTime: string;
  serviceType: string | null;
  remark: string | null;
  address: string | null;
  quotePrice: number | null;
  quoteRemark: string | null;
  quotedAt: string | null;
  depositAmount: number;
  isDepositPaid: boolean;
  technician: {
    id: number;
    name: string;
    phone: string;
  } | null;
  customer: {
    id: number;
    name: string;
    phone: string;
  } | null;
  clientAddress: {
    doorInfo?: string;
    detailAddress?: string;
    province?: string;
    city?: string;
    district?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderDto {
  serviceDate: string;
  startTime: string;
  addressId?: number;
  techId: number;
  serviceType: string;
  selectedServiceIds?: string[];
  remark?: string;
  shopAddress?: ShopAddress;
}

export interface UpdateOrderDto {
  serviceDate: string;
  startTime: string;
  addressId: number;
}

export interface UpdateOrderStatusDto {
  status: 'completed' | 'cancelled';
}

export interface CreateOrderFromDesignDto {
  designId: number;
  techId: number;
  serviceDate: string;
  startTime: string;
  serviceType: string;
  addressId?: number;
  shopAddress?: {
    name: string;
    phone?: string;
    province?: string;
    city?: string;
    district?: string;
    detailAddress?: string;
    doorInfo?: string;
  };
}

export const orderService = {
  async getOrders(): Promise<Order[]> {
    const response = await api.get('/orders');
    return response.data;
  },

  async getTrips(): Promise<Order[]> {
    const response = await api.get('/orders/trips');
    return response.data;
  },

  async getOrder(id: number): Promise<Order> {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  async createOrder(data: CreateOrderDto): Promise<Order> {
    const response = await api.post('/orders', data);
    return response.data;
  },

  async createOrderFromDesign(data: CreateOrderFromDesignDto): Promise<Order> {
    const response = await api.post('/orders/from-design', data);
    return response.data;
  },

  async updateOrder(id: number, data: UpdateOrderDto): Promise<Order> {
    const response = await api.patch(`/orders/${id}`, data);
    return response.data;
  },

  async agreeQuote(id: number): Promise<Order> {
    const response = await api.post(`/orders/${id}/agree`, {});
    return response.data;
  },

  async rejectQuote(id: number, reason: string): Promise<Order> {
    const response = await api.post(`/orders/${id}/reject-quote`, { reason });
    return response.data;
  },

  async updateOrderStatus(id: number, data: UpdateOrderStatusDto): Promise<Order> {
    const response = await api.patch(`/orders/${id}/status`, data);
    return response.data;
  },
};
