import React, { useState } from 'react';
import { Layout, Menu, Dropdown, Avatar, Button } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  FileTextOutlined,
  CalendarOutlined,
  DollarOutlined,
  CrownOutlined,
  HistoryOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '数据看板',
      permission: 'dashboard:view',
    },
    {
      key: '/technicians',
      icon: <TeamOutlined />,
      label: '美甲师管理',
      permission: 'technician:view',
    },
    {
      key: '/customers',
      icon: <UserOutlined />,
      label: '客户管理',
      permission: 'customer:view',
    },
    {
      key: '/quotes',
      icon: <FileTextOutlined />,
      label: '报价管理',
      permission: 'quote:view',
    },
    {
      key: '/orders',
      icon: <CalendarOutlined />,
      label: '订单管理',
      permission: 'order:view',
    },
    {
      key: '/revenues',
      icon: <DollarOutlined />,
      label: '收入管理',
      permission: 'revenue:view',
    },
    {
      key: '/subscriptions',
      icon: <CrownOutlined />,
      label: '订阅管理',
      permission: 'subscription:view',
    },
    {
      key: '/logs',
      icon: <HistoryOutlined />,
      label: '操作日志',
      permission: 'log:view',
    },
    {
      key: '/feature-flags',
      icon: <FlagOutlined />,
      label: '功能开关',
      permission: 'feature_flag:view',
    },
  ];

  const filteredMenuItems = menuItems.filter(
    item => !item.permission || hasPermission(item.permission)
  );

  const userMenuItems = {
    items: [
      { key: 'profile', label: <span>{user?.realName || user?.username}</span> },
      { key: 'role', label: <span>角色: {user?.roleName}</span> },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 16 : 20,
          fontWeight: 'bold',
        }}>
          {collapsed ? '美甲' : '美甲管理系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={filteredMenuItems.map(item => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
          }))}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16 }}
          />
          <Dropdown menu={userMenuItems} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.realName || user?.username}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8, minHeight: 'calc(100vh - 112px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
