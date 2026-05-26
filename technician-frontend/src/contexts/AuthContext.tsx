import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/auth';
import type { Technician, ServiceTypeSettings } from './authTypes';
import { AuthContext } from './authStoreContext';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function initializeAuth() {
      const storedToken = localStorage.getItem('technician_token');
      const storedTechnician = localStorage.getItem('technician_info');
      let parsedTechnician: Technician | null = null;

      if (!storedToken) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      setToken(storedToken);

      if (storedTechnician) {
        try {
          parsedTechnician = JSON.parse(storedTechnician) as Technician;
          if (!cancelled) {
            setTechnician(parsedTechnician);
          }
        } catch {
          localStorage.removeItem('technician_info');
        }
      }

      try {
        const currentTechnician = await authService.getCurrentTechnician();
        const mergedTechnician =
          parsedTechnician
            ? {
                ...currentTechnician,
                status: parsedTechnician.status || currentTechnician.status,
              }
            : currentTechnician;
        if (!cancelled) {
          setTechnician(mergedTechnician);
        }
        localStorage.setItem('technician_info', JSON.stringify(mergedTechnician));
      } catch {
        localStorage.removeItem('technician_token');
        localStorage.removeItem('technician_info');
        if (!cancelled) {
          setToken(null);
          setTechnician(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initializeAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (phone: string, passwordOrCode: string) => {
    const response = await authService.login({ phone, password: passwordOrCode });

    localStorage.setItem('technician_token', response.access_token);
    localStorage.setItem('technician_info', JSON.stringify(response.technician));

    setToken(response.access_token);
    setTechnician(response.technician as unknown as Technician);
  };

  const register = async (params: {
    inviteKey: string;
    name: string;
    phone: string;
    password: string;
  }) => {
    const response = await authService.register(params);
    localStorage.setItem('technician_token', response.access_token);
    localStorage.setItem('technician_info', JSON.stringify(response.technician));
    setToken(response.access_token);
    setTechnician(response.technician as unknown as Technician);
  };

  const updateTechnicianStatus = async (status: string) => {
    const nextTechnician = await authService.updateStatus(status as 'active' | 'inactive', technician);
    const mergedTechnician = technician
      ? {
          ...technician,
          ...nextTechnician,
        }
      : nextTechnician;
    setTechnician(mergedTechnician);
    localStorage.setItem('technician_info', JSON.stringify(mergedTechnician));
  };

  const updateServiceType = async (settings: ServiceTypeSettings) => {
    const updatedTechnician = await authService.updateServiceType(settings);
    const mergedTechnician = technician
      ? {
          ...technician,
          ...updatedTechnician,
        }
      : updatedTechnician;
    setTechnician(mergedTechnician);
    localStorage.setItem('technician_info', JSON.stringify(mergedTechnician));
  };

  const updateTechnicianProfile = async (profile: Partial<Technician>) => {
    const updatedTechnician = await authService.updateProfile(profile);
    const mergedTechnician = technician
      ? {
          ...technician,
          ...updatedTechnician,
        }
      : updatedTechnician;
    setTechnician(mergedTechnician);
    localStorage.setItem('technician_info', JSON.stringify(mergedTechnician));
  };

  const logout = () => {
    authService.logout();
    localStorage.removeItem('technician_info');
    setToken(null);
    setTechnician(null);
  };

  return (
    <AuthContext.Provider value={{ technician, token, loading, login, register, updateTechnicianStatus, updateServiceType, updateTechnicianProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
