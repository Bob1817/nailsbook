import api from './api';

export interface ClientAddress {
  id: number;
  clientId: number;
  contactName: string | null;
  contactPhone: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  detailAddress: string | null;
  doorInfo: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressDto {
  contactName?: string;
  contactPhone?: string;
  province?: string;
  city?: string;
  district?: string;
  detailAddress?: string;
  doorInfo?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export const addressService = {
  async getAddresses(): Promise<ClientAddress[]> {
    const response = await api.get('/addresses');
    return response.data;
  },

  async createAddress(data: CreateAddressDto): Promise<ClientAddress> {
    const response = await api.post('/addresses', data);
    return response.data;
  },

  async updateAddress(id: number, data: Partial<CreateAddressDto>): Promise<ClientAddress> {
    const response = await api.patch(`/addresses/${id}`, data);
    return response.data;
  },

  async deleteAddress(id: number): Promise<void> {
    await api.delete(`/addresses/${id}`);
  },

  async setDefaultAddress(id: number): Promise<ClientAddress> {
    const response = await api.post(`/addresses/${id}/default`, {});
    return response.data;
  },
};
