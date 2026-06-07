import api from './api';

export interface AdminFeedback {
  id: number;
  sourceType: 'client' | 'technician';
  sourceId: number;
  sourceName: string | null;
  sourcePhone: string | null;
  title: string;
  type: string;
  content: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export const SOURCE_MAP: Record<string, string> = {
  client: '用户',
  technician: '美甲师',
};

export const adminFeedbackService = {
  getAll: async (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    sourceType?: string;
  }) => {
    const response = await api.get('/feedback', { params });
    return response.data as {
      list: AdminFeedback[];
      total: number;
      page: number;
      pageSize: number;
    };
  },

  resolve: async (id: number) => {
    const response = await api.patch(`/feedback/${id}/resolve`);
    return response.data;
  },
};
