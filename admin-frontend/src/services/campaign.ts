import api from './api';

export interface PlatformCampaign {
  id: number;
  title: string;
  summary?: string | null;
  coverUrl?: string | null;
  badgeText?: string | null;
  content: string;
  targetAudience: 'all' | 'client' | 'technician' | 'guest';
  displayLocations: string[];
  actionType: 'page' | 'internal_link' | 'external_link';
  actionUrl?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status: 'draft' | 'active' | 'offline' | 'ended';
  effectiveStatus: 'draft' | 'scheduled' | 'active' | 'ended' | 'offline';
  sortOrder: number;
  viewCount: number;
  clickCount: number;
  createdBy?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  targetAudience?: string;
  displayLocation?: string;
}

export interface CampaignListResponse {
  items: PlatformCampaign[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: Record<string, number>;
}

export interface CreateCampaignInput {
  title: string;
  summary?: string;
  coverUrl?: string;
  badgeText?: string;
  content?: string;
  targetAudience?: string;
  displayLocations?: string[];
  actionType?: string;
  actionUrl?: string;
  startTime?: string | null;
  endTime?: string | null;
  status?: string;
  sortOrder?: number;
}

export const campaignService = {
  list: async (params?: CampaignListParams): Promise<CampaignListResponse> => {
    const res = await api.get('/platform-campaigns', { params });
    return res.data;
  },

  getDetail: async (id: number): Promise<PlatformCampaign> => {
    const res = await api.get(`/platform-campaigns/${id}`);
    return res.data;
  },

  create: async (data: CreateCampaignInput): Promise<PlatformCampaign> => {
    const res = await api.post('/platform-campaigns', data);
    return res.data;
  },

  update: async (id: number, data: Partial<CreateCampaignInput>): Promise<PlatformCampaign> => {
    const res = await api.put(`/platform-campaigns/${id}`, data);
    return res.data;
  },

  setStatus: async (id: number, status: 'draft' | 'active' | 'offline' | 'ended'): Promise<PlatformCampaign> => {
    const res = await api.patch(`/platform-campaigns/${id}/status`, { status });
    return res.data;
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/platform-campaigns/${id}`);
    return res.data;
  },
};
