import api from './api';
import type { AdminPermission } from './adminRole';

export interface GroupedPermissions {
  [module: string]: AdminPermission[];
}

export const adminPermissionService = {
  getAll: () => api.get<AdminPermission[]>('/permissions').then(r => r.data),
  getGrouped: () => api.get<GroupedPermissions>('/permissions/grouped').then(r => r.data),
};
