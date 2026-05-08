import api from './api';

export interface LoginResponse {
  accessToken: string;
  user: {
    id: number;
    username: string;
    realName: string;
    roleId: number;
    roleName: string;
    permissions: string[];
  };
}

export interface UserInfo {
  id: number;
  username: string;
  realName: string;
  email?: string;
  phone?: string;
  roleId: number;
  roleName: string;
  permissions: string[];
  status: string;
  lastLoginAt?: string;
  createdAt: string;
}

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  getMe: async (): Promise<UserInfo> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
