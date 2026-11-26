import React, { useEffect, useState } from 'react';
import { colors } from './colors.generated';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Technicians from './pages/Technicians';
import Customers from './pages/Customers';
import Revenues from './pages/Revenues';
import Subscriptions from './pages/Subscriptions';
import OperationLogs from './pages/OperationLogs';
import Forbidden from './pages/Forbidden';
import FeatureFlags from './pages/FeatureFlags';
import AdminUsers from './pages/AdminUsers';
import Roles from './pages/Roles';
import InviteKeys from './pages/InviteKeys';
import Works from './pages/Works';
import Comments from './pages/Comments';
import Reports from './pages/Reports';
import Feedback from './pages/Feedback';
import AccountDeletions from './pages/AccountDeletions';
import ArtistApplications from './pages/ArtistApplications';
import WechatConfig from './pages/WechatConfig';
import WechatOfficial from './pages/WechatOfficial';
import WechatMessages from './pages/WechatMessages';
import LaunchConfig from './pages/LaunchConfig';
import Orders from './pages/Orders';
import BookingNotifications from './pages/BookingNotifications';
import Releases from './pages/Releases';
import Campaigns from './pages/Campaigns';
import SystemErrors from './pages/SystemErrors';

function useSystemDarkMode() {
  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (matches: boolean) => {
      setIsDark(matches);
      document.documentElement.dataset.theme = matches ? 'dark' : 'light';
      document.documentElement.style.colorScheme = matches ? 'dark' : 'light';
    };
    update(media.matches);
    const listener = (e: MediaQueryListEvent) => update(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  return isDark;
}

const App: React.FC = () => {
  const isDark = useSystemDarkMode();

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: isDark ? '#F2F2F2' : colors.action,
          colorInfo: '#245EA8',
          colorSuccess: '#287A4B',
          colorWarning: '#D4A017',
          colorError: '#B42332',
          colorText: isDark ? '#F2F2F2' : colors.ink,
          colorTextSecondary: isDark ? '#B3B3B3' : colors.secondary,
          colorBgLayout: isDark ? '#141414' : colors.page,
          colorBgContainer: isDark ? '#1F1F1F' : colors.surface,
          colorBorder: isDark ? '#303030' : colors.line,
          colorBorderSecondary: isDark ? '#262626' : '#ECECEF',
          borderRadius: 8,
          borderRadiusLG: 12,
          borderRadiusSM: 6,
          controlHeight: 36,
          controlHeightLG: 42,
          controlHeightSM: 28,
          fontSize: 14,
          fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
        },
        components: {
          Layout: {
            siderBg: isDark ? '#181818' : colors.action,
            headerBg: isDark ? '#1F1F1F' : colors.surface,
            bodyBg: isDark ? '#141414' : colors.page,
          },
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(255, 255, 255, 0.12)',
            darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
            darkItemSelectedColor: '#FFFFFF',
            itemBorderRadius: 8,
            itemMarginInline: 10,
            itemHeight: 40,
          },
          Card: {
            borderRadiusLG: 12,
            headerHeight: 52,
          },
          Table: {
            headerBg: isDark ? '#262626' : colors.page,
            headerColor: isDark ? '#F2F2F2' : colors.ink,
            headerSplitColor: 'transparent',
            rowHoverBg: isDark ? '#2A2A2A' : colors.pressed,
            borderRadius: 8,
          },
          Button: {
            borderRadius: 8,
            fontWeight: 500,
            primaryColor: isDark ? '#141414' : '#FFFFFF',
          },
          Input: {
            borderRadius: 8,
          },
          Select: {
            borderRadius: 8,
          },
          Tag: {
            borderRadiusSM: 4,
          },
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/403" element={<Forbidden />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ProtectedRoute permission="dashboard:view"><Dashboard /></ProtectedRoute>} />
              <Route path="campaigns" element={<ProtectedRoute permission="dashboard:view"><Campaigns /></ProtectedRoute>} />
              <Route path="technicians" element={<ProtectedRoute permission="technician:view"><Technicians /></ProtectedRoute>} />
              <Route path="customers" element={<ProtectedRoute permission="customer:view"><Customers /></ProtectedRoute>} />
              <Route path="booking-notifications" element={<ProtectedRoute permission="booking:view"><BookingNotifications /></ProtectedRoute>} />
              <Route path="orders" element={<ProtectedRoute permission="booking:view"><Orders /></ProtectedRoute>} />
              <Route path="works" element={<ProtectedRoute permission="work:view"><Works /></ProtectedRoute>} />
              <Route path="comments" element={<ProtectedRoute permission="comment:view"><Comments /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute permission="report:view"><Reports /></ProtectedRoute>} />
              <Route path="account-deletions" element={<ProtectedRoute permission="account-deletion:view"><AccountDeletions /></ProtectedRoute>} />
              <Route path="feedback" element={<ProtectedRoute permission="feedback:view"><Feedback /></ProtectedRoute>} />
              <Route path="applications" element={<ProtectedRoute permission="application:view"><ArtistApplications /></ProtectedRoute>} />
              <Route path="artist-applications" element={<Navigate to="/applications" replace />} />
              <Route path="revenues" element={<ProtectedRoute permission="revenue:view"><Revenues /></ProtectedRoute>} />
              <Route path="subscriptions" element={<ProtectedRoute permission="subscription:view"><Subscriptions /></ProtectedRoute>} />
              <Route path="logs" element={<ProtectedRoute permission="log:view"><OperationLogs /></ProtectedRoute>} />
              <Route path="system-errors" element={<ProtectedRoute permission="log:view"><SystemErrors /></ProtectedRoute>} />
              <Route path="feature-flags" element={<ProtectedRoute permission="feature_flag:view"><FeatureFlags /></ProtectedRoute>} />
              <Route path="wechat-config" element={<ProtectedRoute permission="feature_flag:view"><WechatConfig /></ProtectedRoute>} />
              <Route path="wechat-official" element={<ProtectedRoute permission="feature_flag:view"><WechatOfficial /></ProtectedRoute>} />
              <Route path="wechat-messages" element={<ProtectedRoute permission="feature_flag:view"><WechatMessages /></ProtectedRoute>} />
              <Route path="launch-config" element={<ProtectedRoute permission="feature_flag:view"><LaunchConfig /></ProtectedRoute>} />
              <Route path="releases" element={<ProtectedRoute superAdmin><Releases /></ProtectedRoute>} />
              <Route path="admin-users" element={<ProtectedRoute superAdmin><AdminUsers /></ProtectedRoute>} />
              <Route path="roles" element={<ProtectedRoute superAdmin><Roles /></ProtectedRoute>} />
              <Route path="invite-keys" element={<ProtectedRoute permission="technician:create"><InviteKeys /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
