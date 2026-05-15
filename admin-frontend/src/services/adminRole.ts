import api from './api';

export interface AdminRole {
  id: number;
  name: string;
  code: string;
  description: string | null;
  permissions?: { permission: AdminPermission }[];
  _count?: { users: number };
}

export interface AdminPermission {
  id: number;
  name: string;
  code: string;
  module: string;
  action: string;
}

export const adminRoleService = {
  getAll: () => api.get<AdminRole[]>('/roles').then(r => r.data),
  getById: (id: number) => api.get<AdminRole>(`/roles/${id}`).then(r => r.data),
  create: (data: { name: string; code: string; description?: string; permissionIds?: number[] }) =>
    api.post<AdminRole>('/roles', data).then(r => r.data),
  update: (id: number, data: { name?: string; description?: string; permissionIds?: number[] }) =>
    api.patch<AdminRole>(`/roles/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/roles/${id}`).then(r => r.data),
};
