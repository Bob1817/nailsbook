import api from './api';

export interface AdminComment {
  id: number;
  workId: number;
  parentId: number | null;
  content: string;
  isHidden: boolean;
  isPinned: boolean;
  authorType: 'client' | 'technician';
  authorName: string;
  work: { id: number; title: string; technicianName: string } | null;
  createdAt: string;
}

export const adminCommentService = {
  getAll: async (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: 'normal' | 'hidden';
    authorType?: 'client' | 'technician';
  }) => {
    const response = await api.get('/admin/comments', { params });
    return response.data as { items: AdminComment[]; total: number; page: number; pageSize: number };
  },

  toggleHide: async (id: number): Promise<{ id: number; isHidden: boolean }> => {
    const response = await api.patch(`/admin/comments/${id}/hide`);
    return response.data;
  },

  remove: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.delete(`/admin/comments/${id}`);
    return response.data;
  },
};
