import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PresenceProvider } from './hooks/usePresence';
import { ToastProvider } from './components/ToastProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import Login from './pages/Login';
import Home from './pages/Home';
import OrderList from './pages/OrderList';
import CreateOrder from './pages/CreateOrder';
import OrderDetail from './pages/OrderDetail';
import Discover from './pages/Discover';
import DesignList from './pages/DesignList';
import CreateDesign from './pages/CreateDesign';
import DesignDetail from './pages/DesignDetail';
import CustomizeDesign from './pages/CustomizeDesign';
import Chat from './pages/Chat';
import ChatDetail from './pages/ChatDetail';
import Profile from './pages/Profile';
import AddressList from './pages/AddressList';
import EditAddress from './pages/EditAddress';
import Welcome from './pages/Welcome';
import WorksPage from './pages/WorksPage';
import WorkDetailPage from './pages/WorkDetailPage';
import MyFavorites from './pages/MyFavorites';
import MyLikes from './pages/MyLikes';
import PublicArtistCard from './pages/PublicArtistCard';
import PublicShopDetail from './pages/PublicShopDetail';
import ArtistWorksPage from './pages/ArtistWorksPage';
import PublicWorkDetail from './pages/PublicWorkDetail';
import ForgotPassword from './pages/ForgotPassword';
import Settings from './pages/Settings';
import HelpFeedback from './pages/HelpFeedback';
import ChangePassword from './pages/ChangePassword';
import NotificationSettings from './pages/NotificationSettings';
import LegalDoc from './pages/LegalDoc';

function AppRoutes() {
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to welcome page if user is authenticated but has no nickname
  useEffect(() => {
    if (isAuthenticated && user && !user.nickname && location.pathname !== '/welcome') {
      navigate('/welcome', { replace: true });
    }
  }, [isAuthenticated, user, location.pathname, navigate]);

  // Capture inviteCode parameter globally and save to localStorage
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const inviteCode = params.get('inviteCode') || params.get('invite_code');
    if (inviteCode) {
      localStorage.setItem('pendingInviteCode', inviteCode);
    }
  }, [location.search]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--nb-page)]">
        <div className="w-8 h-8 border-2 border-[var(--nb-control)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/invite" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/artist/:code" element={<PublicArtistCard />} />
      <Route path="/artist/:code/shops/:index" element={<PublicShopDetail />} />
      <Route path="/artist/:code/works" element={<ArtistWorksPage />} />
      <Route path="/w/:id" element={<PublicWorkDetail />} />

      {/* Welcome Page - for first-time users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/welcome" element={<Welcome />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/orders" element={<OrderList />} />
          <Route path="/orders/create" element={<CreateOrder />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/designs" element={<DesignList />} />
          <Route path="/designs/create" element={<CreateDesign />} />
          <Route path="/designs/customize" element={<CustomizeDesign />} />
          <Route path="/designs/:id" element={<DesignDetail />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/direct" element={<ChatDetail />} />
          <Route path="/chat/:conversationId" element={<ChatDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/technicians" element={<Profile managing />} />
          <Route path="/profile/addresses" element={<AddressList />} />
          <Route path="/profile/addresses/edit" element={<EditAddress />} />
          <Route path="/favorites" element={<MyFavorites />} />
          <Route path="/likes" element={<MyLikes />} />
          <Route path="/profile/settings" element={<Settings />} />
          <Route path="/profile/help" element={<HelpFeedback />} />
          <Route path="/profile/password" element={<ChangePassword />} />
          <Route path="/profile/notifications" element={<NotificationSettings />} />
          <Route path="/profile/legal/:type" element={<LegalDoc />} />
          {/* Works routes - no bottom tab bar */}
          <Route path="/works" element={<WorksPage />} />
          <Route path="/works/:id" element={<WorkDetailPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <PresenceProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ErrorBoundary>
        </PresenceProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
