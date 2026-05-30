import api from './api';
import type {
  ServiceTypeSettings,
  ShopAddress,
  ShopBusinessHour,
  SocialMediaAccounts,
  Technician,
  TechnicianSubscription,
  ServiceSchedule,
  CustomTag,
} from '../contexts/authTypes';

export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  technician: Technician;
}

interface AuthApiResponse {
  accessToken: string;
  technician: {
    id: number;
    name: string;
    phone: string;
    avatarUrl?: string;
    city?: string;
    serviceArea?: string;
    status: string;
    invitationCode?: string;
    homeService?: boolean;
    shopService?: boolean;
    shopAddresses?: ShopAddress[];
    socialMedia?: SocialMediaAccounts;
    subscription?: TechnicianSubscription | null;
    serviceItems?: Technician['serviceItems'];
  };
}

interface MeApiResponse {
  id: number;
  name: string;
  phone: string;
  avatarUrl?: string;
  city?: string;
  serviceArea?: string;
  status: string;
  invitationCode?: string;
  homeService?: boolean;
  shopService?: boolean;
  shopAddresses?: ShopAddress[];
  socialMedia?: SocialMediaAccounts;
  subscription?: TechnicianSubscription | null;
  serviceSchedule?: ServiceSchedule | null;
  customTags?: CustomTag[];
  serviceItems?: Technician['serviceItems'];
}

interface UpdateStatusApiResponse {
  id: number;
  name: string;
  phone: string;
  avatarUrl?: string;
  city?: string;
  serviceArea?: string;
  status: string;
}

export interface RegisterCredentials {
  inviteKey: string;
  name: string;
  phone: string;
  password: string;
}

function buildDefaultBusinessHours(): ShopBusinessHour[] {
  return [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
    weekday,
    start: '10:00',
    end: '21:00',
    closed: false,
  }));
}

function normalizeShopAddress(shop: ShopAddress): ShopAddress {
  return {
    ...shop,
    enabled: shop.enabled ?? true,
    businessHours: shop.businessHours?.length ? shop.businessHours : buildDefaultBusinessHours(),
  };
}

