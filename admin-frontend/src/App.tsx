import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Technicians from './pages/Technicians';
import Customers from './pages/Customers';
import Quotes from './pages/Quotes';
import Orders from './pages/Orders';
import Revenues from './pages/Revenues';
import Subscriptions from './pages/Subscriptions';
import OperationLogs from './pages/OperationLogs';
import Forbidden from './pages/Forbidden';
import FeatureFlags from './pages/FeatureFlags';
import Roles from './pages/Roles';
import InviteKeys from './pages/InviteKeys';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
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
              <Route index element={<Dashboard />} />
              <Route path="technicians" element={<ProtectedRoute permission="technician:view"><Technicians /></ProtectedRoute>} />
              <Route path="customers" element={<ProtectedRoute permission="customer:view"><Customers /></ProtectedRoute>} />
              <Route path="quotes" element={<ProtectedRoute permission="quote:view"><Quotes /></ProtectedRoute>} />
              <Route path="orders" element={<ProtectedRoute permission="order:view"><Orders /></ProtectedRoute>} />
              <Route path="revenues" element={<ProtectedRoute permission="revenue:view"><Revenues /></ProtectedRoute>} />
              <Route path="subscriptions" element={<ProtectedRoute permission="subscription:view"><Subscriptions /></ProtectedRoute>} />
              <Route path="logs" element={<ProtectedRoute permission="log:view"><OperationLogs /></ProtectedRoute>} />
              <Route path="feature-flags" element={<ProtectedRoute permission="feature_flag:view"><FeatureFlags /></ProtectedRoute>} />
              <Route path="roles" element={<ProtectedRoute permission="role:view"><Roles /></ProtectedRoute>} />
              <Route path="invite-keys" element={<InviteKeys />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
