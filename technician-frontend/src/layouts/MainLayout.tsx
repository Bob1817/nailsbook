import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface NavItem {
  path: string;
  label: string;
  exact?: boolean;
}

const CREATOR_NAV: NavItem[] = [
  { path: '/', label: '创作首页', exact: true },
  { path: '/works', label: '作品工坊' },
  { path: '/analytics', label: '数据中心' },
  { path: '/hero-recommendations', label: '主推推荐' },
  { path: '/customers', label: '客户档案' },
  { path: '/services', label: '主页与服务' },
];

const ROUTE_TITLES: Record<string, string> = {
  '/': '创作首页概览',
  '/works': '作品工坊',
  '/analytics': '数据中心',
  '/hero-recommendations': '主页主推推荐',
  '/customers': '客户档案工作台',
  '/services': '主页与服务规则',
  '/profile-settings': '个人资料设置',
};

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { technician, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pageTitle =
    ROUTE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/works') ? '作品工坊' : 'OnlyNail 美甲师管理后台');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between px-4 py-5">
      <div>
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--nb-action)] text-xs font-semibold text-[var(--nb-inverse)]">
            ON
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--nb-ink)]">OnlyNail</div>
            <div className="text-[11px] text-[var(--nb-muted)]">美甲师管理后台</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            navigate('/works/new');
          }}
          className="mb-5 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[var(--nb-action)] px-4 text-sm font-medium text-[var(--nb-inverse)] transition active:bg-[var(--nb-action-pressed)]"
        >
          + 发布新作品
        </button>

        <nav className="space-y-1" aria-label="创作者中心导航">
          {CREATOR_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex min-h-[44px] items-center rounded-xl px-3.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-[var(--nb-active-surface)] text-[var(--nb-ink)]'
                    : 'text-[var(--nb-secondary)] hover:bg-[var(--nb-page)] hover:text-[var(--nb-ink)]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="rounded-xl border border-[var(--nb-line)] bg-[var(--nb-page)] p-3 text-xs leading-relaxed text-[var(--nb-muted)]">
        接单确认、快捷报价与日程提醒，请使用微信小程序随身处理。
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] bg-[var(--nb-page)] text-[var(--nb-ink)]">
      {/* Desktop / tablet sidebar */}
      <aside className="hidden w-52 shrink-0 border-r border-[var(--nb-line)] bg-[var(--nb-surface)] md:block lg:w-60">
        <div className="sticky top-0 h-[100dvh]">{renderSidebarContent()}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 bg-[var(--nb-surface)] shadow-xl">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-[var(--nb-line)] bg-[var(--nb-surface)] px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[var(--nb-line)] text-sm text-[var(--nb-ink)] md:hidden"
              aria-label="打开菜单"
            >
              菜单
            </button>
            <h1 className="text-base font-semibold text-[var(--nb-ink)]">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              {technician?.avatar ? (
                <img
                  src={technician.avatar}
                  alt={technician.name}
                  className="h-7 w-7 rounded-full border border-[var(--nb-line)] object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--nb-pressed)] text-xs font-medium text-[var(--nb-ink)]">
                  {technician?.name?.slice(0, 1) || '美'}
                </div>
              )}
              <span className="text-sm font-medium text-[var(--nb-ink)]">
                {technician?.name || '美甲师'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[36px] rounded-lg border border-[var(--nb-line)] px-3 text-xs font-medium text-[var(--nb-secondary)] transition hover:bg-[var(--nb-page)]"
            >
              退出
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1360px] flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
