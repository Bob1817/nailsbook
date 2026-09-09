import api from './api';

export interface AdminWork {
  id: number;
  title: string | null;
  coverUrl: string | null;
  imageUrls: string[];
  description: string | null;
  tags: string[];
  price: number | null;
  isVisible: boolean;
  isHomepageFeatured: boolean;
  isFeatured: boolean;
  publicationStatus: 'draft' | 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  publishedAt: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  technician: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export const adminWorkService = {
  getAll: async (params?: {
    page?: number;
    pageSize?: number;
    technicianId?: number;
    keyword?: string;
    isVisible?: boolean;
    isHomepageFeatured?: boolean;
    publicationStatus?: string;
  }) => {
    const response = await api.get('/works', { params });
    return response.data as { items: AdminWork[]; total: number; page: number; pageSize: number };
  },

  getById: async (id: number): Promise<AdminWork> => {
    const response = await api.get(`/works/${id}`);
    return response.data;
  },

  toggleVisibility: async (id: number): Promise<{ id: number; isVisible: boolean }> => {
    const response = await api.patch(`/works/${id}/visibility`);
    return response.data;
  },

  toggleHomepageFeatured: async (id: number): Promise<{ id: number; isHomepageFeatured: boolean }> => {
    const response = await api.patch(`/works/${id}/homepage-featured`);
    return response.data;
  },

  review: async (
    id: number,
    decision: 'approved' | 'rejected',
    note?: string,
  ): Promise<{ id: number; publicationStatus: string; reviewNote: string | null; publishedAt: string | null }> => {
    const response = await api.patch(`/works/${id}/review`, { decision, note });
    return response.data;
  },

  updateTags: async (id: number, tags: string): Promise<{ id: number; tags: string }> => {
    const response = await api.patch(`/works/${id}/tags`, { tags });
    return response.data;
  },

  remove: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.delete(`/works/${id}`);
    return response.data;
  },
};
