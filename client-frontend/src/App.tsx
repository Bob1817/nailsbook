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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-[#FF6B8A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/invite" element={<Login />} />

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
          <Route path="/designs" element={<DesignList />} />
          <Route path="/designs/create" element={<CreateDesign />} />
          <Route path="/designs/customize" element={<CustomizeDesign />} />
          <Route path="/designs/:id" element={<DesignDetail />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/direct" element={<ChatDetail />} />
          <Route path="/chat/:conversationId" element={<ChatDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/addresses" element={<AddressList />} />
          <Route path="/profile/addresses/edit" element={<EditAddress />} />
          <Route path="/favorites" element={<MyFavorites />} />
          <Route path="/likes" element={<MyLikes />} />
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
