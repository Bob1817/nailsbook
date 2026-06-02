import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { ServiceTypeSetupModal } from '../components/ServiceTypeSetupModal';
import { Card } from '../components/base/Card';
import { ordersService } from '../services/orders';
import { customersService } from '../services/customers';
import { uploadService } from '../services/upload';
import { buildDashboardSummary, formatMoney, type TechnicianOrder, type TechnicianCustomerSummary } from '../services/technicianData';
import type { ServiceTypeSettings, DaySchedule, ServiceSchedule } from '../contexts/authTypes';

const DAY_LABELS: Record<string, string> = {
  mon: '周一', tue: '周二', wed: '周三', thu: '周四',
  fri: '周五', sat: '周六', sun: '周日',
};
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

function buildDefaultSchedule(): ServiceSchedule {
  const days: Record<string, DaySchedule> = {};
  for (const key of DAY_KEYS) {
    days[key] = { enabled: true, startTime: '10:00', endTime: '21:00' };
  }
  return { days, selectedDates: [] };
}

function mergeSchedule(saved: ServiceSchedule | null | undefined): ServiceSchedule {
  const defaults = buildDefaultSchedule();
  if (!saved?.days) return defaults;
  const merged: Record<string, DaySchedule> = {};
  for (const key of DAY_KEYS) {
    merged[key] = saved.days[key] ?? defaults.days[key];
  }
  return { days: merged, selectedDates: saved.selectedDates ?? [] };
}

interface WorkScheduleModalProps {
  onClose: () => void;
  technician: any;
  updateTechnicianProfile: (profile: any) => Promise<any>;
  toast: any;
}

