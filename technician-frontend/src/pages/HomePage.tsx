import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { ServiceTypeSetupModal } from '../components/ServiceTypeSetupModal';
import type { ServiceTypeSettings, ShopAddress } from '../contexts/authTypes';
import { bookingsService } from '../services/bookings';
import { messageService, type Conversation } from '../services/message';
import { worksService, type Work } from '../services/works';
import {
  buildDashboardSummary,
  formatClock,
  formatMoney,
  type TechnicianBooking,
} from '../services/technicianData';

function parseDate(value?: string | Date | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatShopAddress(shop: ShopAddress) {
  return [
    shop.province,
    shop.city,
    shop.district,
    shop.detailAddress,
    shop.doorInfo,
  ]
    .filter(Boolean)
    .join(' ');
}

function compactAddress(address: string) {
  const parts = address.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(-2).join(' ');
  }
  return address.length > 18 ? `${address.slice(0, 18)}…` : address;
}

function resolveBookingPresentation(booking: TechnicianBooking, shops: ShopAddress[] = []) {
  const matchedShop = shops.find((shop) => {
    if (booking.shopName && shop.name === booking.shopName) return true;
    return formatShopAddress(shop) === booking.address;
  });

  if (booking.serviceType === 'shop') {
    const shopName = booking.shopName || matchedShop?.name;
    return {
      serviceTypeLabel: '到店美甲',
      fullAddressLabel: shopName
        ? `到店 · ${shopName} · ${booking.address}`
        : `到店 · ${booking.address}`,
      compactAddressLabel: shopName
        ? `${shopName} · ${compactAddress(booking.address)}`
        : compactAddress(booking.address),
      accentClasses: 'bg-[#ffe9f0] text-pink-500',
    };
  }

  return {
    serviceTypeLabel: '上门美甲',
    fullAddressLabel: `上门 · ${booking.address}`,
    compactAddressLabel: `上门 · ${compactAddress(booking.address)}`,
    accentClasses: 'bg-[#fff1e5] text-[#c9792a]',
  };
}

function estimateSingleTravelMinutes(booking: TechnicianBooking) {
  return booking.serviceType === 'home' ? 24 : 16;
}

function estimateRouteDistance(bookings: TechnicianBooking[]) {
  if (!bookings.length) return 0;
  if (bookings.length === 1) {
    return Number((bookings[0].serviceType === 'home' ? 7.8 : 3.6).toFixed(1));
  }

  return Number(
    bookings
      .reduce((total, booking, index) => {
        const segment = booking.serviceType === 'home' ? 4.6 : 2.9;
        return total + segment + (index === 0 ? 2.4 : 1.4);
      }, 0)
      .toFixed(1)
  );
}

function estimateRouteMinutes(bookings: TechnicianBooking[]) {
  return bookings.reduce((total, booking, index) => {
    return total + estimateSingleTravelMinutes(booking) + (index === 0 ? 0 : 10);
  }, 0);
}

function estimateSavedMinutes(bookings: TechnicianBooking[]) {
  if (bookings.length <= 1) return 0;
  return Math.min(24, 8 + bookings.length * 4);
}

