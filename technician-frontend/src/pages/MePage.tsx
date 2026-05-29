import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { ServiceTypeSetupModal } from '../components/ServiceTypeSetupModal';
import { ordersService } from '../services/orders';
import { customersService } from '../services/customers';
import { buildDashboardSummary, formatMoney, type TechnicianOrder, type TechnicianCustomerSummary } from '../services/technicianData';
import { getCurrentPlan, isTrialActive, getTrialDaysRemaining } from '../services/subscription';
import type { ServiceTypeSettings } from '../contexts/authTypes';

const tools = [
  { icon: '💅', label: '服务管理', path: '/services' },
  { icon: '💰', label: '价格设置' },
  { icon: '🚗', label: '上门设置', path: '/home-service-settings' },
  { icon: '⏰', label: '服务时间', path: '/service-time' },
  { icon: '🏪', label: '店铺管理', path: '/shops' },
  { icon: '🖼️', label: '作品管理', path: '/works' },
  { icon: '🏷️', label: '标签管理', path: '/tag-management' },
  { icon: '⭐', label: '评价管理' },
];

const settings = [
  { icon: '⚙️', label: '个人设置', path: '/profile-settings' },
  { icon: '🔐', label: '账号与安全', path: '/account-security' },
  { icon: '🔔', label: '通知设置', path: '/notification-settings' },
  { icon: '🔒', label: '隐私设置', path: '/privacy-settings' },
  { icon: '❓', label: '帮助与反馈', path: '/help-feedback' },
  { icon: 'ℹ️', label: '关于我们', path: '/about' },
];

// 统一区块样式，对齐首页的通透卡片风格
const sectionClassName = 'rounded-[30px] bg-[#FFFDFD] p-5 shadow-[0_18px_36px_rgba(36,27,41,0.05)]';
const sectionTitleClassName = 'text-[16px] font-semibold text-[#1f2230]';
const sectionHeaderClassName = 'mb-4 flex items-center justify-between gap-3';
const iconPlateClassName = 'flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#fff1f6] text-lg';