function normalizeShopAddresses(shopAddresses?: ShopAddress[]): ShopAddress[] {
  return (shopAddresses ?? []).map(normalizeShopAddress);
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthApiResponse>('/auth/login', credentials);
    const mappedResponse: AuthResponse = {
      access_token: response.data.accessToken,
      technician: {
        id: response.data.technician.id,
        name: response.data.technician.name,
        email: `${response.data.technician.phone}@nailbook.local`,
        phone: response.data.technician.phone,
        avatar: response.data.technician.avatarUrl,
        status: response.data.technician.status,
        invitationCode: response.data.technician.invitationCode,
        city: response.data.technician.city,
        serviceArea: response.data.technician.serviceArea,
        homeService: response.data.technician.homeService,
        shopService: response.data.technician.shopService,
        shopAddresses: normalizeShopAddresses(response.data.technician.shopAddresses),
        socialMedia: response.data.technician.socialMedia,
        subscription: response.data.technician.subscription ?? null,
        serviceItems: response.data.technician.serviceItems,
      },
    };

    if (mappedResponse.access_token) {
      localStorage.setItem('technician_token', mappedResponse.access_token);
    }
    return mappedResponse;
  },

  logout: (): void => {
    localStorage.removeItem('technician_token');
    localStorage.removeItem('technician_info');
  },

  getCurrentTechnician: async (): Promise<Technician> => {
    try {
      const response = await api.get<MeApiResponse>('/auth/me');
      return {
        id: response.data.id,
        name: response.data.name,
        email: `${response.data.phone}@nailbook.local`,
        phone: response.data.phone,
        avatar: response.data.avatarUrl,
        status: response.data.status,
        invitationCode: response.data.invitationCode,
        city: response.data.city,
        serviceArea: response.data.serviceArea,
        homeService: response.data.homeService,
        shopService: response.data.shopService,
        shopAddresses: normalizeShopAddresses(response.data.shopAddresses),
        socialMedia: response.data.socialMedia,
        subscription: response.data.subscription ?? null,
        serviceSchedule: response.data.serviceSchedule ?? null,
        customTags: response.data.customTags ?? [],
        serviceItems: response.data.serviceItems,
      };
    } catch (error) {
      if (localStorage.getItem('technician_token')) {
        throw error;
      }

      const stored = localStorage.getItem('technician_info');
      if (stored) {
        const technician = JSON.parse(stored) as Technician;
        return {
          ...technician,
          shopAddresses: normalizeShopAddresses(technician.shopAddresses),
        };
      }

      throw error;
    }
  },

  updateStatus: async (
    status: 'active' | 'inactive',
    currentTechnician?: Technician | null
  ): Promise<Technician> => {
    const response = await api.patch<UpdateStatusApiResponse>('/auth/status', { status });
    const technician: Technician = {
      id: response.data.id,
      name: response.data.name,
      email: `${response.data.phone}@nailbook.local`,
      phone: response.data.phone,
      avatar: response.data.avatarUrl,
      status: response.data.status,
      invitationCode: currentTechnician?.invitationCode,
      city: response.data.city,
      serviceArea: response.data.serviceArea,
      subscription: currentTechnician?.subscription,
    };

    localStorage.setItem('technician_info', JSON.stringify(technician));
    return technician;
  },

  checkPhone: async (phone: string): Promise<{ exists: boolean }> => {
    const response = await api.post<{ exists: boolean }>('/auth/check-phone', { phone });
    return response.data;
  },

  sendResetCode: async (phone: string): Promise<{ sent: boolean; devCode?: string }> => {
    const response = await api.post('/auth/forgot-password/send-code', { phone });
    return response.data;
  },

  resetPassword: async (phone: string, code: string, newPassword: string): Promise<void> => {
    await api.post('/auth/forgot-password/reset', { phone, code, newPassword });
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthApiResponse>('/auth/register', credentials);
    const mappedResponse: AuthResponse = {
      access_token: response.data.accessToken,
      technician: {
        id: response.data.technician.id,
        name: response.data.technician.name,
        email: `${response.data.technician.phone}@nailbook.local`,
        phone: response.data.technician.phone,
        avatar: response.data.technician.avatarUrl,
        status: response.data.technician.status,
        invitationCode: response.data.technician.invitationCode,
        city: response.data.technician.city,
        serviceArea: response.data.technician.serviceArea,
        homeService: response.data.technician.homeService,
        shopService: response.data.technician.shopService,
        shopAddresses: normalizeShopAddresses(response.data.technician.shopAddresses),
        socialMedia: response.data.technician.socialMedia,
        subscription: response.data.technician.subscription ?? null,
        serviceItems: response.data.technician.serviceItems,
      },
    };

    if (mappedResponse.access_token) {
      localStorage.setItem('technician_token', mappedResponse.access_token);
    }
    return mappedResponse;
  },

  updateServiceType: async (settings: ServiceTypeSettings): Promise<Technician> => {
    const response = await api.patch('/auth/service-type', settings);
    const data = response.data;
    return {
      id: data.id,
      name: data.name,
      email: `${data.phone}@nailbook.local`,
      phone: data.phone,
      avatar: data.avatarUrl,
      status: data.status,
      invitationCode: data.invitationCode,
      city: data.city,
      serviceArea: data.serviceArea,
      homeService: data.homeService,
      shopService: data.shopService,
      shopAddresses: normalizeShopAddresses(data.shopAddresses),
      subscription: data.subscription ?? null,
      serviceSchedule: data.serviceSchedule ?? null,
      customTags: data.customTags ?? [],
      serviceItems: data.serviceItems,
    };
  },

  updateProfile: async (profile: Partial<Technician>): Promise<Technician> => {
    const payload = {
      name: profile.name?.trim(),
      city: profile.city,
      serviceArea: profile.serviceArea,
      avatarUrl: profile.avatar?.trim() ? profile.avatar.trim() : undefined,
      socialMedia: profile.socialMedia,
      serviceSchedule: profile.serviceSchedule,
      customTags: profile.customTags,
    };
    const response = await api.patch('/auth/profile', payload);
    const data = response.data;
    return {
      id: data.id,
      name: data.name,
      email: `${data.phone}@nailbook.local`,
      phone: data.phone,
      avatar: data.avatarUrl,
      status: data.status,
      invitationCode: data.invitationCode,
      city: data.city,
      serviceArea: data.serviceArea,
      homeService: data.homeService,
      shopService: data.shopService,
      shopAddresses: normalizeShopAddresses(data.shopAddresses),
      socialMedia: data.socialMedia,
      subscription: data.subscription ?? null,
      serviceSchedule: data.serviceSchedule ?? null,
      customTags: data.customTags ?? [],
      serviceItems: data.serviceItems,
    };
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await api.patch('/auth/password', { oldPassword, newPassword });
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('technician_token');
  },
};