function formatTravelDuration(minutes: number) {
  if (minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${rest > 0 ? `${rest}m` : ''}`;
}

function formatDepartureCountdown(minutes: number) {
  if (minutes <= 0) return '现在出发';
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} 小时${rest ? ` ${rest} 分钟` : ''}`;
}

function isActiveBookingStatus(status: TechnicianBooking['status']) {
  return status !== 'completed' && status !== 'cancelled';
}

function isSameCalendarWeek(target: Date, baseDate: Date) {
  const current = new Date(baseDate);
  const day = current.getDay() || 7;
  current.setHours(0, 0, 0, 0);
  current.setDate(current.getDate() - day + 1);
  const weekStart = current.getTime();
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
  const targetTime = target.getTime();
  return targetTime >= weekStart && targetTime < weekEnd;
}

function hasAddressIssue(booking: TechnicianBooking) {
  const address = booking.address?.trim();
  if (!address) return true;
  return /待确认|待补充|稍后提供|待补全|未知/.test(address);
}

function getBookingStateMeta(status: TechnicianBooking['status']) {
  if (status === 'in_progress') {
    return {
      tone: 'bg-[#ebf4ff] text-[#3b82f6]',
      dot: 'bg-[#69a7ff]',
      actionLabel: '服务中',
    };
  }
  if (status === 'completed') {
    return {
      tone: 'bg-[#f4f5f7] text-[#8a8f98]',
      dot: 'bg-[#b7bcc5]',
      actionLabel: '已完成',
    };
  }
  return {
    tone: 'bg-[#ffe9f0] text-pink-500',
    dot: 'bg-[#FF5A66]',
    actionLabel: '待出发',
  };
}

function getTechnicianInitial(name?: string | null) {
  return name?.charAt(0) || '美';
}

export const HomePage: React.FC = () => {
  const { technician, updateTechnicianStatus, updateServiceType } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [bookings, setBookings] = useState<TechnicianBooking[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
  const [expandedAddressBookingId, setExpandedAddressBookingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      setIsLoading(true);

      const [bookingsResult, conversationsResult, worksResult] = await Promise.allSettled([
        bookingsService.list({ technicianId: technician?.id }),
        messageService.getConversations(),
        worksService.list(),
      ]);

      if (cancelled) return;

      if (bookingsResult.status === 'fulfilled') {
        setBookings(bookingsResult.value);
      } else {
        setBookings([]);
        toast.error('首页行程加载失败，请稍后重试。');
      }

      if (conversationsResult.status === 'fulfilled') {
        setConversations(conversationsResult.value);
      } else {
        setConversations([]);
      }

      if (worksResult.status === 'fulfilled') {
        setWorks(worksResult.value);
      } else {
        setWorks([]);
      }

      setIsLoading(false);
    }

    void loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, [technician?.id, toast]);

  const shareBaseUrl = import.meta.env.VITE_TECHNICIAN_SHARE_BASE_URL || window.location.origin;
  const shareUrl = technician
    ? `${shareBaseUrl.replace(/\/$/, '')}/technicians/${technician.id}${technician.invitationCode ? `?invite_code=${technician.invitationCode}` : ''}`
    : shareBaseUrl;
  const isAcceptingOrders = technician?.status === 'active';
  const availableShops = technician?.shopAddresses?.filter((shop) => shop.enabled !== false) ?? [];
  const summary = useMemo(() => buildDashboardSummary(bookings, new Date()), [bookings]);
  const todayBookings = useMemo(
    () =>
      [...summary.todayBookings].sort((left, right) => {
        const leftTime = parseDate(left.startTime)?.getTime() ?? 0;
        const rightTime = parseDate(right.startTime)?.getTime() ?? 0;
        return leftTime - rightTime;
      }),
    [summary.todayBookings]
  );
  const weeklyIncome = useMemo(() => {
    return bookings.reduce((total, booking) => {
      const start = parseDate(booking.startTime);
      if (!start || !isSameCalendarWeek(start, new Date())) return total;
      return total + booking.price;
    }, 0);
  }, [bookings]);
  const nextBooking = useMemo(() => {
    const now = Date.now();
    const candidates = todayBookings.filter((booking) => isActiveBookingStatus(booking.status));
    if (!candidates.length) return null;
    return (
      candidates.find((booking) => {
        const endTime = parseDate(booking.endTime)?.getTime();
        return !endTime || endTime >= now;
      }) || candidates[0]
    );
  }, [todayBookings]);
  const nextPresentation = nextBooking ? resolveBookingPresentation(nextBooking, availableShops) : null;
  const nextTravelMinutes = nextBooking ? estimateSingleTravelMinutes(nextBooking) : 0;
  const nextStartDate = nextBooking ? parseDate(nextBooking.startTime) : null;
  const suggestedDepartureDate =
    nextStartDate && nextTravelMinutes
      ? new Date(nextStartDate.getTime() - nextTravelMinutes * 60 * 1000)
      : null;
  const departureCountdownMinutes =
    suggestedDepartureDate
      ? Math.floor((suggestedDepartureDate.getTime() - Date.now()) / (60 * 1000))
      : 0;
  const routeDistance = estimateRouteDistance(todayBookings);
  const routeMinutes = estimateRouteMinutes(todayBookings);
  const routeSavedMinutes = estimateSavedMinutes(todayBookings);
  const unreadMessageCount = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
  const customerCount = useMemo(
    () => new Set(bookings.map((booking) => booking.customerId || booking.customerName).filter(Boolean)).size,
    [bookings]
  );
  const unpaidDepositCount = bookings.filter(
    (booking) => isActiveBookingStatus(booking.status) && !booking.depositPaid
  ).length;
  const addressPendingCount = bookings.filter(
    (booking) => isActiveBookingStatus(booking.status) && hasAddressIssue(booking)
  ).length;
  const pendingItems = [
    {
      key: 'pending-confirm',
      count: summary.pendingCount,
      label: '个预约待确认',
      to: '/schedule?filter=pending',
      accent: 'text-pink-500',
      badge: 'bg-[#ffe9f0]',
    },
    {
      key: 'deposit',
      count: unpaidDepositCount,
      label: '个客户未支付定金',
      to: '/orders',
      accent: 'text-[#d08b26]',
      badge: 'bg-[#fff2dc]',
    },
    {
      key: 'address',
      count: addressPendingCount,
      label: '个客户未确认地址',
      to: '/customers',
      accent: 'text-[#f06f4b]',
      badge: 'bg-[#fff0ea]',
    },
    {
      key: 'messages',
      count: unreadMessageCount,
      label: '条未读消息',
      to: '/messages',
      accent: 'text-[#4f7ddb]',
      badge: 'bg-[#edf3ff]',
    },
  ];
  const activePendingItems = pendingItems.filter((item) => item.count > 0);
  const serviceChips = useMemo(() => {
    const chips: string[] = [];
    if (technician?.homeService) chips.push('上门');
    if (technician?.shopService) chips.push('到店');
    chips.push(`客户数 ${customerCount}`);
    return chips;
  }, [customerCount, technician?.homeService, technician?.shopService]);
  const featuredWorks = useMemo(
    () =>
      [...works]
        .sort((left, right) => {
          const hotScore = right.favoriteCount + right.likeCount - (left.favoriteCount + left.likeCount);
          if (hotScore !== 0) return hotScore;
          return (parseDate(right.createdAt)?.getTime() ?? 0) - (parseDate(left.createdAt)?.getTime() ?? 0);
        })
        .slice(0, 4),
    [works]
  );
  const quickActions = [
    { label: '新建预约', to: '/orders', color: 'bg-[#ffe9f0]', icon: '＋' },
    { label: '客户管理', to: '/customers', color: 'bg-[#eef5ff]', icon: '客' },
    { label: '作品管理', to: '/works', color: 'bg-[#F0F7FF]', icon: '作' },
    { label: '我的行程', to: '/schedule', color: 'bg-[#eefaf4]', icon: '程' },
    { label: '店铺管理', to: '/shops', color: 'bg-[#fff7fa]', icon: '店' },
    { label: '服务管理', to: '/services', color: 'bg-[#f7f1ff]', icon: '服' },
  ];

  async function copyShareUrl() {
    if (!navigator.clipboard?.writeText) {
      toast.warning('当前浏览器不支持自动复制，请手动复制下方链接。');
      return false;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('链接已复制，发给客户即可。');
      return true;
    } catch {
      toast.warning('链接复制失败，请手动复制下方链接。');
      return false;
    }
  }

  async function handleShare() {
    const shareData = {
      title: `美甲师 ${technician?.name || '小美'} 的名片`,
      text: '发给客户，查看主页并直接预约',
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('分享面板已打开。');
        return;
      } catch {
        // Fall through to copy link when share is cancelled or unavailable.
      }
    }

    await copyShareUrl();
  }

  async function handleToggleStatus() {
    const nextStatus = isAcceptingOrders ? 'inactive' : 'active';

    if (!isAcceptingOrders) {
      const hasServiceType = technician?.homeService || technician?.shopService;
      const needsShopSetup =
        !!technician?.shopService &&
        (!technician.shopAddresses || technician.shopAddresses.length === 0);

      if (!hasServiceType || needsShopSetup) {
        setShowServiceTypeModal(true);
        return;
      }
    }

    setIsUpdatingStatus(true);
    void updateTechnicianStatus(nextStatus)
      .then(() => {
        toast.success(nextStatus === 'active' ? '已开启接单状态。' : '已关闭接单状态。');
      })
      .catch(() => {
        toast.error('接单状态更新失败，请稍后重试。');
      })
      .finally(() => {
        setIsUpdatingStatus(false);
      });
  }

  async function handleServiceTypeSubmit(settings: ServiceTypeSettings) {
    try {
      await updateServiceType(settings);
      await updateTechnicianStatus('active');
      toast.success('已开启接单状态');
      setShowServiceTypeModal(false);
    } catch {
      toast.error('设置失败，请稍后重试');
    }
  }

  function handleNavigateToAddress(address?: string) {
    if (!address) {
      toast.warning('当前预约还没有地址信息。');
      return;
    }

    const target = `https://uri.amap.com/search?keyword=${encodeURIComponent(address)}&callnative=0`;
    window.open(target, '_blank', 'noopener,noreferrer');
  }

  function handleContactCustomer(phone?: string) {
    if (!phone) {
      toast.warning('当前客户暂无联系电话。');
      return;
    }
    window.location.href = `tel:${phone}`;
  }

  return (
    <div className="min-h-full bg-[#FFF9F8] pb-28">
      <div className="relative overflow-hidden bg-[linear-gradient(145deg,#FF6FA2_0%,#FF6B9B_34%,#FF81A4_68%,#FFB387_100%)] px-5 pb-10 pt-11">
        <div className="absolute -left-10 top-2 h-32 w-32 rounded-full bg-white/14 blur-3xl" />
        <div className="absolute right-[-10%] top-[-6%] h-48 w-48 rounded-full bg-white/18 blur-3xl" />
        <div className="absolute left-1/2 top-6 h-44 w-44 -translate-x-1/2 rounded-full bg-white/12 blur-[100px]" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/12 shadow-[0_18px_36px_rgba(255,255,255,0.12)] backdrop-blur-md">
              {technician?.avatar ? (
                <img src={technician.avatar} alt={technician.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[1.8rem] font-semibold text-white">{getTechnicianInitial(technician?.name)}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[2rem] font-semibold tracking-[-0.03em] text-white">
                  {technician?.name || '美甲师'}
                </h1>
                <span className="rounded-full border border-white/16 bg-white/18 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                  {isAcceptingOrders ? '今日接单中' : '今日暂停中'}
                </span>
              </div>
              <p className="mt-1 max-w-[14rem] text-[14px] font-medium leading-6 text-white/82">
                今日 {todayBookings.length} 单 · 预估 {formatMoney(summary.expectedIncome)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/messages"
              className="relative inline-flex min-h-[52px] min-w-[52px] items-center justify-center rounded-[20px] border border-white/18 bg-white/12 text-white shadow-[0_16px_32px_rgba(61,27,49,0.14)] backdrop-blur-md"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h8m-8 4h4m-4-9h8a3 3 0 013 3v8a3 3 0 01-3 3H9l-5 3V7a3 3 0 013-3z" />
              </svg>
              {unreadMessageCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff4962] px-1 text-[10px] font-semibold text-white">
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={() => setShowShareSheet(true)}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[20px] border border-white/[0.18] bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.1)_100%)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_16px_32px_rgba(61,27,49,0.14),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md transition-colors active:bg-white/[0.18]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.25 8.25h7.5a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5h-7.5a1.5 1.5 0 01-1.5-1.5v-7.5a1.5 1.5 0 011.5-1.5zm2.25-3h7.5m-3.75 0V3m0 2.25v3" />
              </svg>
              分享名片
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={isUpdatingStatus}
          className={`relative z-10 mt-4 flex min-h-[44px] w-full items-center justify-between rounded-[22px] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.1)_100%)] px-4 py-3 text-left shadow-[0_16px_34px_rgba(61,27,49,0.12)] backdrop-blur-md transition-colors active:bg-white/[0.17] ${
            isUpdatingStatus ? 'opacity-70' : ''
          }`}
          aria-pressed={isAcceptingOrders}
        >
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.04em] text-white/68">接单状态</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-[15px] font-semibold text-white">
                {isUpdatingStatus ? '更新中' : isAcceptingOrders ? '接单中' : '已暂停'}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {serviceChips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex rounded-full border border-white/12 bg-white/14 px-2.5 py-1 text-[10px] font-medium text-white/88"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <span
            className={`relative flex h-6 w-10 flex-shrink-0 items-center rounded-full transition-colors ${
              isAcceptingOrders ? 'bg-emerald-400/90' : 'bg-white/30'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_2px_8px_rgba(29,35,53,0.18)] transition-all ${
                isAcceptingOrders ? 'left-[1.15rem]' : 'left-0.5'
              }`}
            />
          </span>
        </button>
      </div>

      <div className="relative z-10 -mt-6 px-5">
        <section className="rounded-[30px] bg-[#FFFDFD] p-5 shadow-[0_24px_50px_rgba(57,30,43,0.09)]">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_9rem]">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-[#FF5E93]">下一单</p>
              {nextBooking ? (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="text-[2rem] font-semibold tracking-[-0.03em] text-[#1f2230]">
                      {formatClock(nextBooking.startTime)}
                    </p>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[1.35rem] font-semibold text-[#1f2230]">
                          {nextBooking.customerName}
                        </p>
                        {nextPresentation ? (
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${nextPresentation.accentClasses}`}>
                            {nextPresentation.serviceTypeLabel}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[15px] font-medium text-[#4d4652]">
                        {nextBooking.serviceName || '预约服务'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedAddressBookingId(expandedAddressBookingId === nextBooking.id ? null : nextBooking.id)}
                    className="mt-3 flex items-start gap-2 text-left"
                  >
                    <svg className="mt-[2px] h-4 w-4 shrink-0 text-[#c1b5bd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s-6-4.35-6-10a6 6 0 1112 0c0 5.65-6 10-6 10zm0-8.25a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5z" />
                    </svg>
                    <span className="text-[13px] leading-6 text-[#716776]">
                      {expandedAddressBookingId === nextBooking.id && nextPresentation
                        ? nextPresentation.fullAddressLabel
                        : nextPresentation?.compactAddressLabel || nextBooking.address}
                    </span>
                  </button>
                </>
              ) : (
                <div className="mt-3">
                  <p className="text-[1.2rem] font-semibold text-[#1f2230]">今天暂时没有排单</p>
                  <p className="mt-2 text-[14px] leading-6 text-[#7b7480]">现在可以安排新预约，或者整理今日作品与客户跟进。</p>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-3">
              <div className="rounded-[24px] bg-[linear-gradient(180deg,#FFF5F8_0%,#FFF9FB_100%)] px-3.5 py-4 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                <p className="text-[11px] font-medium tracking-[0.04em] text-[#C593A8]">距出发还有</p>
                <p className="mt-2 text-[2.2rem] font-semibold tracking-[-0.04em] text-[#1f2230]">
                  {nextBooking ? (departureCountdownMinutes <= 0 ? '0' : Math.max(departureCountdownMinutes, 0)) : '--'}
                </p>
                <p className="mt-1 text-[12px] font-medium text-[#8c8590]">
                  {nextBooking ? (departureCountdownMinutes <= 0 ? '建议现在出发' : '分钟') : '暂无排单'}
                </p>
              </div>
              <div className="relative h-[9.25rem] overflow-hidden rounded-[24px] border border-[#F4E7EC] bg-[radial-gradient(circle_at_top_left,#FFF6F8_0%,#FFFDFE_52%,#FFF7F4_100%)]">
                <div className="absolute inset-0 opacity-70">
                  <div className="absolute left-[20%] top-[18%] h-px w-[58%] bg-[#F5DFE8]" />
                  <div className="absolute left-[10%] top-[38%] h-px w-[75%] bg-[#F6E8EE]" />
                  <div className="absolute left-[18%] top-[62%] h-px w-[62%] bg-[#F5DFE8]" />
                  <div className="absolute left-[28%] top-[12%] h-[70%] w-px bg-[#F6E8EE]" />
                  <div className="absolute left-[56%] top-[16%] h-[60%] w-px bg-[#F5DFE8]" />
                </div>
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 144 148" fill="none" aria-hidden="true">
                  <path d="M94 24C82 42 70 52 64 68C58 83 72 88 74 102C76 113 66 119 53 126" stroke="#FF7A9A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 8" />
                </svg>
                <span className="absolute right-5 top-5 flex h-7 w-7 items-center justify-center rounded-full bg-[#FF5A66] shadow-[0_8px_18px_rgba(255,90,102,0.28)]">
                  <span className="h-3 w-3 rounded-full bg-white" />
                </span>
                <span className="absolute bottom-5 left-[40%] flex h-7 w-7 items-center justify-center rounded-full bg-[#FF5A66] shadow-[0_8px_18px_rgba(255,95,134,0.28)]">
                  <span className="h-3 w-3 rounded-full bg-white" />
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[18px] border border-[#f2e6ec] bg-[#FFFFFF] px-3.5 py-3">
              <p className="text-[11px] text-[#a08e98]">预计路程</p>
              <p className="mt-1 text-[15px] font-semibold text-[#1f2230]">
                {nextBooking ? `${nextTravelMinutes} 分钟` : '--'}
              </p>
            </div>
            <div className="rounded-[18px] border border-[#f2e6ec] bg-[#FFFFFF] px-3.5 py-3">
              <p className="text-[11px] text-[#a08e98]">建议出发时间</p>
              <p className="mt-1 text-[15px] font-semibold text-[#1f2230]">
                {nextBooking
                  ? formatClock(
                      suggestedDepartureDate
                        ? suggestedDepartureDate.toISOString()
                        : nextBooking.startTime
                    )
                  : '--:--'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => handleNavigateToAddress(nextBooking?.address)}
              className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#FF4D84_0%,#FF6E8D_100%)] px-4 py-3 text-[15px] font-semibold text-white shadow-[0_18px_28px_rgba(255,95,134,0.28)]"
            >
              <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.93 2.93a.75.75 0 01.82-.17l12.5 5a.75.75 0 01-.04 1.41l-4.88 1.63-1.63 4.88a.75.75 0 01-1.4.04l-5-12.5a.75.75 0 01.17-.82z" />
              </svg>
              开始导航
            </button>
            <button
              type="button"
              onClick={() => handleContactCustomer(nextBooking?.customerPhone)}
              className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-[18px] border border-[#F2D5DE] bg-white px-4 py-3 text-[15px] font-semibold text-[#FF5E93] shadow-[0_8px_18px_rgba(255,110,141,0.08)]"
            >
              <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5.5C3 4.67 3.67 4 4.5 4h2.62a1 1 0 01.95.68l1.18 3.54a1 1 0 01-.5 1.2l-1.7.85a13.05 13.05 0 006.47 6.47l.85-1.7a1 1 0 011.2-.5l3.54 1.18a1 1 0 01.68.95v2.62c0 .83-.67 1.5-1.5 1.5h-.75C9.86 21 3 14.14 3 5.5z" />
              </svg>
              联系客户
            </button>
          </div>
        </section>
      </div>

      <div className="space-y-3 px-5 pt-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[28px] bg-white p-4 shadow-[0_14px_30px_rgba(36,27,41,0.05)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-[#1f2230]">今日路线</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-[2.2rem] font-semibold tracking-[-0.04em] text-[#1f2230]">{routeDistance}</span>
                  <span className="pb-1 text-[15px] font-medium text-[#6d6570]">km</span>
                </div>
                <p className="mt-1 text-[13px] text-[#7f7681]">预计通勤 {formatTravelDuration(routeMinutes)}</p>
              </div>
              <div className="rounded-[18px] bg-[#ffe9f0] px-3 py-1.5 text-[12px] font-medium text-pink-500">
                {routeSavedMinutes > 0 ? `路线已优化 · 节省 ${routeSavedMinutes} 分钟` : '路线已优化'}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-[22px] bg-[radial-gradient(circle_at_top_right,#ffe9f0_0%,#fff9f8_48%,#FFFFFF_100%)] px-4 py-4">
              <div className="text-[13px] leading-6 text-[#7f7681]">
                {nextBooking ? (
                  <>
                    <p>{departureCountdownMinutes <= 0 ? '下一单建议立即出发' : `距离出发还有 ${formatDepartureCountdown(departureCountdownMinutes)}`}</p>
                    <p className="text-pink-500">{departureCountdownMinutes <= 0 ? '当前路线需要优先处理' : '建议按路线顺序跑单，避免迟到'}</p>
                  </>
                ) : (
                  <p>当前没有需要赶路的行程，路线压力较低。</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => navigate('/schedule')}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#f2e6ec] bg-white px-4 text-[13px] font-semibold text-[#6d6570]"
              >
                地图入口
              </button>
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-4 shadow-[0_14px_30px_rgba(36,27,41,0.05)]">
            <p className="text-[15px] font-semibold text-[#1f2230]">今日收入（预估）</p>
            <p className="mt-4 text-[2rem] font-semibold tracking-[-0.03em] text-[#1f2230]">
              {formatMoney(summary.expectedIncome)}
            </p>
            <div className="mt-4 rounded-[20px] bg-[#fff9f8] px-4 py-3">
              <p className="text-[12px] text-[#a18e98]">本周</p>
              <p className="mt-1 text-[1.1rem] font-semibold text-[#574d58]">{formatMoney(weeklyIncome)}</p>
            </div>
          </section>
        </div>

        <section className="rounded-[28px] bg-white p-4 shadow-[0_14px_30px_rgba(36,27,41,0.05)]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-[#1f2230]">待处理事项</h2>
              <p className="mt-1 text-[12px] text-[#8d8590]">先处理最容易影响跑单效率的问题</p>
            </div>
            {activePendingItems.length > 0 ? (
              <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-[#FF5A66] px-2 text-[12px] font-semibold text-white">
                {activePendingItems.reduce((total, item) => total + item.count, 0)}
              </span>
            ) : null}
          </div>
          {activePendingItems.length ? (
            <div className="space-y-2">
              {activePendingItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className="flex min-h-[44px] w-full items-center justify-between rounded-[20px] border border-[#f2e6ec] bg-white px-4 py-3 text-left transition-colors active:bg-[#fff7fa]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-full px-2 text-[12px] font-semibold ${item.badge} ${item.accent}`}>
                      {item.count}
                    </span>
                    <p className="truncate text-[14px] font-medium text-[#3c3440]">{item.label}</p>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-[#c9bec6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] bg-[#fff9f8] px-4 py-5 text-center text-[14px] text-[#8d8590]">
              今日待办已清空，可以专心服务客户。
            </div>
          )}
        </section>

        <section className="rounded-[30px] bg-white p-5 shadow-[0_16px_34px_rgba(36,27,41,0.06)]">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-[1.9rem] font-semibold tracking-[-0.04em] text-[#1f2230]">今日行程</h2>
              <p className="mt-1 text-[13px] text-[#8d8590]">
                {new Intl.DateTimeFormat('zh-CN', {
                  month: 'numeric',
                  day: 'numeric',
                  weekday: 'short',
                }).format(new Date())}
              </p>
            </div>
            <Link
              to="/schedule"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#f2e6ec] bg-[#FFFFFF] px-4 text-[13px] font-semibold text-[#8d8590]"
            >
              查看全部
            </Link>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-[#b7aeb7]">行程加载中...</p>
          ) : todayBookings.length ? (
            <div className="relative pl-6">
              <div className="absolute left-[0.45rem] top-5 bottom-6 w-px bg-[#f0dbe3]" />
              <div className="space-y-4">
                {todayBookings.map((booking) => {
                  const presentation = resolveBookingPresentation(booking, availableShops);
                  const stateMeta = getBookingStateMeta(booking.status);
                  const isExpanded = expandedAddressBookingId === booking.id;

                  return (
                    <div key={booking.id} className="relative">
                      <span className={`absolute -left-6 top-5 h-4 w-4 rounded-full border-4 border-[#fff9f8] ${stateMeta.dot}`} />
                      <div className="rounded-[26px] bg-white p-4 shadow-[0_14px_28px_rgba(36,27,41,0.05)]">
                        <div className="flex items-start gap-4">
                          <div className="w-14 shrink-0 text-left">
                            <p
                              className={`text-[1.75rem] font-semibold tracking-[-0.03em] ${
                                booking.status === 'completed'
                                  ? 'text-[#8d8590]'
                                  : booking.status === 'in_progress'
                                    ? 'text-[#4f7ddb]'
                                    : 'text-pink-500'
                              }`}
                            >
                              {formatClock(booking.startTime)}
                            </p>
                            <p className="mt-1 text-[12px] text-[#b8afb7]">{formatClock(booking.endTime)}</p>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f8dce7] text-[1.35rem] font-semibold text-[#ea5e93]">
                                    {getTechnicianInitial(booking.customerName)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="truncate text-[18px] font-semibold text-[#1f2230]">{booking.customerName}</p>
                                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${presentation.accentClasses}`}>
                                        {presentation.serviceTypeLabel}
                                      </span>
                                    </div>
                                    <p className="mt-1 truncate text-[15px] font-medium text-[#574d58]">
                                      {booking.serviceName || '预约服务'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                <p className="text-[1.4rem] font-semibold tracking-[-0.02em] text-pink-500">
                                  {formatMoney(booking.price)}
                                </p>
                                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${stateMeta.tone}`}>
                                  {stateMeta.actionLabel}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedAddressBookingId((current) => (current === booking.id ? null : booking.id))
                              }
                              className="mt-3 flex items-start gap-2 text-left"
                            >
                              <svg className="mt-[2px] h-4 w-4 shrink-0 text-[#c4bac2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s-6-4.35-6-10a6 6 0 1112 0c0 5.65-6 10-6 10zm0-8.25a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5z" />
                              </svg>
                              <span className={`text-[13px] leading-6 text-[#726a74] ${isExpanded ? '' : 'line-clamp-1'}`}>
                                {isExpanded ? presentation.fullAddressLabel : presentation.compactAddressLabel}
                              </span>
                            </button>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="inline-flex rounded-full bg-[#f7f2f5] px-3 py-1.5 text-[12px] font-medium text-[#7f7681]">
                                定金 {booking.depositPaid ? '已收' : '未收'}
                              </span>
                              <span className="inline-flex rounded-full bg-[#f7f2f5] px-3 py-1.5 text-[12px] font-medium text-[#7f7681]">
                                预计 {estimateSingleTravelMinutes(booking)} 分钟通勤
                              </span>
                            </div>

                            <div className="mt-4 flex gap-3 border-t border-[#f2e6ec] pt-4">
                              <button
                                type="button"
                                onClick={() => handleNavigateToAddress(booking.address)}
                                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full bg-[#ffe9f0] px-4 text-[14px] font-semibold text-pink-500"
                              >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2.93 2.93a.75.75 0 01.82-.17l12.5 5a.75.75 0 01-.04 1.41l-4.88 1.63-1.63 4.88a.75.75 0 01-1.4.04l-5-12.5a.75.75 0 01.17-.82z" />
                                </svg>
                                去导航
                              </button>
                              <button
                                type="button"
                                onClick={() => handleContactCustomer(booking.customerPhone)}
                                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border border-[#f2e6ec] bg-white px-4 text-[14px] font-semibold text-[#574d58]"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5.5C3 4.67 3.67 4 4.5 4h2.62a1 1 0 01.95.68l1.18 3.54a1 1 0 01-.5 1.2l-1.7.85a13.05 13.05 0 006.47 6.47l.85-1.7a1 1 0 011.2-.5l3.54 1.18a1 1 0 01.68.95v2.62c0 .83-.67 1.5-1.5 1.5h-.75C9.86 21 3 14.14 3 5.5z" />
                                </svg>
                                联系客户
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="rounded-[22px] bg-[#fff9f8] px-4 py-8 text-center text-sm text-[#b7aeb7]">今天还没有新的预约安排</p>
          )}
        </section>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_1fr]">
          <section className="rounded-[28px] bg-white p-4 shadow-[0_14px_30px_rgba(36,27,41,0.05)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-semibold text-[#1f2230]">热门作品</h2>
                <p className="mt-1 text-[12px] text-[#8d8590]">保留美甲感，也方便随时回看高热作品</p>
              </div>
              <Link to="/works" className="text-[13px] font-semibold text-pink-500">
                更多
              </Link>
            </div>
            {featuredWorks.length ? (
              <div className="grid grid-cols-4 gap-3">
                {featuredWorks.map((work) => (
                  <Link key={work.id} to="/works" className="group">
                    <div className="overflow-hidden rounded-[20px] bg-[#ffe9f0]">
                      {work.coverUrl ? (
                        <img src={work.coverUrl} alt={work.title || '作品'} className="aspect-[0.82] w-full object-cover transition-transform duration-300 group-active:scale-[0.98]" />
                      ) : (
                        <div className="flex aspect-[0.82] items-center justify-center bg-[#ffe9f0] text-[#d1a1b3]">作品</div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[12px] text-[#8d8590]">
                      <span className="text-pink-500">❤</span>
                      <span>{work.favoriteCount || work.likeCount}</span>
                      <span>人收藏</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] bg-[#fff9f8] px-4 py-8 text-center text-[14px] text-[#b7aeb7]">
                还没有上传作品，先补几张好看的款式吧。
              </div>
            )}
          </section>

          <section className="rounded-[28px] bg-white p-4 shadow-[0_14px_30px_rgba(36,27,41,0.05)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-semibold text-[#1f2230]">快速操作</h2>
                <p className="mt-1 text-[12px] text-[#8d8590]">高频动作保留在手边</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex min-h-[44px] flex-col items-center gap-2 rounded-[20px] bg-[#FFFFFF] px-2 py-3 transition-colors active:bg-[#fff7fa]"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-[16px] text-[1.15rem] font-semibold ${item.color} text-[#7d6a75]`}>
                    {item.icon}
                  </div>
                  <span className="text-center text-[12px] font-medium text-[#574d58]">{item.label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <Link
        to="/orders"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] left-1/2 z-[60] inline-flex h-[4.6rem] w-[4.6rem] -translate-x-1/2 items-center justify-center rounded-full bg-[linear-gradient(135deg,#FF4D84_0%,#FF6C93_100%)] text-[14px] font-semibold text-white shadow-[0_22px_42px_rgba(255,90,134,0.34)]"
      >
        <span className="flex flex-col items-center leading-none">
          <span className="text-[1.5rem]">＋</span>
          <span className="mt-0.5 text-[11px]">新建预约</span>
        </span>
      </Link>

      {showShareSheet ? (
        <div className="fixed inset-0 z-[100] bg-black/40 px-4 pb-4 pt-16">
          <div className="mx-auto flex h-full w-full max-w-md flex-col rounded-[28px] bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">分享我的美甲名片</h2>
                <p className="mt-1 text-sm text-gray-500">优先分享链接，也可以直接截图保存名片卡</p>
              </div>
              <button
                onClick={() => setShowShareSheet(false)}
                className="min-h-[44px] rounded-full bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600"
              >
                关闭
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="mb-6 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 p-6 text-white shadow-lg">
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-white/20">
                    {technician?.avatar ? (
                      <img src={technician.avatar} alt={technician.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-white">{getTechnicianInitial(technician?.name)}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{technician?.name || '美甲师'}</h3>
                    <p className="text-sm text-white/80">
                      {technician?.city || '未知城市'} · {technician?.serviceArea || '美甲服务'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-white/90">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{technician?.phone || '未设置电话'}</span>
                  </div>
                  {technician?.homeService && (
                    <div className="flex items-center gap-2">
                      <span className="text-base">🚗</span>
                      <span>提供上门服务</span>
                    </div>
                  )}
                  {technician?.shopService && technician.shopAddresses && technician.shopAddresses.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏪</span>
                      <span>提供到店服务</span>
                    </div>
                  )}
                </div>

                {technician?.socialMedia && Object.entries(technician.socialMedia).some(([_, value]) => value) && (
                  <div className="mt-4 border-t border-white/20 pt-4">
                    <p className="mb-2 text-xs text-white/70">社交媒体</p>
                    <div className="flex flex-wrap gap-2">
                      {technician.socialMedia.weibo && (
                        <a href={technician.socialMedia.weibo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs transition-colors hover:bg-white/30">
                          <span>🔴</span> 微博
                        </a>
                      )}
                      {technician.socialMedia.xiaohongshu && (
                        <a href={technician.socialMedia.xiaohongshu} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs transition-colors hover:bg-white/30">
                          <span>📕</span> 小红书
                        </a>
                      )}
                      {technician.socialMedia.douyin && (
                        <a href={technician.socialMedia.douyin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs transition-colors hover:bg-white/30">
                          <span>🎵</span> 抖音
                        </a>
                      )}
                      {technician.socialMedia.kuaishou && (
                        <a href={technician.socialMedia.kuaishou} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs transition-colors hover:bg-white/30">
                          <span>📱</span> 快手
                        </a>
                      )}
                      {technician.socialMedia.wechat && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs">
                          <span>💬</span> 微信
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 border-t border-white/20 pt-4">
                  <p className="text-xs text-white/60">长按识别二维码或点击链接预约服务</p>
                  <p className="mt-1 text-xs text-white/40">截图此名片可直接分享给客户</p>
                </div>

                {technician?.invitationCode && (
                  <div className="mt-4 border-t border-white/20 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="mb-1 text-xs text-white/70">我的邀请码</p>
                        <p className="text-lg font-bold tracking-wider text-white">{technician.invitationCode}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (technician.invitationCode) {
                            navigator.clipboard.writeText(technician.invitationCode);
                            toast.success('邀请码已复制');
                          }
                        }}
                        className="rounded-full bg-white/20 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/30"
                      >
                        复制
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-white/60">客户可使用邀请码关联您的服务</p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-900">分享链接</p>
                <p className="mt-1 text-xs text-gray-500">把主页链接发给客户，客户可查看名片并继续预约。</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => void handleShare()}
                    className="min-h-[48px] rounded-2xl bg-[#FF5A66] px-4 py-3 text-sm font-medium text-white"
                  >
                    立即分享
                  </button>
                  <button
                    onClick={() => void copyShareUrl()}
                    className="min-h-[48px] rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white"
                  >
                    复制链接
                  </button>
                </div>
                <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white p-3">
                  <p className="text-xs text-gray-400">分享链接</p>
                  <p className="mt-1 break-all text-sm text-gray-700">{shareUrl}</p>
                  {technician?.invitationCode && (
                    <div className="mt-2 border-t border-gray-100 pt-2">
                      <p className="text-xs text-gray-400">邀请码</p>
                      <p className="mt-1 text-sm font-mono text-pink-500">{technician.invitationCode}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ServiceTypeSetupModal
        isOpen={showServiceTypeModal}
        isForceSetup={false}
        onClose={() => {
          setShowServiceTypeModal(false);
        }}
        onSubmit={handleServiceTypeSubmit}
        existingShops={technician?.shopAddresses || []}
        initialHomeService={!!technician?.homeService}
        initialShopService={!!technician?.shopService}
      />
    </div>
  );
};
