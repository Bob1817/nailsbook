import api from './api';

export interface TechnicianInviteKey {
  id: number;
  key: string;
  note: string | null;
  usedByTechnicianId: number | null;
  usedAt: string | null;
  createdByAdminId: number | null;
  createdAt: string;
  technician?: {
    id: number;
    name: string;
    phone: string;
  } | null;
}

export interface InviteKeyListResponse {
  items: TechnicianInviteKey[];
  total: number;
  page: number;
  pageSize: number;
}

export const inviteKeyService = {
  list: (params: { used?: 'true' | 'false'; page?: number; pageSize?: number } = {}) =>
    api
      .get<InviteKeyListResponse>('/technician-invite-keys', { params })
      .then((r) => r.data),

  create: (data: { note?: string; count?: number }) =>
    api
      .post<TechnicianInviteKey[]>('/technician-invite-keys', data)
      .then((r) => r.data),

  remove: (id: number) =>
    api.delete(`/technician-invite-keys/${id}`).then((r) => r.data),
};
