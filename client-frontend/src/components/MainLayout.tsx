import React from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MainLayout: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-[#FF6B8A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const tabs = [
    {
      key: '/home',
      label: '首页',
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 ${active ? 'text-[#FF6B8A]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      key: '/bookings',
      label: '预约',
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 ${active ? 'text-[#FF6B8A]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      key: '/designs',
      label: '设计',
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 ${active ? 'text-[#FF6B8A]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      key: '/chat',
      label: '消息',
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 ${active ? 'text-[#FF6B8A]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      key: '/profile',
      label: '我的',
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 ${active ? 'text-[#FF6B8A]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  const isActive = (path: string) => {
    if (path === '/home') {
      return location.pathname === '/home' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const primaryTabPaths = new Set(['/home', '/bookings', '/designs', '/chat', '/profile']);
  const showTabBar = primaryTabPaths.has(location.pathname);

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col max-w-md mx-auto overflow-hidden">
      {/* Main Content */}
      <div className={`flex-1 min-h-0 overflow-y-auto scrollbar-hide ${showTabBar ? 'pb-16' : ''}`}>
        <Outlet />
      </div>

      {/* Bottom Tab Bar */}
      {showTabBar && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-bottom z-50">
          <div className="max-w-md mx-auto flex items-center justify-around py-2">
            {tabs.map((tab) => {
              const active = isActive(tab.key);
              return (
                <button
                  key={tab.key}
                  onClick={() => navigate(tab.key)}
                  className="flex flex-col items-center gap-0.5 py-1 px-4 touch-target"
                >
                  {tab.icon(active)}
                  <span className={`text-xs ${active ? 'text-[#FF6B8A] font-medium' : 'text-gray-400'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
