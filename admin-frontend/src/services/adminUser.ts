import api from './api';
import type { AdminRole } from './adminRole';

export interface AdminUser {
  id: number;
  username: string;
  realName: string;
  roleId: number;
  role: AdminRole;
  status: string;
  lastLoginAt: string | null;
}
export interface AdminUserInput {
  username?: string;
  password?: string;
  realName: string;
  roleId?: number;
  status?: string;
}
export const adminUserService = {
  getAll: () => api.get<AdminUser[]>('/users').then(r => r.data),
  create: (data: AdminUserInput) => api.post('/users', data),
  update: (id: number, data: AdminUserInput) => api.patch(`/users/${id}`, data),
};
