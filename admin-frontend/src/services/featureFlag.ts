import api from './api';

export interface FeatureFlag {
  id: number;
  featureCode: string;
  featureName: string;
  enabled: boolean;
  enabledPlans: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export const featureFlagService = {
  getAll: () => api.get<FeatureFlag[]>('/admin/feature-flags').then(r => r.data),
  getById: (id: number) => api.get<FeatureFlag>(`/admin/feature-flags/${id}`).then(r => r.data),
  update: (id: number, data: Partial<Pick<FeatureFlag, 'enabled' | 'enabledPlans' | 'description'>>) =>
    api.patch<FeatureFlag>(`/admin/feature-flags/${id}`, data).then(r => r.data),
  toggle: (id: number) => api.patch<FeatureFlag>(`/admin/feature-flags/${id}/toggle`).then(r => r.data),
};
