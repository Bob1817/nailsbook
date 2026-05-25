import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TabBar } from '../components/TabBar';

// 五个主菜单页面路径
const MAIN_TABS = ['/', '/schedule', '/customers', '/messages', '/me'];

export const MainLayout: React.FC = () => {
  const location = useLocation();
  // 只在五个主菜单页面显示底部TabBar
  const showTabBar = MAIN_TABS.includes(location.pathname);

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#fff9f8]" style={{ overscrollBehaviorX: 'none' }}>
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
      {showTabBar && <TabBar />}
    </div>
  );
};
