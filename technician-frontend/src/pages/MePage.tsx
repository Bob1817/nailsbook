import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { ServiceTypeSetupModal } from '../components/ServiceTypeSetupModal';
import { Card } from '../components/base/Card';
import { ordersService } from '../services/orders';
import { customersService } from '../services/customers';
import { buildDashboardSummary, formatMoney, isSameDay, type TechnicianOrder, type TechnicianCustomerSummary } from '../services/technicianData';
import type { ServiceTypeSettings } from '../contexts/authTypes';

const tools = [
  { icon: '💅', label: '服务管理', path: '/services' },
  { icon: '💰', label: '价格设置' },
  { icon: '🚗', label: '上门设置', path: '/home-service-settings' },
  { icon: '⏰', label: '服务时间设置' },
  { icon: '🏪', label: '店铺管理', path: '/shops' },
  { icon: '🖼️', label: '作品管理', path: '/works' },
  { icon: '🏷️', label: '客户标签管理' },
  { icon: '⭐', label: '评价管理' },
];

const settings = [
  { icon: '⚙️', label: '个人设置', path: '/profile-settings' },
  { icon: '🔐', label: '账号与安全' },
  { icon: '🔔', label: '通知设置' },
  { icon: '🔒', label: '隐私设置' },
  { icon: '❓', label: '帮助与反馈' },
  { icon: 'ℹ️', label: '关于我们' },
];

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
  const moduleClassName = 'mb-4 p-4';
  const moduleHeaderClassName = 'mb-4 flex items-center justify-between gap-3';
  const iconPlateClassName = 'flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#ffe9f0] text-lg ring-1 ring-black/[0.03]';

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
  return (
    <div className="min-h-full bg-[#fff9f8] pb-24">
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#ff8aa0_0%,#ff9ab0_52%,#ffc8b2_100%)] px-5 pb-20 pt-12">
        <div className="absolute inset-y-0 right-[-14%] w-48 rounded-full bg-white/[0.08] blur-3xl" />
        <div className="absolute left-[-18%] top-10 h-24 w-40 rounded-full bg-white/[0.08] blur-3xl" />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/18 shadow-[0_10px_24px_rgba(255,255,255,0.08)]">
              {technician?.avatar ? (
                <img src={technician.avatar} alt={technician.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">{technician?.name?.charAt(0) || '美'}</span>
              )}
            </div>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[1.42rem] font-semibold tracking-[-0.03em] text-white">美甲师·{technician?.name || '小美'}</h1>
                <span className="rounded-full bg-white/[0.16] px-2.5 py-1 text-[11px] leading-none text-white/90">
                  {technician?.status === 'active' ? '接单中' : '暂停中'}
                </span>
              </div>
              <p className="mt-2 text-[0.95rem] leading-none text-white/82">{technician?.phone || '未绑定手机号'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/[0.14] bg-white/10 p-3.5 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isAcceptingOrders ? 'animate-pulse bg-emerald-300' : 'bg-white/70'}`}></div>
              <span className="text-sm font-medium text-white">{isAcceptingOrders ? '当前接单中' : '当前已暂停接单'}</span>
            </div>
            <div className="flex items-center gap-2">
              {technician?.homeService && (
                <span className="rounded-full bg-white/18 px-2.5 py-1 text-[10px] text-white/90">🚗 上门</span>
              )}
              {technician?.shopService && (
                <span className="rounded-full bg-white/18 px-2.5 py-1 text-[10px] text-white/90">🏪 到店</span>
              )}
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] leading-none text-white/75">
                {isLoading ? '同步中' : `客户数 ${customers.length}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-0">
        <Card className="relative z-10 -mt-10 mb-4 p-4 shadow-[0_14px_32px_rgba(29,35,53,0.08)]">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.todayOrders.length}</p>
              <p className="mt-1 text-xs text-gray-500">今日预约</p>
            </div>
            <div className="border-x border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{weekOrders.length}</p>
              <p className="mt-1 text-xs text-gray-500">本周预约</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-pink-500">{customers.length}</p>
              <p className="mt-1 text-xs text-gray-500">客户总数</p>
            </div>
          </div>
        </Card>

        <Card className={moduleClassName}>
          <div className={moduleHeaderClassName}>
            <h2 className="text-[18px] font-semibold text-gray-900">收入统计</h2>
            <span className="text-xs text-gray-400">按当前订单数据汇总</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[18px] bg-[#ffe9f0] p-3.5 ring-1 ring-[#ffe6ec]">
              <p className="text-xs text-gray-500">今日已完成收入</p>
              <p className="mt-1 text-[1.65rem] font-semibold tracking-[-0.03em] text-pink-500">{formatMoney(summary.todayIncome)}</p>
            </div>
            <div className="rounded-[18px] bg-[#fbfbfc] p-3.5 ring-1 ring-black/[0.03]">
              <p className="text-xs text-gray-500">今日预计收入</p>
              <p className="mt-1 text-[1.65rem] font-semibold tracking-[-0.03em] text-gray-900">{formatMoney(summary.expectedIncome)}</p>
            </div>
            <div className="rounded-[18px] bg-[#fbfbfc] p-3.5 ring-1 ring-black/[0.03]">
              <p className="text-xs text-gray-500">本月预约金额</p>
              <p className="mt-1 text-[1.65rem] font-semibold tracking-[-0.03em] text-gray-900">{formatMoney(monthRevenue)}</p>
            </div>
            <div className="rounded-[18px] bg-[#fbfbfc] p-3.5 ring-1 ring-black/[0.03]">
              <p className="text-xs text-gray-500">累计完成单量</p>
              <p className="mt-1 text-[1.65rem] font-semibold tracking-[-0.03em] text-pink-500">{completedCount}</p>
            </div>
          </div>
        </Card>

        <Card className={moduleClassName}>
          <div className={moduleHeaderClassName}>
            <h2 className="text-[18px] font-semibold text-gray-900">我的订单</h2>
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="text-xs text-pink-500 font-medium"
            >
              全部订单
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '待报价', value: pendingQuoteCount, status: 'pending_quote' },
              { label: '待确认', value: pendingConfirmCount, status: 'pending_confirm' },
              { label: '待上门', value: pendingHomeCount, status: 'pending_home' },
              { label: '待到店', value: pendingShopCount, status: 'pending_shop' },
              { label: '服务中', value: inProgressCount, status: 'in_progress' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(`/orders?status=${item.status}`)}
                className="flex items-center gap-1.5 rounded-full bg-[#fff9f8] px-3 py-2 ring-1 ring-[#f2e6ec] min-h-[44px] transition-colors active:bg-[#ffe9f0]"
              >
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                {item.value > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white font-semibold">
                    {item.value}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>

        <Card className={moduleClassName}>
          <div className={moduleHeaderClassName}>
            <h2 className="text-[18px] font-semibold text-gray-900">常用工具</h2>
            <span className="text-xs text-gray-400">常用配置入口</span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {tools.map((tool) => (
              <button
                key={tool.label}
                onClick={() => tool.path && navigate(tool.path)}
                className="flex flex-col items-center gap-2 rounded-[18px] bg-[#fff9f8] px-1 py-3 ring-1 ring-[#f2e6ec] transition-colors active:bg-gray-50 min-h-[44px]"
              >
                <div className={`${iconPlateClassName} text-gray-700`}>{tool.icon}</div>
                <span className="text-center text-xs text-gray-600">{tool.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className={moduleClassName}>
          <div className={moduleHeaderClassName}>
            <div>
              <h2 className="text-[18px] font-semibold text-gray-900">邀请码分享</h2>
              <p className="mt-1 text-xs text-gray-500">把邀请码或链接发给客户，客户可直接进入绑定流程。</p>
            </div>
            <span className="rounded-full bg-[#ffe9f0] px-3 py-1 text-[11px] font-medium leading-none text-pink-500">
              邀请客户
            </span>
          </div>
          <div className="rounded-[20px] bg-[#fff7fa] p-3.5">
            <div className="flex items-center justify-between gap-3 rounded-[16px] bg-white px-3.5 py-3">
              <div>
                <p className="text-xs text-gray-400">邀请码</p>
                <p className="mt-1 text-[1.1rem] font-bold tracking-[0.18em] text-gray-900">
                  {invitationCode || '暂未生成'}
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-[16px] bg-white px-3.5 py-3">
              <p className="text-xs text-gray-400">分享链接</p>
              {inviteLink ? (
                <a
                  href={inviteLink}
                  className="mt-1 block break-all text-sm leading-6 text-pink-500"
                >
                  {inviteLink}
                </a>
              ) : (
                <p className="mt-1 text-sm leading-6 text-gray-500">暂无可用分享链接</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="mb-4 overflow-hidden p-0">
          <div className="px-4 pt-4">
            <div className={moduleHeaderClassName}>
              <div>
                <h2 className="text-[18px] font-semibold text-gray-900">设置</h2>
                <p className="mt-1 text-xs text-gray-500">账号、服务类型与常用偏好入口</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowServiceTypeModal(true)}
            className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3.5 text-left transition-colors active:bg-gray-50"
          >
            <span className={iconPlateClassName}>🛠️</span>
            <div className="flex-1">
              <span className="text-left text-gray-700">服务类型设置</span>
              <div className="mt-1 flex gap-2">
                {technician?.homeService && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#ffe9f0] text-pink-500 rounded">上门</span>
                )}
                {technician?.shopService && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded">到店</span>
                )}
                {!technician?.homeService && !technician?.shopService && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">未设置</span>
                )}
              </div>
            </div>
            <svg className="h-5 w-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {settings.map((item) => (
            <button
              key={item.label}
              onClick={() => item.path && navigate(item.path)}
              className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3.5 text-left transition-colors active:bg-gray-50 last:border-0"
            >
              <span className={iconPlateClassName}>{item.icon}</span>
              <span className="flex-1 text-left text-gray-700">{item.label}</span>
              <svg className="h-5 w-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </Card>

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
          className="w-full rounded-[24px] bg-white py-3 font-medium text-red-500 shadow-[0_8px_24px_rgba(29,35,53,0.04)] ring-1 ring-black/[0.04] transition-colors active:bg-red-50 min-h-[48px]"
        >
          退出登录
        </button>
      </div>
    </div>
  );
};
