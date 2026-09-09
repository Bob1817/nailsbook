import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { Card } from '../components/base/Card';
import { ordersService } from '../services/orders';
import { customersService } from '../services/customers';
import { uploadService } from '../services/upload';
import { buildDashboardSummary, formatMoney, type TechnicianOrder, type TechnicianCustomerSummary } from '../services/technicianData';
import type { ServiceSchedule, WorkTimeScheme } from '../contexts/authTypes';
import { normalizeSchedule, daysSummary, genId } from '../utils/workSchedule';
import { SchemeEditorModal } from '../components/SchemeEditorModal';
import { RestDayCalendar } from '../components/RestDayCalendar';


interface WorkScheduleModalProps {
  onClose: () => void;
  technician: { serviceSchedule?: ServiceSchedule | null } | null;
  updateTechnicianProfile: (profile: { serviceSchedule: ServiceSchedule }) => Promise<void>;
  toast: { success: (message: string) => void; error: (message: string) => void };
}

const WorkScheduleModal: React.FC<WorkScheduleModalProps> = ({ onClose, technician, updateTechnicianProfile, toast }) => {
  const [schedule, setSchedule] = useState<ServiceSchedule>(() => normalizeSchedule(technician?.serviceSchedule));
  const [saving, setSaving] = useState(false);
  const [editingScheme, setEditingScheme] = useState<WorkTimeScheme | null>(null);
  const [showRestDayCalendar, setShowRestDayCalendar] = useState(false);

  const handleAddScheme = () => {
    const newScheme: WorkTimeScheme = {
      id: genId(),
      label: `方案${(schedule.schemes?.length || 0) + 1}`,
      startTime: '10:00',
      endTime: '21:00',
      days: [],
    };
    setSchedule((prev) => ({
      ...prev,
      schemes: [...(prev.schemes || []), newScheme],
    }));
    setEditingScheme(newScheme);
  };

  const handleSetActive = (schemeId: string) => {
    setSchedule((prev) => ({
      ...prev,
      activeSchemeId: schemeId,
    }));
  };

  const handleSaveScheme = (updatedScheme: WorkTimeScheme) => {
    setSchedule((prev) => ({
      ...prev,
      schemes: (prev.schemes || []).map((s) =>
        s.id === updatedScheme.id ? updatedScheme : s
      ),
    }));
    setEditingScheme(null);
  };

  const handleDeleteScheme = () => {
    if (!editingScheme) return;

    const newSchemes = (schedule.schemes || []).filter((s) => s.id !== editingScheme.id);
    const newActiveId = editingScheme.id === schedule.activeSchemeId
      ? (newSchemes[0]?.id || null)
      : schedule.activeSchemeId;

    setSchedule((prev) => ({
      ...prev,
      schemes: newSchemes,
      activeSchemeId: newActiveId,
    }));
    setEditingScheme(null);
  };

  const handleRestDayConfirm = (dates: string[]) => {
    setSchedule((prev) => ({
      ...prev,
      restDays: dates,
    }));
    setShowRestDayCalendar(false);
  };

  const removeRestDay = (date: string) => {
    setSchedule((prev) => ({
      ...prev,
      restDays: (prev.restDays || []).filter((d) => d !== date),
    }));
  };

  const handleSave = async () => {
    if (!schedule.schemes?.length) {
      toast.error('请至少添加一个工作时间方案');
      return;
    }
    setSaving(true);
    try {
      await updateTechnicianProfile({ serviceSchedule: schedule });
      toast.success('工作时间已保存');
      onClose();
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-md flex flex-col rounded-t-[20px] bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-[var(--nb-line)] bg-white px-5 py-3.5">
          <h2 className="text-lg font-bold text-[var(--nb-ink)]">工作时间设置</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--nb-page)]">
            <svg className="h-4 w-4 text-[var(--nb-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4 space-y-4">
          {/* Add Scheme Button */}
          <button
            type="button"
            onClick={handleAddScheme}
            className="w-full min-h-[48px] rounded-[16px] bg-[var(--nb-page)] text-[14px] font-semibold text-[var(--nb-secondary)] active:bg-[var(--nb-page)] flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新增方案
          </button>

          {/* Schemes List */}
          <Card className="p-0 overflow-hidden shadow-[0_12px_28px_rgba(0,0,0,0.05)]">
            {(schedule.schemes || []).map((scheme, index) => {
              const isActive = scheme.id === schedule.activeSchemeId;
              return (
                <div
                  key={scheme.id}
                  className={`${index < (schedule.schemes?.length || 0) - 1 ? 'border-b border-[var(--nb-line)]' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setEditingScheme(scheme)}
                    className="w-full px-4 py-3.5 text-left hover:bg-[var(--nb-page)] active:bg-[var(--nb-page)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-[15px] font-semibold text-[var(--nb-ink)]">
                            {scheme.label}
                          </span>
                          {isActive && (
                            <span className="rounded-full bg-[var(--nb-page)] px-2 py-0.5 text-[10px] font-semibold text-[var(--nb-ink)]">
                              当前
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[13px] text-[var(--nb-secondary)]">
                          {scheme.startTime}–{scheme.endTime} · {daysSummary(scheme.days)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetActive(scheme.id);
                        }}
                        className={`relative h-7 w-12 rounded-full transition-colors ${
                          isActive ? 'bg-[var(--nb-action)]' : 'bg-[var(--nb-page)]'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                            isActive ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </button>
                </div>
              );
            })}
          </Card>

          {/* Rest Days Section */}
          <Card className="p-4 shadow-[0_12px_28px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold text-[var(--nb-ink)]">休息日设置</h3>
              <button
                type="button"
                onClick={() => setShowRestDayCalendar(true)}
                className="text-[13px] font-medium text-[var(--nb-ink)] hover:text-[var(--nb-ink)] active:text-[var(--nb-ink)]"
              >
                设置休息日
              </button>
            </div>

            {(schedule.restDays?.length || 0) > 0 ? (
              <div className="flex flex-wrap gap-2">
                {schedule.restDays!.map((date) => (
                  <span
                    key={date}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--nb-page)] px-2.5 py-1 text-[11px] font-medium text-[var(--nb-muted)]"
                  >
                    {date}
                    <button
                      type="button"
                      onClick={() => removeRestDay(date)}
                      className="ml-1 text-[var(--nb-muted)] hover:text-[var(--nb-muted)]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[var(--nb-secondary)]">暂无设置休息日</p>
            )}
          </Card>
        </div>

        {/* Sticky Footer Save Button */}
        <div
          className="shrink-0 px-5 pt-3 border-t border-[var(--nb-line)] bg-white"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}
        >
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="w-full min-h-[52px] rounded-[18px] bg-[var(--nb-action)] text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] active:bg-[var(--nb-action-pressed)] disabled:opacity-60"
          >
            {saving ? '保存中...' : '保存工作时间'}
          </button>
        </div>

        {/* Nested Modals */}
        {editingScheme && (
          <SchemeEditorModal
            open={!!editingScheme}
            scheme={editingScheme}
            onSave={handleSaveScheme}
            onDelete={handleDeleteScheme}
            onClose={() => setEditingScheme(null)}
          />
        )}

        <RestDayCalendar
          open={showRestDayCalendar}
          value={schedule.restDays || []}
          onConfirm={handleRestDayConfirm}
          onClose={() => setShowRestDayCalendar(false)}
        />
      </div>
    </div>
  );
};

const tools = [
  { icon: '📄', label: '主页设置', path: '/homepage-settings' },
  { icon: '💅', label: '服务管理', path: '/services' },
  { icon: '💰', label: '价格设置' },
  { icon: '🚗', label: '上门设置', path: '/home-service-settings' },
  { icon: '🏪', label: '店铺管理', path: '/shops' },
  { icon: '🖼️', label: '作品管理', path: '/works' },
  { icon: '🏷️', label: '标签管理', path: '/tag-management' },
  { icon: '🎓', label: '资质管理', path: '/qualifications' },
  { icon: '🔗', label: '绑定申请', path: '/binding-applications' },
  { icon: '⭐', label: '评价管理', path: '/reviews' },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { technician, logout, updateTechnicianProfile } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState<TechnicianOrder[]>([]);
  const [customers, setCustomers] = useState<TechnicianCustomerSummary[]>([]);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [showWorkScheduleModal, setShowWorkScheduleModal] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const invitationCode = technician?.invitationCode;
  const clientBaseUrl = import.meta.env.VITE_CLIENT_BASE_URL || 'https://m.lunails.cn';
  const inviteLink = invitationCode ? `${clientBaseUrl}/invite?invite_code=${encodeURIComponent(invitationCode)}` : '';
  // 接单就绪：至少开启一种服务类型；未就绪则锁定邀请码/邀请链接
  const bookingReady = !!(technician?.homeService || technician?.shopService);
  const moduleClassName = 'mb-4 p-4';
  const moduleHeaderClassName = 'mb-4 flex items-center justify-between gap-3';
  const iconPlateClassName = 'flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--nb-page)] text-lg ring-1 ring-black/[0.03]';

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

  // Auto-open work schedule modal when coming from setup flow
  useEffect(() => {
    if (searchParams.get('setup') === 'worktime') {
      setShowWorkScheduleModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
    <div className="min-h-full overflow-x-hidden bg-[var(--nb-page)] pb-[calc(3.5rem+env(safe-area-inset-bottom)+1.5rem)]">
      <div className="relative overflow-hidden bg-[var(--nb-action)] px-5 pb-10 pt-12">
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
              <div className={`h-2 w-2 rounded-full ${isAcceptingOrders ? 'animate-pulse bg-[var(--nb-pressed)]' : 'bg-white/70'}`}></div>
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
        <Card className="relative z-10 -mt-5 mb-4 p-4 shadow-[0_14px_32px_rgba(0,0,0,0.08)]">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-[var(--nb-ink)]">{summary.todayOrders.length}</p>
              <p className="mt-1 text-xs text-[var(--nb-secondary)]">今日预约</p>
            </div>
            <div className="border-x border-[var(--nb-line)]">
              <p className="text-2xl font-bold text-[var(--nb-ink)]">{weekOrders.length}</p>
              <p className="mt-1 text-xs text-[var(--nb-secondary)]">本周预约</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--nb-secondary)]">{customers.length}</p>
              <p className="mt-1 text-xs text-[var(--nb-secondary)]">客户总数</p>
            </div>
          </div>
        </Card>

        {/* Income card - 核心展示 */}
        <Card className={moduleClassName}>
          <div className={moduleHeaderClassName}>
            <h2 className="text-[18px] font-semibold text-[var(--nb-ink)]">收入统计</h2>
            <span className="text-xs text-[var(--nb-muted)]">按当前预约数据汇总</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[18px] bg-[var(--nb-page)] p-3.5 ring-1 ring-[var(--nb-line)]">
              <p className="text-xs text-[var(--nb-secondary)]">今日已完成收入</p>
              <p className="mt-1 text-[1.65rem] font-semibold tracking-[-0.03em] text-[var(--nb-secondary)]">{formatMoney(summary.todayIncome)}</p>
            </div>
            <div className="rounded-[18px] bg-[var(--nb-surface)] p-3.5 ring-1 ring-black/[0.03]">
              <p className="text-xs text-[var(--nb-secondary)]">今日预计收入</p>
              <p className="mt-1 text-[1.65rem] font-semibold tracking-[-0.03em] text-[var(--nb-ink)]">{formatMoney(summary.expectedIncome)}</p>
            </div>
            <div className="rounded-[18px] bg-[var(--nb-surface)] p-3.5 ring-1 ring-black/[0.03]">
              <p className="text-xs text-[var(--nb-secondary)]">本月预约金额</p>
              <p className="mt-1 text-[1.65rem] font-semibold tracking-[-0.03em] text-[var(--nb-ink)]">{formatMoney(monthRevenue)}</p>
            </div>
            <div className="rounded-[18px] bg-[var(--nb-surface)] p-3.5 ring-1 ring-black/[0.03]">
              <p className="text-xs text-[var(--nb-secondary)]">累计完成单量</p>
              <p className="mt-1 text-[1.65rem] font-semibold tracking-[-0.03em] text-[var(--nb-secondary)]">{completedCount}</p>
            </div>
          </div>
        </Card>

        <Card className={moduleClassName}>
          <div className={moduleHeaderClassName}>
            <h2 className="text-[18px] font-semibold text-[var(--nb-ink)]">我的预约</h2>
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="text-xs text-[var(--nb-secondary)] font-medium"
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
                className="relative flex flex-col items-center gap-1.5 rounded-[18px] bg-[var(--nb-page)] px-1 py-3 ring-1 ring-[var(--nb-line)] transition-colors active:bg-[var(--nb-page)] min-h-[44px]"
              >
                <div className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-lg shadow-[0_6px_14px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03]">
                  <span>{item.icon}</span>
                  {item.value > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--nb-action)] text-[10px] text-white">
                      {item.value}
                    </span>
                  )}
                </div>
                <span className="text-center text-[11px] text-[var(--nb-secondary)]">{item.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className={moduleClassName}>
          <div className={moduleHeaderClassName}>
            <h2 className="text-[18px] font-semibold text-[var(--nb-ink)]">常用工具</h2>
            <span className="text-xs text-[var(--nb-muted)]">常用配置入口</span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {tools.map((tool) => (
              <button
                key={tool.label}
                onClick={() => tool.path && navigate(tool.path)}
                className="flex flex-col items-center gap-2 rounded-[18px] bg-[var(--nb-page)] px-1 py-3 ring-1 ring-[var(--nb-line)] transition-colors active:bg-[var(--nb-page)] min-h-[44px]"
              >
                <div className={`${iconPlateClassName} text-[var(--nb-ink)]`}>{tool.icon}</div>
                <span className="text-center text-xs text-[var(--nb-secondary)]">{tool.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className={moduleClassName}>
          <div className={moduleHeaderClassName}>
            <div>
              <h2 className="text-[18px] font-semibold text-[var(--nb-ink)]">邀请码分享</h2>
              <p className="mt-1 text-xs text-[var(--nb-secondary)]">把邀请码或链接发给客户，客户可直接进入绑定流程。</p>
            </div>
            {bookingReady && (
              <button
                type="button"
                onClick={() => invitationCode && navigator.clipboard.writeText(invitationCode).then(() => toast.success('邀请码已复制'))}
                className="shrink-0 whitespace-nowrap rounded-full bg-[var(--nb-page)] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--nb-secondary)] min-h-[32px] active:bg-[var(--nb-page)]"
              >
                邀请客户
              </button>
            )}
          </div>
          {!bookingReady ? (
            <div className="rounded-[20px] bg-[var(--nb-page)] px-4 py-5 text-center">
              <p className="text-sm font-medium text-[var(--nb-ink)]">开启上门或到店服务后，才能生成并分享邀请链接</p>
              <p className="mt-1 text-xs text-[var(--nb-muted)]">请前往「服务类型」开启服务</p>
            </div>
          ) : (
          <div className="rounded-[20px] bg-[var(--nb-page)] p-3.5">
            <div className="flex items-center justify-between gap-3 rounded-[16px] bg-white px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--nb-muted)]">邀请码</p>
                <p className="mt-1 text-[1.1rem] font-bold tracking-[0.18em] text-[var(--nb-ink)]">
                  {invitationCode || '暂未生成'}
                </p>
              </div>
              {invitationCode && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(invitationCode).then(() => toast.success('邀请码已复制'))}
                  className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--nb-page)] active:bg-[var(--nb-page)]"
                >
                  <svg className="h-4 w-4 text-[var(--nb-ink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] bg-white px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--nb-muted)]">分享链接</p>
                {inviteLink ? (
                  <a
                    href={inviteLink}
                    className="mt-1 block truncate text-sm leading-6 text-[var(--nb-secondary)]"
                  >
                    {inviteLink}
                  </a>
                ) : (
                  <p className="mt-1 text-sm leading-6 text-[var(--nb-secondary)]">暂无可用分享链接</p>
                )}
              </div>
              {inviteLink && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(inviteLink).then(() => toast.success('分享链接已复制'))}
                  className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--nb-page)] active:bg-[var(--nb-page)]"
                >
                  <svg className="h-4 w-4 text-[var(--nb-ink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          )}
        </Card>

        <Card className="mb-4 overflow-hidden p-0">
          <div className="px-4 pt-4">
            <div className={moduleHeaderClassName}>
              <div>
                <h2 className="text-[18px] font-semibold text-[var(--nb-ink)]">设置</h2>
                <p className="mt-1 text-xs text-[var(--nb-secondary)]">账号、服务类型与常用偏好入口</p>
              </div>
            </div>
          </div>
          {settings.map((item) => (
            <button
              key={item.label}
              onClick={() => item.path && navigate(item.path)}
              className="flex w-full items-center gap-3 border-b border-[var(--nb-line)] px-4 py-3.5 text-left transition-colors active:bg-[var(--nb-page)] last:border-0"
            >
              <span className={iconPlateClassName}>{item.icon}</span>
              <span className="flex-1 text-left text-[var(--nb-ink)]">{item.label}</span>
              <svg className="h-5 w-5 text-[var(--nb-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </Card>

        <button
          onClick={logout}
          className="w-full rounded-[24px] bg-white py-3 font-medium text-[var(--nb-secondary)] shadow-[0_8px_24px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] transition-colors active:bg-[var(--nb-page)] min-h-[48px]"
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
