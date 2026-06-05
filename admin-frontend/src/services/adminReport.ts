import api from './api';

export interface AdminReport {
  id: number;
  commentId: number;
  reporterId: number;
  reporterType: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  comment: {
    id: number;
    content: string;
    work: { id: number; title: string | null } | null;
  } | null;
}

export const REASON_MAP: Record<string, string> = {
  spam: '广告/垃圾信息',
  inappropriate: '不雅内容',
  harassment: '骚扰',
  other: '其他',
};

export const adminReportService = {
  getAll: async (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
  }) => {
    const response = await api.get('/reports', { params });
    return response.data as {
      items: AdminReport[];
      total: number;
      page: number;
      pageSize: number;
      pendingCount: number;
    };
  },

  resolve: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.patch(`/reports/${id}/resolve`);
    return response.data;
  },

  dismiss: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.patch(`/reports/${id}/dismiss`);
    return response.data;
  },
};
