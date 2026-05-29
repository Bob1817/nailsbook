import api from './api';

export interface ClientUser {
  id: number;
  nickname: string | null;
  phone: string;
  avatarUrl: string | null;
  status: string;
}

export interface ShopAddress {
  name: string;
  phone?: string;
  province?: string;
  city?: string;
  district?: string;
  detailAddress?: string;
  doorInfo?: string;
  enabled?: boolean;
  businessHours?: Array<{
    weekday: number;
    start: string;
    end: string;
    closed?: boolean;
  }>;
}

export interface TechnicianServiceItem {
  id: string;
  name: string;
  description?: string;
  category: 'basic_care' | 'color_style' | 'extension_reinforcement' | 'removal';
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Technician {
  id: number;
  name: string;
  phone: string;
  avatarUrl?: string | null;
  city?: string | null;
  serviceArea?: string | null;
  status?: string;
  isDefault?: boolean;
  bindSource?: string;
  bindId?: number;
  invitationCode?: string | null;
  socialMedia?: Record<string, string> | null;
  homeService?: boolean;
  shopService?: boolean;
  shopAddresses?: ShopAddress[];
  serviceItems?: TechnicianServiceItem[];
}

export interface AuthResponse {
  accessToken: string;
  client: ClientUser;
  technician: Technician;
  technicians?: Technician[];
}

export interface RequestCodeResponse {
  codeSent: boolean;
  devCode: string;
}

export interface BindTechnicianDto {
  techId: number;
  inviteCode: string;
  isDefault?: boolean;
}

export const authService = {
  async findTechnicianByInviteCode(inviteCode: string): Promise<Technician> {
    const response = await api.get('/auth/find-by-invite-code', {
      params: { code: inviteCode },
    });
    return response.data;
  },

  async checkPhone(phone: string): Promise<{ exists: boolean; activated?: boolean }> {
    const response = await api.post('/auth/check-phone', { phone });
    return response.data;
  },

  async registerByInvite(phone: string, password: string, inviteCode: string): Promise<AuthResponse> {
    const response = await api.post('/auth/register-by-invite', {
      phone,
      password,
      inviteCode,
    });
    return response.data;
  },

  async login(phone: string, password: string): Promise<AuthResponse> {
    const response = await api.post('/auth/login', {
      phone,
      password,
    });
    return response.data;
  },

  async getProfile(): Promise<{
    id: number;
    nickname: string | null;
    phone: string;
    avatarUrl: string | null;
    status: string;
    binding: {
      techId: number;
      inviteCode: string;
      bindSource: string;
      technician: Technician;
    } | null;
    technicians: Technician[];
  }> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async bindTechnician(data: BindTechnicianDto): Promise<{ id: number; technician: Technician }> {
    const response = await api.post('/auth/bind-technician', data);
    return response.data;
  },

  async unbindTechnician(techId: number): Promise<void> {
    await api.delete(`/auth/unbind-technician/${techId}`);
  },

  async setDefaultTechnician(techId: number): Promise<{ success: boolean }> {
    const response = await api.post(`/auth/set-default-technician/${techId}`);
    return response.data;
  },

  async updateProfile(data: { nickname?: string; avatarUrl?: string }): Promise<ClientUser> {
    const response = await api.put('/auth/me', data);
    return response.data;
  },
};