export const MePage: React.FC = () => {
  const navigate = useNavigate();
  const { technician, logout, updateServiceType } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState<TechnicianOrder[]>([]);
  const [customers, setCustomers] = useState<TechnicianCustomerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
  const invitationCode = technician?.invitationCode;
  const inviteLink = invitationCode ? `${window.location.origin}/invite?invite_code=${encodeURIComponent(invitationCode)}` : '';

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      try {
        const [nextOrders, nextCustomers] = await Promise.all([
          ordersService.list({ technicianId: technician?.id }),
          customersService.list({ technicianId: technician?.id }),
        ]);

        if (!cancelled) {
          setOrders(nextOrders);
          setCustomers(nextCustomers);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setOrders([]);
          setCustomers([]);
          setIsLoading(false);
          toast.error('个人中心数据加载失败，请稍后重试。');
        }
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [technician?.id, toast]);

  const summary = useMemo(() => buildDashboardSummary(orders, new Date()), [orders]);
  const weekOrders = useMemo(() => {
    const today = new Date();
    return orders.filter((order) => {
      const orderDate = new Date(order.startTime);
      const diff = orderDate.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000;
    });
  }, [orders]);
  const monthRevenue = useMemo(() => {
    const now = new Date();
    return orders
      .filter((order) => {
        const date = new Date(order.startTime);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      })
      .reduce((sum, order) => sum + order.price, 0);
  }, [orders]);
  const completedCount = orders.filter((order) => order.status === 'completed').length;
  const pendingQuoteCount = orders.filter((order) => order.status === 'pending_quote').length;
  const pendingConfirmCount = orders.filter((order) => order.status === 'pending_confirm').length;
  const pendingHomeCount = orders.filter((order) => order.status === 'pending_home').length;
  const pendingShopCount = orders.filter((order) => order.status === 'pending_shop').length;
  const inProgressCount = orders.filter((order) => order.status === 'in_progress').length;
  const isAcceptingOrders = technician?.status === 'active';
  const subscription = technician?.subscription;
  const currentPlan = getCurrentPlan(subscription);
  const trialActive = isTrialActive(subscription);
  const trialDaysLeft = getTrialDaysRemaining(subscription);

  const headerStats = [
    { label: '今日预约', value: summary.todayOrders.length },
    { label: '本周预约', value: weekOrders.length },
    { label: '客户总数', value: isLoading ? '—' : customers.length },
  ];

  const incomeStats = [
    { label: '今日已完成', value: formatMoney(summary.todayIncome), accent: true },
    { label: '今日预计', value: formatMoney(summary.expectedIncome) },
    { label: '本月预约', value: formatMoney(monthRevenue) },
    { label: '累计完成单量', value: String(completedCount) },
  ];

  const appointmentStatuses = [
    { icon: '💬', label: '待报价', value: pendingQuoteCount, status: 'pending_quote' },
    { icon: '⏳', label: '待确认', value: pendingConfirmCount, status: 'pending_confirm' },
    { icon: '🚗', label: '待上门', value: pendingHomeCount, status: 'pending_home' },
    { icon: '🏪', label: '待到店', value: pendingShopCount, status: 'pending_shop' },
    { icon: '💅', label: '服务中', value: inProgressCount, status: 'in_progress' },
  ];

  const copyToClipboard = (text: string, message: string) => {
    void navigator.clipboard.writeText(text).then(() => toast.success(message));
  };

  return (
    <div className="min-h-full overflow-x-hidden bg-[#fff9f8] pb-24">
      {/* ===== Header ===== */}
      <div className="relative overflow-hidden bg-[linear-gradient(145deg,#FF6FA2_0%,#FF6B9B_34%,#FF81A4_68%,#FFB387_100%)] px-5 pb-6 pt-12">
        <div className="absolute inset-y-0 right-[-14%] w-48 rounded-full bg-white/[0.10] blur-3xl" />
        <div className="absolute left-[-18%] top-10 h-24 w-40 rounded-full bg-white/[0.10] blur-3xl" />

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-white/15 shadow-[0_10px_24px_rgba(112,35,71,0.18)]">
            {technician?.avatar ? (
              <img src={technician.avatar} alt={technician.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{technician?.name?.charAt(0) || '美'}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[1.42rem] font-semibold tracking-[-0.03em] text-white [text-shadow:0_1px_3px_rgba(112,35,71,0.22)]">美甲师·{technician?.name || '小美'}</h1>
              <button
                type="button"
                onClick={() => navigate('/subscription')}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] leading-none font-medium transition-colors ${
                  trialActive
                    ? 'bg-[#FFE066]/30 text-[#FFF4B8] ring-1 ring-[#FFE066]/50'
                    : currentPlan.code !== 'free'
                      ? 'bg-white/25 text-white ring-1 ring-white/30'
                      : 'bg-white/20 text-white ring-1 ring-white/25'
                }`}
              >
                <span className="text-[10px]">
                  {currentPlan.code === 'studio_plus' ? '👑' : currentPlan.code === 'pro' ? '💎' : '✨'}
                </span>
                {trialActive ? `试用 ${trialDaysLeft}天` : currentPlan.name}
              </button>
            </div>
            <p className="mt-1.5 text-[0.95rem] leading-none text-white/95 [text-shadow:0_1px_2px_rgba(112,35,71,0.20)]">{technician?.city || '未设置城市'}</p>
          </div>
        </div>

        {/* 接单状态 */}
        <div className="mt-5 flex items-center justify-between rounded-[20px] border border-white/25 bg-white/[0.18] px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isAcceptingOrders ? 'animate-pulse bg-emerald-300' : 'bg-white/80'}`} />
            <span className="text-sm font-semibold text-white [text-shadow:0_1px_2px_rgba(112,35,71,0.18)]">{isAcceptingOrders ? '接单中' : '休息中'}</span>
          </div>
          {technician?.homeService && (
            <span className="rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-medium text-white">可上门</span>
          )}
        </div>

        {/* 概览数据并入头部 */}
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {headerStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[18px] border border-white/25 bg-white/[0.20] px-3 py-2.5 text-center backdrop-blur"
            >
              <p className="text-[1.5rem] font-bold tracking-[-0.02em] text-white [text-shadow:0_1px_3px_rgba(112,35,71,0.22)]">{stat.value}</p>
              <p className="mt-0.5 text-[11px] font-medium text-white/90 [text-shadow:0_1px_2px_rgba(112,35,71,0.16)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Body ===== */}
      <div className="space-y-4 px-5 pt-4">
        {/* 订阅入口 */}
        <button
          type="button"
          onClick={() => navigate('/subscription')}
          className="flex w-full items-center gap-3 rounded-[24px] bg-[#FFFDFD] px-4 py-3.5 text-left shadow-[0_18px_36px_rgba(36,27,41,0.05)] transition-colors active:bg-[#fff7fa]"
        >
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${
            trialActive
              ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500]'
              : currentPlan.code !== 'free'
                ? 'bg-gradient-to-br from-[#FF5E93] to-[#FF8AA0]'
                : 'bg-[#f2f0f3]'
          }`}>
            <span className="text-[18px]">
              {currentPlan.code === 'studio_plus' ? '👑' : currentPlan.code === 'pro' ? '💎' : '✨'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#1f2230]">{currentPlan.name}</span>
              {trialActive && (
                <span className="rounded-full bg-[#FFF1E0] px-2 py-0.5 text-[10px] font-semibold text-[#C9860A]">
                  试用 {trialDaysLeft}天后到期
                </span>
              )}
              {currentPlan.code !== 'free' && !trialActive && subscription?.expiredAt && (
                <span className="rounded-full bg-[#EEF9F1] px-2 py-0.5 text-[10px] font-semibold text-[#31B46C]">有效</span>
              )}
              {currentPlan.code === 'free' && !trialActive && (
                <span className="rounded-full bg-[#f2f0f3] px-2 py-0.5 text-[10px] font-semibold text-[#8d8590]">基础版</span>
              )}
            </div>
            <p className="mt-0.5 text-[12px] text-[#7f7681]">
              {trialActive
                ? '试用期享受 Studio Plus 全部功能，到期自动降级'
                : currentPlan.code !== 'free'
                  ? `有效期至 ${subscription?.expiredAt ? new Date(subscription.expiredAt).toLocaleDateString('zh-CN') : '—'}`
                  : '升级套餐解锁更多功能'}
            </p>
          </div>
          <svg className="h-5 w-5 shrink-0 text-[#c9bec6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6l6 6-6 6" />
          </svg>
        </button>

        {/* 收入统计 */}
        <section className={sectionClassName}>
          <div className={sectionHeaderClassName}>
            <h2 className={sectionTitleClassName}>收入统计</h2>
            <span className="text-xs text-[#a89ba3]">按当前预约数据汇总</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {incomeStats.map((item) => (
              <div key={item.label} className="rounded-[16px] border border-[#f2e6ec] bg-white px-3.5 py-3">
                <p className="text-[11px] text-[#a08e98]">{item.label}</p>
                <p className={`mt-1 text-[1.3rem] font-semibold tracking-[-0.02em] ${item.accent ? 'text-[#FF5E93]' : 'text-[#1f2230]'}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 我的预约 */}
        <section className={sectionClassName}>
          <div className={sectionHeaderClassName}>
            <h2 className={sectionTitleClassName}>我的预约</h2>
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="text-xs font-medium text-[#FF5E93]"
            >
              全部预约
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {appointmentStatuses.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(`/orders?status=${item.status}`)}
                className="flex min-h-[44px] flex-col items-center gap-1.5 rounded-[16px] border border-[#f2e6ec] bg-[#fff9f8] px-1 py-3 transition-colors active:bg-[#fff1f6]"
              >
                <div className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-lg shadow-[0_6px_14px_rgba(29,35,53,0.04)]">
                  <span>{item.icon}</span>
                  {item.value > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff4962] text-[10px] text-white">
                      {item.value}
                    </span>
                  )}
                </div>
                <span className="text-center text-[11px] text-[#716776]">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 常用工具 */}
        <section className={sectionClassName}>
          <div className={sectionHeaderClassName}>
            <h2 className={sectionTitleClassName}>常用工具</h2>
            <span className="text-xs text-[#a89ba3]">常用配置入口</span>
          </div>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4">
            {tools.map((tool) => (
              <button
                key={tool.label}
                type="button"
                onClick={() => tool.path && navigate(tool.path)}
                className="flex min-h-[44px] flex-col items-center gap-2"
              >
                <div className={`${iconPlateClassName}`}>{tool.icon}</div>
                <span className="text-center text-xs text-[#716776]">{tool.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 邀请码分享 */}
        <section className={sectionClassName}>
          <div className={sectionHeaderClassName}>
            <div className="min-w-0">
              <h2 className={sectionTitleClassName}>邀请客户</h2>
              <p className="mt-1 text-xs text-[#a89ba3]">把邀请码或链接发给客户即可绑定</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[#f2e6ec] bg-[#fff9f8] px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-[#a08e98]">邀请码</p>
              <p className="mt-1 text-[1.1rem] font-bold tracking-[0.18em] text-[#1f2230]">
                {invitationCode || '暂未生成'}
              </p>
            </div>
            {invitationCode && (
              <button
                type="button"
                onClick={() => copyToClipboard(invitationCode, '邀请码已复制')}
                className="shrink-0 whitespace-nowrap rounded-full bg-[#fff1f6] px-3.5 py-2 text-[12px] font-semibold text-[#FF5E93] active:bg-[#ffe4ee]"
              >
                复制
              </button>
            )}
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-3 rounded-[16px] border border-[#f2e6ec] bg-[#fff9f8] px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-[#a08e98]">分享链接</p>
              {inviteLink ? (
                <p className="mt-1 truncate text-sm leading-6 text-[#FF5E93]">{inviteLink}</p>
              ) : (
                <p className="mt-1 text-sm leading-6 text-[#9a909a]">暂无可用分享链接</p>
              )}
            </div>
            {inviteLink && (
              <button
                type="button"
                onClick={() => copyToClipboard(inviteLink, '分享链接已复制')}
                className="shrink-0 whitespace-nowrap rounded-full bg-[#fff1f6] px-3.5 py-2 text-[12px] font-semibold text-[#FF5E93] active:bg-[#ffe4ee]"
              >
                复制
              </button>
            )}
          </div>
        </section>

        {/* 设置 */}
        <section className={`${sectionClassName} overflow-hidden p-0`}>
          <div className="px-5 pt-5">
            <h2 className={sectionTitleClassName}>设置</h2>
            <p className="mt-1 text-xs text-[#a89ba3]">账号、服务类型与常用偏好</p>
          </div>
          <div className="mt-4">
            <button
              onClick={() => setShowServiceTypeModal(true)}
              className="flex w-full items-center gap-3 border-t border-[#f6eef2] px-5 py-3.5 text-left transition-colors active:bg-[#fff7fa]"
            >
              <span className={iconPlateClassName}>🛠️</span>
              <div className="flex-1">
                <span className="text-left text-[#4d4652]">服务类型设置</span>
                <div className="mt-1 flex gap-2">
                  {technician?.homeService && (
                    <span className="rounded bg-[#fff1f6] px-1.5 py-0.5 text-[10px] text-[#FF5E93]">上门</span>
                  )}
                  {technician?.shopService && (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-500">到店</span>
                  )}
                  {!technician?.homeService && !technician?.shopService && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">未设置</span>
                  )}
                </div>
              </div>
              <svg className="h-5 w-5 text-[#d6ccd3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {settings.map((item) => (
              <button
                key={item.label}
                onClick={() => item.path && navigate(item.path)}
                className="flex w-full items-center gap-3 border-t border-[#f6eef2] px-5 py-3.5 text-left transition-colors active:bg-[#fff7fa]"
              >
                <span className={iconPlateClassName}>{item.icon}</span>
                <span className="flex-1 text-left text-[#4d4652]">{item.label}</span>
                <svg className="h-5 w-5 text-[#d6ccd3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </section>

        {/* Service Type Setup Modal */}
        <ServiceTypeSetupModal
          isOpen={showServiceTypeModal}
          isForceSetup={false}
          onClose={() => setShowServiceTypeModal(false)}
          onSubmit={async (settings: ServiceTypeSettings) => {
            await updateServiceType(settings);
            setShowServiceTypeModal(false);
          }}
          existingShops={technician?.shopAddresses || []}
          onNavigateToShop={() => {
            setShowServiceTypeModal(false);
            navigate('/shops');
          }}
        />

        <button
          onClick={logout}
          className="min-h-[48px] w-full rounded-[24px] bg-[#FFFDFD] py-3 font-medium text-[#ff4962] shadow-[0_18px_36px_rgba(36,27,41,0.05)] transition-colors active:bg-[#fff1f1]"
        >
          退出登录
        </button>
      </div>
    </div>
  );
};
