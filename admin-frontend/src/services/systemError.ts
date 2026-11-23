import api from './api';

export interface SystemErrorLog {
  id: number;
  source: string;
  errorType: string;
  message: string;
  stack?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  userRole?: string;
  userId?: number;
  deviceInfo?: string;
  networkType?: string;
  ip?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedNote?: string;
  createdAt: string;
}

export interface SystemErrorStats {
  todayCount: number;
  unresolvedCount: number;
  totalCount: number;
  impactedUsersToday: number;
}

export interface SystemErrorListResponse {
  items: SystemErrorLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const systemErrorService = {
  getAll: async (params?: {
    page?: number;
    pageSize?: number;
    source?: string;
    errorType?: string;
    keyword?: string;
    resolved?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<SystemErrorListResponse> => {
    const response = await api.get('/admin/system-errors', { params });
    return response.data;
  },

  getStats: async (): Promise<SystemErrorStats> => {
    const response = await api.get('/admin/system-errors/stats');
    return response.data;
  },

  getById: async (id: number): Promise<SystemErrorLog> => {
    const response = await api.get(`/admin/system-errors/${id}`);
    return response.data;
  },

  resolve: async (id: number, note?: string): Promise<SystemErrorLog> => {
    const response = await api.patch(`/admin/system-errors/${id}/resolve`, { note });
    return response.data;
  },

  batchResolve: async (ids: number[], note?: string): Promise<{ success: boolean; count: number }> => {
    const response = await api.post('/admin/system-errors/batch-resolve', { ids, note });
    return response.data;
  },
};
