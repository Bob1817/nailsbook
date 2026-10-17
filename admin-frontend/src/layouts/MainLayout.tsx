import React, { useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  AppstoreOutlined,
  CalendarOutlined,
  CrownOutlined,
  DashboardOutlined,
  DollarOutlined,
  FlagOutlined,
  FormOutlined,
  HistoryOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  NotificationOutlined,
  PictureOutlined,
  RocketOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
  WechatOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

interface NavigationItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  permission?: string;
  superAdmin?: boolean;
}

interface NavigationGroup {
  key: string;
  icon: React.ReactNode;
  label: string;
  children: NavigationItem[];
}

const navigationGroups: NavigationGroup[] = [
  {
    key: 'operation', icon: <DashboardOutlined />, label: '运营总览', children: [
      { key: '/', icon: <DashboardOutlined />, label: '数据看板', permission: 'dashboard:view' },
    ],
  },
  {
    key: 'people', icon: <TeamOutlined />, label: '用户与入驻', children: [
      { key: '/applications', icon: <FormOutlined />, label: '美甲师申请', permission: 'application:view' },
      { key: '/technicians', icon: <TeamOutlined />, label: '美甲师管理', permission: 'technician:view' },
      { key: '/customers', icon: <UserOutlined />, label: '客户管理', permission: 'customer:view' },
      { key: '/invite-keys', icon: <KeyOutlined />, label: '邀请密钥', permission: 'technician:create' },
    ],
  },
  {
    key: 'business', icon: <DollarOutlined />, label: '交易与财务', children: [
      { key: '/orders', icon: <CalendarOutlined />, label: '预约管理', permission: 'booking:view' },
      { key: '/revenues', icon: <DollarOutlined />, label: '收入管理', permission: 'revenue:view' },
      { key: '/subscriptions', icon: <CrownOutlined />, label: '订阅管理', permission: 'subscription:view' },
    ],
  },
  {
    key: 'content', icon: <AppstoreOutlined />, label: '内容与风控', children: [
      { key: '/works', icon: <PictureOutlined />, label: '作品管理', permission: 'work:view' },
      { key: '/comments', icon: <MessageOutlined />, label: '评论管理', permission: 'comment:view' },
      { key: '/reports', icon: <WarningOutlined />, label: '举报队列', permission: 'report:view' },
      { key: '/feedback', icon: <NotificationOutlined />, label: '问题反馈', permission: 'feedback:view' },
      { key: '/account-deletions', icon: <SafetyOutlined />, label: '账号注销', permission: 'account-deletion:view' },
    ],
  },
  {
    key: 'platform', icon: <WechatOutlined />, label: '微信与发布', children: [
      { key: '/wechat-messages', icon: <MessageOutlined />, label: '公众号消息', permission: 'feature_flag:view' },
      { key: '/wechat-config', icon: <SettingOutlined />, label: '微信能力配置', permission: 'feature_flag:view' },
      { key: '/wechat-official', icon: <WechatOutlined />, label: '公众号配置', permission: 'feature_flag:view' },
      { key: '/launch-config', icon: <RocketOutlined />, label: '首期上线配置', permission: 'feature_flag:view' },
      { key: '/feature-flags', icon: <FlagOutlined />, label: '功能开关', permission: 'feature_flag:view' },
    ],
  },
  {
    key: 'system', icon: <SafetyOutlined />, label: '系统与审计', children: [
      { key: '/admin-users', icon: <UserOutlined />, label: '管理员账号', superAdmin: true },
      { key: '/roles', icon: <SafetyOutlined />, label: '角色权限', superAdmin: true },
      { key: '/logs', icon: <HistoryOutlined />, label: '操作日志', permission: 'log:view' },
    ],
  },
];

const MainLayout: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const mobile = !screens.md;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeGroup = navigationGroups.find(group => group.children.some(item => item.key === location.pathname))?.key;
  const [openGroups, setOpenGroups] = useState<string[]>([activeGroup || 'operation']);

  useEffect(() => {
    setMobileMenuOpen(false);
    if (activeGroup) setOpenGroups([activeGroup]);
  }, [activeGroup, location.pathname]);

  const menuItems = useMemo<MenuProps['items']>(() => navigationGroups
    .map(group => {
      const children = group.children.filter(item => {
        if (item.superAdmin && user?.roleCode !== 'super_admin') return false;
        return !item.permission || hasPermission(item.permission);
      });
      if (!children.length) return null;
      return {
        key: group.key,
        icon: group.icon,
        label: group.label,
        children: children.map(({ key, icon, label }) => ({ key, icon, label })),
      };
    })
    .filter(Boolean) as MenuProps['items'], [hasPermission, user?.roleCode]);

  const brand = <div className="admin-brand">{collapsed && !mobile ? 'ON' : 'OnlyNail 管理后台'}</div>;
  const navigation = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname]}
      openKeys={openGroups}
      onOpenChange={keys => setOpenGroups(keys.slice(-1))}
      items={menuItems}
      onClick={({ key }) => navigate(key)}
    />
  );
  const userMenuItems = {
    items: [
      { key: 'profile', label: user?.realName || user?.username },
      { key: 'role', label: `角色：${user?.roleName || '-'}`, disabled: true },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout },
    ],
  };

  return (
    <Layout className="admin-shell">
      {!mobile && (
        <Sider trigger={null} collapsible collapsed={collapsed} width={224} collapsedWidth={80} className="admin-sidebar">
          {brand}
          {navigation}
        </Sider>
      )}
      <Drawer
        placement="left"
        size={288}
        open={mobile && mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        styles={{ body: { padding: 0, background: 'var(--nb-action)' }, header: { display: 'none' } }}
      >
        {brand}
        {navigation}
      </Drawer>
      <Layout className="admin-main" style={{ marginLeft: mobile ? 0 : collapsed ? 80 : 224 }}>
        <Header className="admin-topbar">
          <Button
            type="text"
            aria-label={mobile ? '打开导航' : collapsed ? '展开导航' : '收起导航'}
            icon={mobile || collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => mobile ? setMobileMenuOpen(true) : setCollapsed(current => !current)}
          />
          <Dropdown menu={userMenuItems} placement="bottomRight">
            <button type="button" className="admin-user-menu">
              <Avatar icon={<UserOutlined />} />
              {!mobile && <span>{user?.realName || user?.username}</span>}
            </button>
          </Dropdown>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
