import api from './api';
import type { ShopAddress } from './auth';

export interface Booking {
  id: number;
  bookingNo: string;
  status: string;
  source: string | null;
  startTime: string;
  endTime: string;
  serviceType: string | null;
  remark: string | null;
  address: string | null;
  quotePrice: number | null;
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
  quote: {
    id: number;
    quoteNo: string;
    title: string | null;
    description: string | null;
    price: number;
    status: string;
  } | null;
  clientAddress: {
    id: number;
    contactName: string | null;
    contactPhone: string | null;
    province: string | null;
    city: string | null;
    district: string | null;
    detailAddress: string | null;
    doorInfo: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingDto {
  serviceDate: string;
  startTime: string;
  addressId?: number;
  techId: number;
  serviceType: string;
  selectedServiceIds?: string[];
  remark?: string;
  shopAddress?: ShopAddress;
}

export interface UpdateBookingDto {
  serviceDate: string;
  startTime: string;
  addressId: number;
}

export interface UpdateBookingStatusDto {
  status: 'completed' | 'cancelled';
}

export interface CreateBookingFromDesignDto {
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

export const bookingService = {
  async getBookings(): Promise<Booking[]> {
    const response = await api.get('/bookings');
    return response.data;
  },

  async getBooking(id: number): Promise<Booking> {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  async createBooking(data: CreateBookingDto): Promise<Booking> {
    const response = await api.post('/bookings', data);
    return response.data;
  },

  async createBookingFromDesign(data: CreateBookingFromDesignDto): Promise<Booking> {
    const response = await api.post('/bookings/from-design', data);
    return response.data;
  },

  async updateBooking(id: number, data: UpdateBookingDto): Promise<Booking> {
    const response = await api.patch(`/bookings/${id}`, data);
    return response.data;
  },

  async confirmBooking(id: number): Promise<Booking> {
    const response = await api.post(`/bookings/${id}/confirm`, {});
    return response.data;
  },

  async updateBookingStatus(id: number, data: UpdateBookingStatusDto): Promise<Booking> {
    const response = await api.patch(`/bookings/${id}/status`, data);
    return response.data;
  },
};
