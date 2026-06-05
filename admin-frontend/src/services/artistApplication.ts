import api from './api';

export interface ArtistApplication {
  id: number;
  name: string;
  phone: string;
  city: string;
  serviceMode?: string | null;
  experience?: string | null;
  specialty?: string | null;
  note?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string | null;
  createdAt: string;
}

export interface ApplicationListResponse {
  data: ArtistApplication[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const artistApplicationService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApplicationListResponse> => {
    const response = await api.get('/artist-applications', { params });
    return response.data;
  },

  getById: async (id: number): Promise<ArtistApplication> => {
    const response = await api.get(`/artist-applications/${id}`);
    return response.data;
  },

  approve: async (id: number): Promise<ArtistApplication> => {
    const response = await api.patch(`/artist-applications/${id}/approve`);
    return response.data;
  },

  reject: async (id: number): Promise<ArtistApplication> => {
    const response = await api.patch(`/artist-applications/${id}/reject`);
    return response.data;
  },
};
