import api from './api';

export type ErrorCategory = 'database' | 'server' | 'backend' | 'frontend' | 'other';
export type ErrorPriority = 'P0' | 'P1' | 'P2' | 'P3';

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
  category?: ErrorCategory;
  categoryLabel?: string;
  fixAction?: string;
  fixHint?: string;
  priority?: ErrorPriority;
  priorityLabel?: string;
  urgencyNote?: string;
}

export interface SystemErrorGroup {
  groupKey: string;
  ids: number[];
  occurrenceCount: number;
  impactedUsersCount: number;
  firstOccurredAt: string;
  latestOccurredAt: string;
  resolved: boolean;
  category: ErrorCategory;
  categoryLabel: string;
  fixAction: string;
  fixHint: string;
  priority: ErrorPriority;
  priorityLabel: string;
  urgencyNote: string;
  latestError: SystemErrorLog;
  occurrences: SystemErrorLog[];
}

export interface SystemErrorStats {
  todayCount: number;
  unresolvedCount: number;
  resolvedCount: number;
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

export interface SystemErrorGroupListResponse {
  items: SystemErrorGroup[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    p0Count: number;
    p1Count: number;
    p2Count: number;
    p3Count: number;
  };
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
    const response = await api.get('/system-errors', { params });
    return response.data;
  },

  getGroups: async (params?: {
    page?: number;
    pageSize?: number;
    source?: string;
    errorType?: string;
    category?: string;
    priority?: string;
    keyword?: string;
    resolved?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<SystemErrorGroupListResponse> => {
    const response = await api.get('/system-errors/groups', { params });
    return response.data;
  },

  getStats: async (): Promise<SystemErrorStats> => {
    const response = await api.get('/system-errors/stats');
    return response.data;
  },

  getById: async (id: number): Promise<SystemErrorLog> => {
    const response = await api.get(`/system-errors/${id}`);
    return response.data;
  },

  resolve: async (id: number, note?: string): Promise<SystemErrorLog> => {
    const response = await api.patch(`/system-errors/${id}/resolve`, { note });
    return response.data;
  },

  batchResolve: async (ids: number[], note?: string): Promise<{ success: boolean; count: number }> => {
    const response = await api.post('/system-errors/batch-resolve', { ids, note });
    return response.data;
  },
};
