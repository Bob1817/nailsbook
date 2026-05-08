import api from './api';
import type { ServiceItem, CreateServiceDto, UpdateServiceDto } from '../types/service';

export const servicesService = {
  list: async (): Promise<ServiceItem[]> => {
    const response = await api.get<ServiceItem[]>('/services');
    return response.data;
  },

  create: async (dto: CreateServiceDto): Promise<ServiceItem> => {
    const response = await api.post<ServiceItem>('/services', dto);
    return response.data;
  },

  update: async (id: string, dto: UpdateServiceDto): Promise<ServiceItem> => {
    const response = await api.patch<ServiceItem>(`/services/${id}`, dto);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/services/${id}`);
  },

  toggleStatus: async (id: string): Promise<ServiceItem> => {
    const response = await api.patch<ServiceItem>(`/services/${id}/toggle`);
    return response.data;
  },
};
