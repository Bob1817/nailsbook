import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { technician, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--nb-page)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--nb-line)] border-t-pink-500 rounded-full animate-spin"></div>
          <p className="text-[var(--nb-secondary)]">加载中...</p>
        </div>
      </div>
    );
  }

  if (!token || !technician) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const needProfile = !technician.province || !technician.city;
  if (needProfile && location.pathname !== '/profile-completion') {
    return <Navigate to="/profile-completion" replace />;
  }

  // 接单就绪：至少开启一种服务类型。未就绪时强制进入配置引导，
  // 但放行各配置页，让技师可前往开启服务/完善配置。
  const needSetup = !(technician.homeService || technician.shopService);
  const setupAllowed = [
    '/setup-guide',
    '/home-service-settings',
    '/shops',
    '/shops/edit',
    '/services',
    '/schedule',
    '/profile-settings',
  ];
  if (!needProfile && needSetup && !setupAllowed.includes(location.pathname)) {
    return <Navigate to="/setup-guide" replace />;
  }

  return <>{children}</>;
};
