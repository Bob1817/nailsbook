import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService, type ClientUser, type Technician } from '../services/auth';

interface AuthContextType {
  user: ClientUser | null;
  technician: Technician | null;
  technicians: Technician[];
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, code: string) => Promise<void>;
  registerByInvite: (phone: string, code: string, techId: number, inviteCode: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  bindTechnician: (techId: number, inviteCode: string, isDefault?: boolean) => Promise<void>;
  unbindTechnician: (techId: number) => Promise<void>;
  setDefaultTechnician: (techId: number) => Promise<void>;
  updateProfile: (data: { nickname?: string; avatarUrl?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyProfile = (profile: {
    id: number;
    nickname: string | null;
    phone: string;
    avatarUrl: string | null;
    status: string;
    technicians: Technician[];
  }) => {
    const nextUser = {
      id: profile.id,
      nickname: profile.nickname,
      phone: profile.phone,
      avatarUrl: profile.avatarUrl,
      status: profile.status,
    };
    setUser(nextUser);
    localStorage.setItem('client_user', JSON.stringify(nextUser));

    if (profile.technicians && profile.technicians.length > 0) {
      setTechnicians(profile.technicians);
      localStorage.setItem('client_technicians', JSON.stringify(profile.technicians));
      const defaultTech = profile.technicians.find((t) => t.isDefault) || profile.technicians[0];
      setTechnician(defaultTech);
      localStorage.setItem('client_technician', JSON.stringify(defaultTech));
      return;
    }

    setTechnicians([]);
    setTechnician(null);
    localStorage.removeItem('client_technicians');
    localStorage.removeItem('client_technician');
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('client_token');
    const storedUser = localStorage.getItem('client_user');
    const storedTechnician = localStorage.getItem('client_technician');
    const storedTechnicians = localStorage.getItem('client_technicians');

    if (storedToken && storedUser) {
      requestAnimationFrame(() => {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedTechnician) {
          setTechnician(JSON.parse(storedTechnician));
        }
        if (storedTechnicians) {
          setTechnicians(JSON.parse(storedTechnicians));
        }
      });

      authService.getProfile()
        .then((profile) => {
          applyProfile(profile);
        })
        .catch(() => {
          localStorage.removeItem('client_token');
          localStorage.removeItem('client_user');
          localStorage.removeItem('client_technician');
          localStorage.removeItem('client_technicians');
          setToken(null);
          setUser(null);
          setTechnician(null);
          setTechnicians([]);
        });
    }
    setLoading(false);
  }, []);

  const saveAuthData = (response: { accessToken: string; client: ClientUser; technician: Technician; technicians?: Technician[] }) => {
    localStorage.setItem('client_token', response.accessToken);
    localStorage.setItem('client_user', JSON.stringify(response.client));
    localStorage.setItem('client_technician', JSON.stringify(response.technician));
    if (response.technicians) {
      localStorage.setItem('client_technicians', JSON.stringify(response.technicians));
    } else {
      localStorage.removeItem('client_technicians');
    }
    setToken(response.accessToken);
    setUser(response.client);
    setTechnician(response.technician);
    setTechnicians(response.technicians || []);
  };

  const login = async (phone: string, code: string) => {
    const response = await authService.login(phone, code);
    saveAuthData(response);
  };

  const registerByInvite = async (phone: string, code: string, techId: number, inviteCode: string) => {
    const response = await authService.registerByInvite(phone, code, techId, inviteCode);
    saveAuthData(response);
  };

  const logout = () => {
    localStorage.removeItem('client_token');
    localStorage.removeItem('client_user');
    localStorage.removeItem('client_technician');
    localStorage.removeItem('client_technicians');
    setToken(null);
    setUser(null);
    setTechnician(null);
    setTechnicians([]);
  };

  const refreshProfile = async () => {
    const profile = await authService.getProfile();
    if (profile) {
      applyProfile(profile);
    }
  };

  const bindTechnician = async (techId: number, inviteCode: string, isDefault?: boolean) => {
    await authService.bindTechnician({ techId, inviteCode, isDefault });
    await refreshProfile();
  };

  const unbindTechnician = async (techId: number) => {
    await authService.unbindTechnician(techId);
    await refreshProfile();
  };

  const setDefaultTechnician = async (techId: number) => {
    await authService.setDefaultTechnician(techId);
    await refreshProfile();
  };

  const updateProfile = async (data: { nickname?: string; avatarUrl?: string }) => {
    const updated = await authService.updateProfile(data);
    setUser(prev => prev ? { ...prev, ...updated } : null);
    localStorage.setItem('client_user', JSON.stringify({ ...user, ...updated }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        technician,
        technicians,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        registerByInvite,
        logout,
        refreshProfile,
        bindTechnician,
        unbindTechnician,
        setDefaultTechnician,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
