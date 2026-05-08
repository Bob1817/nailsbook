import api from './api';
import type { PaginatedResponse } from './technician';

export interface OperationLog {
  id: number;
  adminUserId: number;
  module: string;
  action: string;
  targetType?: string;
  targetId?: number;
  beforeData?: string;
  afterData?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
  adminUser?: {
    id: number;
    username: string;
    realName: string;
  };
}

export const operationLogService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    adminUserId?: number;
    module?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<OperationLog>> => {
    const response = await api.get('/operation-logs', { params });
    return response.data;
  },

  getById: async (id: number): Promise<OperationLog> => {
    const response = await api.get(`/operation-logs/${id}`);
    return response.data;
  },

  getModules: async (): Promise<Array<{ module: string; count: number }>> => {
    const response = await api.get('/operation-logs/modules');
    return response.data;
  },

  getActions: async (module?: string): Promise<Array<{ action: string; count: number }>> => {
    const response = await api.get('/operation-logs/actions', { params: { module } });
    return response.data;
  },
};
