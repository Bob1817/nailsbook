import api from './api';

export interface CustomServiceRequest {
  id: number;
  requestNo: string;
  clientId: number;
  techId: number;
  title: string | null;
  description: string | null;
  images: string[];
  referenceWorkIds: number[];
  serviceDate: string | null;
  startTime: string | null;
  serviceType: string | null;
  status: string;
  quotePrice: number | null;
  quoteRemark: string | null;
  quotedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  technician: {
    id: number;
    name: string;
    avatarUrl: string | null;
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
  shopAddress: {
    name: string;
    phone?: string;
    province?: string;
    city?: string;
    district?: string;
    detailAddress?: string;
    doorInfo?: string;
  } | null;
}

export interface CreateCustomServiceRequestDto {
  techId: number;
  title?: string;
  description?: string;
  images?: string[];
  referenceWorkIds?: number[];
  serviceDate?: string;
  startTime?: string;
  serviceType?: string;
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

export const customServiceRequestService = {
  async create(data: CreateCustomServiceRequestDto): Promise<CustomServiceRequest> {
    const response = await api.post('/client/custom-service-requests', data);
    return response.data;
  },

  async getRequests(): Promise<CustomServiceRequest[]> {
    const response = await api.get('/client/custom-service-requests');
    return response.data;
  },

  async getRequest(id: number): Promise<CustomServiceRequest> {
    const response = await api.get(`/client/custom-service-requests/${id}`);
    return response.data;
  },

  async acceptQuote(id: number): Promise<CustomServiceRequest> {
    const response = await api.patch(`/client/custom-service-requests/${id}/accept`);
    return response.data;
  },

  async rejectQuote(id: number): Promise<CustomServiceRequest> {
    const response = await api.patch(`/client/custom-service-requests/${id}/reject`);
    return response.data;
  },

  async cancel(id: number): Promise<CustomServiceRequest> {
    const response = await api.patch(`/client/custom-service-requests/${id}/cancel`);
    return response.data;
  },
};
