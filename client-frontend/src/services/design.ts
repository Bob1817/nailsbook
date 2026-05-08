import api from './api';

export interface ShopAddress {
  name: string;
  phone?: string;
  province?: string;
  city?: string;
  district?: string;
  detailAddress?: string;
  doorInfo?: string;
  latitude?: string;
  longitude?: string;
  enabled?: boolean;
  businessHours?: Array<{
    weekday: number;
    start: string;
    end: string;
    closed?: boolean;
  }>;
}

export interface TechnicianInfo {
  id: number;
  name: string;
  avatarUrl: string | null;
  status?: string;
  homeService?: boolean;
  shopService?: boolean;
  shopAddresses?: ShopAddress[];
}

export interface DesignRequest {
  id: number;
  clientId: number;
  techId: number;
  title: string | null;
  imageUrls: string[];
  description: string | null;
  quotePrice: number | null;
  quoteRemark: string | null;
  status: string;
  technician: TechnicianInfo | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDesignDto {
  title?: string;
  imageUrls: string[];
  description?: string;
  techId?: number;
}

export interface UpdateDesignDto {
  title?: string;
  description?: string;
}

const getApiOrigin = () => {
  const baseURL = import.meta.env.VITE_API_URL || '/api/client';
  if (baseURL.startsWith('http://') || baseURL.startsWith('https://')) {
    return new URL(baseURL).origin;
  }
  return window.location.origin;
};

const FALLBACK_DESIGN_IMAGES = [
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80',
  'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&q=80',
  'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80',
  'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800&q=80',
];

const toAbsoluteUrl = (url: string) => {
  if (!url) {
    return url;
  }
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${getApiOrigin()}${url.startsWith('/') ? url : `/${url}`}`;
};

const normalizeImageUrls = (design: DesignRequest) => {
  const urls = design.imageUrls
    .map(toAbsoluteUrl)
    .filter(Boolean)
    .filter((url) => url !== 'https://example.com/image.jpg');

  if (urls.length > 0) {
    return urls;
  }

  const fallbackIndex = design.id % FALLBACK_DESIGN_IMAGES.length;
  return [FALLBACK_DESIGN_IMAGES[fallbackIndex]];
};

const mapDesign = (design: DesignRequest): DesignRequest => ({
  ...design,
  imageUrls: normalizeImageUrls(design),
  technician: design.technician
    ? {
        ...design.technician,
        avatarUrl: design.technician.avatarUrl ? toAbsoluteUrl(design.technician.avatarUrl) : null,
        shopAddresses: design.technician.shopAddresses || [],
      }
    : null,
});

export const designService = {
  async getDesigns(): Promise<DesignRequest[]> {
    const response = await api.get('/designs');
    return response.data.map(mapDesign);
  },

  async getDesign(id: number): Promise<DesignRequest> {
    const response = await api.get(`/designs/${id}`);
    return mapDesign(response.data);
  },

  async createDesign(data: CreateDesignDto): Promise<DesignRequest> {
    const response = await api.post('/designs', data);
    return response.data;
  },

  async updateDesign(id: number, data: UpdateDesignDto): Promise<DesignRequest> {
    const response = await api.patch(`/designs/${id}`, data);
    return mapDesign(response.data);
  },

  async deleteDesign(id: number): Promise<void> {
    await api.delete(`/designs/${id}`);
  },

  async switchTechnician(id: number, techId: number): Promise<DesignRequest> {
    const response = await api.patch(`/designs/${id}/switch-technician`, { techId });
    return response.data;
  },

  async requestQuote(id: number): Promise<void> {
    await api.post(`/designs/${id}/quote-request`);
  },

  async acceptQuote(id: number): Promise<void> {
    await api.post(`/designs/${id}/accept-quote`);
  },

  async rejectQuote(id: number): Promise<void> {
    await api.post(`/designs/${id}/reject-quote`);
  },
};
