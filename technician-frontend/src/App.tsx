import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { ToastProvider } from './components/feedback/ToastProvider';
import { PresenceProvider } from './hooks/usePresence';
import { ErrorBoundary } from './components/ErrorBoundary';

const Login = lazy(async () => {
  const module = await import('./pages/Login');
  return { default: module.Login };
});
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const HomePage = lazy(async () => {
  const module = await import('./pages/HomePage');
  return { default: module.HomePage };
});
const SchedulePage = lazy(async () => {
  const module = await import('./pages/SchedulePage');
  return { default: module.SchedulePage };
});
const CustomersPage = lazy(async () => {
  const module = await import('./pages/CustomersPage');
  return { default: module.CustomersPage };
});
const OrdersPage = lazy(async () => {
  const module = await import('./pages/OrdersPage');
  return { default: module.OrdersPage };
});
// OrdersPage retained for deep-link compatibility; /orders redirects to /schedule
const MessagesPage = lazy(async () => {
  const module = await import('./pages/MessagesPage');
  return { default: module.MessagesPage };
});
const ChatPage = lazy(() => import('./pages/ChatPage'));
const MePage = lazy(async () => {
  const module = await import('./pages/MePage');
  return { default: module.MePage };
});
const WorksPage = lazy(() => import('./pages/WorksPage'));
const ShopManagement = lazy(() => import('./pages/ShopManagement'));
const ShopEdit = lazy(() => import('./pages/ShopEdit'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const HomeServiceSettingsPage = lazy(() => import('./pages/HomeServiceSettingsPage'));
const ProfileSettingsPage = lazy(() => import('./pages/ProfileSettingsPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const SubscriptionPage = lazy(async () => {
  const module = await import('./pages/SubscriptionPage');
  return { default: module.SubscriptionPage };
});
const ServiceTimePage = lazy(async () => {
  const module = await import('./pages/ServiceTimePage');
  return { default: module.ServiceTimePage };
});
const TagManagementPage = lazy(async () => {
  const module = await import('./pages/TagManagementPage');
  return { default: module.TagManagementPage };
});
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'));
const AccountSecurityPage = lazy(() => import('./pages/AccountSecurityPage'));
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'));
const PrivacySettingsPage = lazy(() => import('./pages/PrivacySettingsPage'));
const HelpFeedbackPage = lazy(() => import('./pages/HelpFeedbackPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fff9f8] px-5">
      <div className="rounded-full bg-white px-4 py-2 text-sm text-gray-500 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]">
        页面加载中...
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <PresenceProvider>
          <ErrorBoundary>
            <Router>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<HomePage />} />
                  <Route path="/schedule" element={<SchedulePage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/customers/:id" element={<CustomerDetailPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/me" element={<MePage />} />
                  <Route path="/works" element={<WorksPage />} />
                  <Route path="/shops" element={<ShopManagement />} />
                  <Route path="/shops/edit" element={<ShopEdit />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/home-service-settings" element={<HomeServiceSettingsPage />} />
                  <Route path="/profile-settings" element={<ProfileSettingsPage />} />
                  <Route path="/subscription" element={<SubscriptionPage />} />
                  <Route path="/service-time" element={<ServiceTimePage />} />
                  <Route path="/tag-management" element={<TagManagementPage />} />
                  <Route path="/orders/:id" element={<OrderDetailPage />} />
                  <Route path="/account-security" element={<AccountSecurityPage />} />
                  <Route path="/notification-settings" element={<NotificationSettingsPage />} />
                  <Route path="/privacy-settings" element={<PrivacySettingsPage />} />
                  <Route path="/help-feedback" element={<HelpFeedbackPage />} />
                  <Route path="/about" element={<AboutPage />} />
                </Route>
              </Routes>
            </Suspense>
            </Router>
          </ErrorBoundary>
        </PresenceProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