const WorkScheduleModal: React.FC<WorkScheduleModalProps> = ({ onClose, technician, updateTechnicianProfile, toast }) => {
  const [schedule, setSchedule] = useState<ServiceSchedule>(() => mergeSchedule(technician?.serviceSchedule));
  const [saving, setSaving] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const toggleDay = useCallback((key: string) => {
    setSchedule((prev) => ({
      ...prev,
      days: { ...prev.days, [key]: { ...prev.days[key], enabled: !prev.days[key].enabled } },
    }));
  }, []);

  const updateTime = useCallback((key: string, field: 'startTime' | 'endTime', value: string) => {
    setSchedule((prev) => ({
      ...prev,
      days: { ...prev.days, [key]: { ...prev.days[key], [field]: value } },
    }));
  }, []);

  const toggleDate = useCallback((dateStr: string) => {
    setSchedule((prev) => {
      const dates = prev.selectedDates || [];
      const idx = dates.indexOf(dateStr);
      return {
        ...prev,
        selectedDates: idx >= 0 ? dates.filter((d) => d !== dateStr) : [...dates, dateStr],
      };
    });
  }, []);

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
    const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, dateStr: formatDateStr(d), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, dateStr: formatDateStr(d), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, dateStr: formatDateStr(d), isCurrentMonth: false });
    }
    return days;
  };

  function formatDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTechnicianProfile({ serviceSchedule: schedule });
      toast.success('工作时间已保存');
      onClose();
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const calendarDays = getCalendarDays();
  const todayStr = formatDateStr(new Date());

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[20px] bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3.5">
          <h2 className="text-lg font-bold text-gray-900">工作时间设置</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Part 1: Daily work time */}
        <div className="px-5 pt-4 pb-2">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">每日工作时间段</h3>
          <div className="space-y-2.5">
            {DAY_KEYS.map((key) => {
              const day = schedule.days[key];
              return (
                <div key={key} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                  <button
                    onClick={() => toggleDay(key)}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                      day.enabled ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {DAY_LABELS[key].charAt(1)}
                  </button>
                  <span className={`w-10 text-sm ${day.enabled ? 'text-gray-700' : 'text-gray-400'}`}>
                    {DAY_LABELS[key]}
                  </span>
                  {day.enabled ? (
                    <div className="flex flex-1 items-center gap-1.5">
                      <select
                        value={day.startTime}
                        onChange={(e) => updateTime(key, 'startTime', e.target.value)}
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700"
                      >
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span className="text-xs text-gray-400">至</span>
                      <select
                        value={day.endTime}
                        onChange={(e) => updateTime(key, 'endTime', e.target.value)}
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700"
                      >
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  ) : (
                    <span className="flex-1 text-center text-sm text-gray-400">休息</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Part 2: Calendar date selection */}
        <div className="px-5 pt-4 pb-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">选择可接单日期</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
              >
                <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-medium text-gray-700">
                {calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月
              </span>
              <button
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
              >
                <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          {/* Weekday headers */}
          <div className="mb-1 grid grid-cols-7 gap-1 text-center">
            {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
              <span key={d} className="text-[11px] font-medium text-gray-400">{d}</span>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, dateStr, isCurrentMonth }) => {
              const isSelected = schedule.selectedDates?.includes(dateStr);
              const isPast = dateStr < todayStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => !isPast && toggleDate(dateStr)}
                  disabled={isPast}
                  className={`relative flex h-9 items-center justify-center rounded-lg text-sm transition-colors ${
                    !isCurrentMonth
                      ? 'text-gray-300'
                      : isPast
                        ? 'text-gray-300 cursor-not-allowed'
                        : isSelected
                          ? 'bg-pink-500 text-white font-semibold'
                          : 'text-gray-700 active:bg-gray-100'
                  }`}
                >
                  {date.getDate()}
                  {isSelected && (
                    <svg className="absolute right-0.5 top-0.5 h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-gray-400">选中日期为可接单日，未选中日期为休息日</p>
        </div>

        {/* Save button */}
        <div className="sticky bottom-0 border-t border-gray-100 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-[16px] bg-pink-500 py-3 text-[15px] font-semibold text-white active:bg-pink-600 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
};

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
  { icon: '🔐', label: '账号与安全', path: '/account-security' },
  { icon: '🔔', label: '通知设置', path: '/notification-settings' },
  { icon: '🔒', label: '隐私设置', path: '/privacy-settings' },
  { icon: '❓', label: '帮助与反馈', path: '/help-feedback' },
  { icon: 'ℹ️', label: '关于我们', path: '/about' },
];

export const MePage: React.FC = () => {
  const navigate = useNavigate();
  const { technician, logout, updateServiceType, updateTechnicianProfile } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState<TechnicianOrder[]>([]);
  const [customers, setCustomers] = useState<TechnicianCustomerSummary[]>([]);
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [showWorkScheduleModal, setShowWorkScheduleModal] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const invitationCode = technician?.invitationCode;
  const clientBaseUrl = import.meta.env.VITE_CLIENT_BASE_URL || 'https://m.lunails.cn';
  const inviteLink = invitationCode ? `${clientBaseUrl}/invite?invite_code=${encodeURIComponent(invitationCode)}` : '';
  const moduleClassName = 'mb-4 p-4';
  const moduleHeaderClassName = 'mb-4 flex items-center justify-between gap-3';
  const iconPlateClassName = 'flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#ffe9f0] text-lg ring-1 ring-black/[0.03]';

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [nextOrders, nextCustomers] = await Promise.all([
          ordersService.list({ technicianId: technician?.id }),
          customersService.list({ technicianId: technician?.id }),
        ]);

        if (!cancelled) {
          setOrders(nextOrders);
          setCustomers(nextCustomers);
        }
      } catch {
        if (!cancelled) {
          setOrders([]);
          setCustomers([]);
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

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadService.uploadImage(file);
      await updateTechnicianProfile({ avatar: result.url });
      toast.success('头像更新成功');
      setShowAvatarViewer(false);
    } catch {
      toast.error('头像上传失败，请重试');
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  function handleAvatarClick() {
    if (technician?.avatar) {
      setShowAvatarViewer(true);
    } else {
      avatarInputRef.current?.click();
    }
  }

  return (
    <div className="min-h-full overflow-x-hidden bg-[#fff9f8] pb-24">
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#ff8aa0_0%,#ff9ab0_52%,#ffc8b2_100%)] px-5 pb-10 pt-12">
        <div className="absolute inset-y-0 right-[-14%] w-48 rounded-full bg-white/[0.08] blur-3xl" />
        <div className="absolute left-[-18%] top-10 h-24 w-40 rounded-full bg-white/[0.08] blur-3xl" />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/18 shadow-[0_10px_24px_rgba(255,255,255,0.08)] active:opacity-80"
            >
              {technician?.avatar ? (
                <img src={technician.avatar} alt={technician.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">{technician?.name?.charAt(0) || '美'}</span>
              )}
              {/* 相机图标 */}
              <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-black/40">
                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[1.42rem] font-semibold tracking-[-0.03em] text-white">美甲师·{technician?.name || '小美'}</h1>
                <button
                  type="button"
                  onClick={() => navigate('/profile-settings')}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/25"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
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
              {/* 工作时间设置 */}
              <button
                type="button"
                onClick={() => setShowWorkScheduleModal(true)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/25"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-0">
        {/* Data card - 核心展示 */}
        <Card className="relative z-10 -mt-5 mb-4 p-4 shadow-[0_14px_32px_rgba(29,35,53,0.08)]">
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

        {/* Income card - 核心展示 */}
        <Card className={moduleClassName}>
          <div className={moduleHeaderClassName}>
            <h2 className="text-[18px] font-semibold text-gray-900">收入统计</h2>
            <span className="text-xs text-gray-400">按当前预约数据汇总</span>
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
            <h2 className="text-[18px] font-semibold text-gray-900">我的预约</h2>
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="text-xs text-pink-500 font-medium"
            >
              全部预约
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[
              { icon: '💬', label: '待报价', value: pendingQuoteCount, status: 'pending_quote' },
              { icon: '⏳', label: '待确认', value: pendingConfirmCount, status: 'pending_confirm' },
              { icon: '🚗', label: '待上门', value: pendingHomeCount, status: 'pending_home' },
              { icon: '🏪', label: '待到店', value: pendingShopCount, status: 'pending_shop' },
              { icon: '💅', label: '服务中', value: inProgressCount, status: 'in_progress' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(`/orders?status=${item.status}`)}
                className="relative flex flex-col items-center gap-1.5 rounded-[18px] bg-[#fff9f8] px-1 py-3 ring-1 ring-[#f2e6ec] transition-colors active:bg-gray-50 min-h-[44px]"
              >
                <div className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-lg shadow-[0_6px_14px_rgba(29,35,53,0.04)] ring-1 ring-black/[0.03]">
                  <span>{item.icon}</span>
                  {item.value > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                      {item.value}
                    </span>
                  )}
                </div>
                <span className="text-center text-[11px] text-gray-600">{item.label}</span>
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
            <button
              type="button"
              onClick={() => invitationCode && navigator.clipboard.writeText(invitationCode).then(() => toast.success('邀请码已复制'))}
              className="shrink-0 whitespace-nowrap rounded-full bg-[#ffe9f0] px-3.5 py-1.5 text-[12px] font-semibold text-pink-500 min-h-[32px] active:bg-[#ffd6e4]"
            >
              邀请客户
            </button>
          </div>
          <div className="rounded-[20px] bg-[#fff7fa] p-3.5">
            <div className="flex items-center justify-between gap-3 rounded-[16px] bg-white px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400">邀请码</p>
                <p className="mt-1 text-[1.1rem] font-bold tracking-[0.18em] text-gray-900">
                  {invitationCode || '暂未生成'}
                </p>
              </div>
              {invitationCode && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(invitationCode).then(() => toast.success('邀请码已复制'))}
                  className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#fff1f6] active:bg-[#ffe4ee]"
                >
                  <svg className="h-4 w-4 text-[#FF5E93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] bg-white px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400">分享链接</p>
                {inviteLink ? (
                  <a
                    href={inviteLink}
                    className="mt-1 block truncate text-sm leading-6 text-pink-500"
                  >
                    {inviteLink}
                  </a>
                ) : (
                  <p className="mt-1 text-sm leading-6 text-gray-500">暂无可用分享链接</p>
                )}
              </div>
              {inviteLink && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(inviteLink).then(() => toast.success('分享链接已复制'))}
                  className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#fff1f6] active:bg-[#ffe4ee]"
                >
                  <svg className="h-4 w-4 text-[#FF5E93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
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

      {/* Avatar Viewer Modal */}
      {showAvatarViewer && technician?.avatar && (
        <div
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/90"
          onClick={() => setShowAvatarViewer(false)}
        >
          <img
            src={technician.avatar}
            alt={technician.name}
            className="max-h-[70vh] max-w-[90vw] object-contain"
          />
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }}
              className="flex items-center gap-2 rounded-full bg-white/20 px-5 py-2.5 text-sm font-medium text-white backdrop-blur active:bg-white/30"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              更换头像
            </button>
            <button
              type="button"
              onClick={() => setShowAvatarViewer(false)}
              className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium text-white/70 active:bg-white/20"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* Work Schedule Modal */}
      {showWorkScheduleModal && (
        <WorkScheduleModal
          onClose={() => setShowWorkScheduleModal(false)}
          technician={technician}
          updateTechnicianProfile={updateTechnicianProfile}
          toast={toast}
        />
      )}
    </div>
  );
};
