import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { bookingsService } from '../services/bookings';
import {
  addDays,
  bookingStatusLabels,
  formatClock,
  formatMoney,
  getDurationMinutes,
  isSameDay,
  type BookingStatus,
  type TechnicianBooking,
} from '../services/technicianData';
import { AppPage } from '../components/layout/AppPage';
import { Card } from '../components/base/Card';
import { Button } from '../components/base/Button';
import { Tag } from '../components/base/Tag';
import { AMapContainer } from '../components/map/AMapContainer';

// Convert bookings to map markers with mock coordinates
// In production, these should come from the booking's actual lat/lng
function useMapMarkers(bookings: TechnicianBooking[]) {
  return useMemo(() => {
    // Generate mock coordinates around Beijing for demo
    // In production, use actual booking coordinates from booking.lat / booking.lng
    const baseLng = 116.397428;
    const baseLat = 39.90923;

    return bookings.map((booking, index) => {
      // Generate slightly different coordinates for each booking
      const offsetLng = Math.sin(index * 1.5) * 0.05;
      const offsetLat = Math.cos(index * 1.2) * 0.04;

      return {
        id: booking.id,
        position: [baseLng + offsetLng, baseLat + offsetLat] as [number, number],
        title: booking.customerName,
        label: `${index + 1}. ${booking.customerName}`,
      };
    });
  }, [bookings]);
}

const timelineDotColors = ['#FF5A66', '#FF9F43', '#8B78FF', '#B3B3B3'];

const appointmentStatusVariant: Record<BookingStatus, 'neutral' | 'primary' | 'warning' | 'success'> = {
  pending_confirm: 'neutral',
  confirmed: 'warning',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'neutral',
};

const outlineButtonClass = 'min-h-[44px] px-md text-body-sm font-medium';
const compactTagClass = 'max-w-full truncate px-[10px] py-[4px] text-[11px] font-medium leading-[16px]';
const mapCardTagClass = 'w-fit max-w-full truncate px-[8px] py-[2px] text-[10px] leading-[14px]';
const serviceTypeLabels: Record<string, string> = {
  home: '上门美甲',
  shop: '到店美甲',
};
const serviceTypeColors: Record<string, string> = {
  home: 'bg-orange-50 text-orange-600',
  shop: 'bg-blue-50 text-blue-600',
};

const scheduleStatusPillClass: Record<BookingStatus, string> = {
  pending_confirm: 'bg-[#fff6eb] text-[#b87425]',
  confirmed: 'bg-[#fff4df] text-[#c8892f]',
  in_progress: 'bg-[#ffe9f0] text-pink-500',
  completed: 'bg-[#edf8f1] text-[#3b9460]',
  cancelled: 'bg-[#f4f4f5] text-[#8f8f95]',
};

const mapCardAnchors = [
  { top: '23%', left: '6%' },
  { top: '20%', right: '6%' },
  { bottom: '22%', left: '7%' },
  { bottom: '19%', right: '7%' },
];

function estimateDistance(bookings: TechnicianBooking[]) {
  if (bookings.length === 0) return 0;
  if (bookings.length === 1) return 2.8;
  return Number((bookings.length * 3.15).toFixed(1));
}

function estimateTravelMinutes(bookings: TechnicianBooking[]) {
  if (bookings.length === 0) return 0;
  return bookings.length * 24 + Math.max(0, bookings.length - 1) * 11;
}

function estimateSavedMinutes(bookings: TechnicianBooking[]) {
  if (bookings.length <= 1) return 0;
  return 18;
}

function getRouteDurationParts(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return { hours, minutes: rest };
}

function buildTagLabel(serviceName: string) {
  return serviceName.length > 5 ? `${serviceName.slice(0, 5)}…` : serviceName;
}

function buildAvatarBackground(name: string) {
  const colors = [
    'linear-gradient(135deg, #FFDCE4 0%, #FFC8D6 100%)',
    'linear-gradient(135deg, #FFF0D8 0%, #FFE3B8 100%)',
    'linear-gradient(135deg, #EEE7FF 0%, #DCD0FF 100%)',
    'linear-gradient(135deg, #FFE2EC 0%, #FFD1E1 100%)',
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

function buildScheduleHeading(date: Date, isToday: boolean) {
  if (isToday) return '今日行程';
  return `${date.getMonth() + 1}月${date.getDate()}日行程`;
}

function getMapCardAnchor(index: number) {
  return mapCardAnchors[index % mapCardAnchors.length];
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isTomorrow(date: Date) {
  const tomorrow = addDays(new Date(), 1);
  return sameCalendarDay(date, tomorrow);
}

function getMonthGrid(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leading = (firstDay.getDay() + 6) % 7;
  const total = lastDay.getDate();
  const cells: Array<{ date: Date | null; key: string }> = [];

  for (let index = 0; index < leading; index += 1) {
    cells.push({ date: null, key: `empty-start-${index}` });
  }

  for (let day = 1; day <= total; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date, key: toDateKey(date) });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, key: `empty-end-${cells.length}` });
  }

  return cells;
}

function formatStripDateLabel(date: Date) {
  const short = `${date.getMonth() + 1}.${date.getDate()}`;
  if (sameCalendarDay(date, new Date())) return `今天 ${short}`;
  if (isTomorrow(date)) return `明天 ${short}`;
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date);
  return `${weekday} ${short}`;
}

export const SchedulePage: React.FC = () => {
  const { technician } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<TechnicianBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDate, setActiveDate] = useState(new Date());
  const [mapMode, setMapMode] = useState<'map' | 'list'>('map');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showCalendarSheet, setShowCalendarSheet] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 获取 filter 参数
  const filterParam = searchParams.get('filter');

  const filterOptions = [
    { key: '', label: '全部' },
    { key: 'today', label: '今日' },
    { key: 'pending', label: '待确认' },
    { key: 'confirmed', label: '已确认' },
  ];

  const setFilter = (key: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (key) nextParams.set('filter', key);
    else nextParams.delete('filter');
    setSearchParams(nextParams);
    setShowFilterSheet(false);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadBookings() {
      setIsLoading(true);
      const nextBookings = await bookingsService.list({ technicianId: technician?.id });
      if (!cancelled) {
        setBookings(nextBookings);
        setIsLoading(false);
      }
    }

    void loadBookings();
    return () => {
      cancelled = true;
    };
  }, [technician?.id]);

  const dateOptions = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => {
        const date = addDays(activeDate, index);
        return {
          key: date.toISOString(),
          date,
          label: formatStripDateLabel(date),
        };
      }),
    [activeDate]
  );

  const dayBookings = useMemo(
    () =>
      bookings
        .filter((booking) => isSameDay(booking.startTime, activeDate))
        .filter((booking) => {
          // 根据 filter 参数过滤
          if (!filterParam) return true;
          if (filterParam === 'today') return true; // 今日行程显示全部
          if (filterParam === 'confirmed') return booking.status === 'confirmed';
          if (filterParam === 'pending') return booking.status === 'pending_confirm';
          return true;
        })
        .sort((left, right) => left.startTime.localeCompare(right.startTime)),
    [activeDate, bookings, filterParam]
  );

  // Generate map markers from day bookings
  const mapMarkers = useMapMarkers(dayBookings);

  const summary = useMemo(() => {
    const totalServiceMinutes = dayBookings.reduce(
      (sum, booking) => sum + getDurationMinutes(booking.startTime, booking.endTime),
      0
    );
    const travelMinutes = estimateTravelMinutes(dayBookings);
    const totalAmount = dayBookings.reduce((sum, booking) => sum + booking.price, 0);
    return {
      customers: dayBookings.length,
      distance: estimateDistance(dayBookings),
      duration: totalServiceMinutes + travelMinutes,
      amount: totalAmount,
      saved: estimateSavedMinutes(dayBookings),
      depositPending: dayBookings.filter((booking) => !booking.depositPaid).length,
    };
  }, [dayBookings]);
  const durationParts = getRouteDurationParts(summary.duration);
  const hasTimelineBookings = !isLoading && dayBookings.length > 0;
  const scheduleHeading = buildScheduleHeading(activeDate, sameCalendarDay(activeDate, new Date()));
  const hasActiveFilter = Boolean(filterParam);
  const bookingDateKeys = useMemo(() => new Set(bookings.map((booking) => toDateKey(new Date(booking.startTime)))), [bookings]);
  const monthGrid = useMemo(() => getMonthGrid(currentMonth), [currentMonth]);
  const headerActions = (
    <>
      <button
        type="button"
        onClick={() => {
          setCurrentMonth(new Date(activeDate.getFullYear(), activeDate.getMonth(), 1));
          setShowCalendarSheet(true);
        }}
        className="flex min-h-[44px] shrink-0 items-center gap-[6px] whitespace-nowrap text-body text-text-primary"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        日历
      </button>
      <button
        type="button"
        onClick={() => setShowFilterSheet(true)}
        className={`flex min-h-[44px] shrink-0 items-center gap-[6px] whitespace-nowrap rounded-full px-[10px] text-body transition-colors ${
          hasActiveFilter
            ? 'bg-[#ffe9f0] text-primary'
            : 'text-text-primary'
        }`}
      >
        {hasActiveFilter ? <span className="h-[6px] w-[6px] rounded-full bg-primary" /> : null}
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2l-7 7v5l-4 2v-7L3 6V4z" />
        </svg>
        筛选
      </button>
    </>
  );

  return (
    <AppPage
      className="schedule-page overflow-x-hidden"
      title="行程"
      subtitle="高效规划路线，准时上门服务"
      actions={headerActions}
    >
      <Card className="overflow-hidden px-xs py-xs">
        <div className="grid items-center gap-[6px]" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr)) 36px' }}>
          {dateOptions.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveDate(item.date)}
              className={`relative flex min-h-[44px] min-w-0 items-center justify-center rounded-[14px] border px-[6px] text-[10px] font-medium leading-none whitespace-nowrap transition-colors min-[391px]:text-[11px] ${
                sameCalendarDay(activeDate, item.date)
                  ? 'border-[#ffd6db] bg-[#fff5f6] text-primary'
                  : 'border-transparent bg-transparent text-text-secondary'
              }`}
            >
              {sameCalendarDay(activeDate, item.date) && sameCalendarDay(item.date, new Date()) ? (
                <span className="absolute right-[8px] top-[8px] h-[5px] w-[5px] rounded-full bg-primary shadow-[0_0_0_2px_rgba(255,255,255,0.9)]" />
              ) : null}
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setCurrentMonth(new Date(activeDate.getFullYear(), activeDate.getMonth(), 1));
              setShowCalendarSheet(true);
            }}
            className="flex min-h-[44px] w-9 items-center justify-center rounded-[14px] text-text-secondary"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </Card>

      <Card className="border border-[#f2e6ec] px-lg py-lg">
        <div className="grid grid-cols-2 gap-y-md min-[391px]:grid-cols-4">
          <div className="px-xs text-center">
            <p className="flex items-end justify-center gap-[3px] text-text-primary">
              <span className="text-[24px] font-semibold leading-none">{summary.customers}</span>
              <span className="pb-[2px] text-[11px] font-medium leading-none text-text-secondary">位</span>
            </p>
            <p className="mt-[6px] text-caption text-text-secondary">服务客户</p>
          </div>
          <div className="border-border px-xs text-center min-[391px]:border-l">
            <p className="flex items-end justify-center gap-[3px] text-text-primary">
              <span className="text-[24px] font-semibold leading-none">{summary.distance}</span>
              <span className="pb-[2px] text-[11px] font-medium leading-none text-text-secondary">km</span>
            </p>
            <p className="mt-[6px] text-caption text-text-secondary">总里程</p>
          </div>
          <div className="border-border px-xs text-center min-[391px]:border-l">
            <p className="flex items-end justify-center gap-[3px] text-text-primary">
              <span className="text-[24px] font-semibold leading-none">{durationParts.hours}</span>
              <span className="pb-[2px] text-[11px] font-medium leading-none text-text-secondary">时</span>
              <span className="text-[24px] font-semibold leading-none">{durationParts.minutes}</span>
              <span className="pb-[2px] text-[11px] font-medium leading-none text-text-secondary">分</span>
            </p>
            <p className="mt-[6px] text-caption text-text-secondary">预计时长</p>
          </div>
          <div className="border-border px-xs text-center min-[391px]:border-l">
            <p className="flex items-end justify-center gap-[3px] text-primary">
              <span className="pb-[2px] text-[11px] font-medium leading-none text-primary">¥</span>
              <span className="text-[24px] font-semibold leading-none">{summary.amount}</span>
            </p>
            <p className="mt-[6px] text-caption text-text-secondary">预计收入</p>
          </div>
        </div>
        <p className="mt-md text-center text-caption text-text-tertiary">* 预计收入基于已确认预约的报价金额</p>
      </Card>

      <Card className="w-full overflow-hidden p-0">
        <div className="relative h-[420px] overflow-hidden rounded-card bg-[#f7f7f7]">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: `
                linear-gradient(rgba(221,221,221,0.16) 1px, transparent 1px),
                linear-gradient(90deg, rgba(221,221,221,0.16) 1px, transparent 1px),
                radial-gradient(circle at 22% 32%, rgba(255, 230, 233, 0.3), transparent 26%),
                radial-gradient(circle at 74% 44%, rgba(232, 238, 246, 0.42), transparent 32%),
                linear-gradient(180deg, rgba(255,255,255,0.82), rgba(248,248,248,0.92))
              `,
              backgroundSize: '54px 54px, 54px 54px, 100% 100%, 100% 100%, 100% 100%',
            }}
          />

          <div className="absolute left-md right-md top-md z-20 flex flex-col items-stretch gap-sm min-[391px]:flex-row min-[391px]:items-center">
            <div className="flex min-w-0 rounded-button border border-black/[0.06] bg-white/96 p-[4px] shadow-card backdrop-blur-sm min-[391px]:flex-1">
              <button
                onClick={() => setMapMode('map')}
                className={`flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-[6px] rounded-button px-sm text-body font-medium whitespace-nowrap ${
                  mapMode === 'map' ? 'bg-[#ffe9f0] text-primary' : 'text-text-secondary'
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2m0 18l6-3m-6 3V2m6 15l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 2" />
                </svg>
                地图模式
              </button>
              <button
                onClick={() => setMapMode('list')}
                className={`flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-[6px] rounded-button px-sm text-body font-medium whitespace-nowrap ${
                  mapMode === 'list' ? 'bg-[#ffe9f0] text-primary' : 'text-text-secondary'
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                列表模式
              </button>
            </div>
            <div className="self-start rounded-pill border border-black/[0.05] bg-white/96 px-sm py-[9px] text-center text-[11px] leading-[16px] text-text-secondary shadow-card backdrop-blur-sm min-[391px]:ml-auto min-[391px]:self-center min-[391px]:max-w-[118px]">
              路线已优化
            </div>
          </div>

          {mapMode === 'map' ? (
            <>
              <AMapContainer
                markers={mapMarkers}
                showRoute={dayBookings.length > 1}
                className="absolute inset-0"
                onMarkerClick={(marker) => navigate(`/bookings/${marker.id}`)}
              />

              {dayBookings.length > 0
                ? dayBookings.map((booking, index) => {
                    const anchor = getMapCardAnchor(index);
                    return (
                      <button
                        key={booking.id}
                        onClick={() => navigate(`/bookings/${booking.id}`)}
                        className="absolute z-10 w-[136px] rounded-[18px] border border-white/90 bg-white/96 px-[12px] py-[12px] text-left shadow-[0_16px_32px_rgba(29,35,53,0.14)] backdrop-blur-sm"
                        style={anchor}
                      >
                        <div className="flex items-center justify-between gap-[8px]">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-caption font-semibold text-white">
                            {index + 1}
                          </span>
                          <p className="text-[13px] font-semibold leading-[16px] text-text-primary">
                            {formatClock(booking.startTime)}
                          </p>
                        </div>
                        <p className="mt-[8px] truncate text-[13px] font-semibold leading-[16px] text-text-primary">
                          {booking.customerName}
                        </p>
                        <div className="mt-[6px] flex flex-wrap items-center gap-[6px]">
                          {booking.serviceType && (
                            <span className={`rounded-full px-[6px] py-[1px] text-[9px] font-medium ${serviceTypeColors[booking.serviceType] || 'bg-gray-50 text-gray-600'}`}>
                              {serviceTypeLabels[booking.serviceType] || booking.serviceType}
                            </span>
                          )}
                          <Tag variant={appointmentStatusVariant[booking.status]} className={mapCardTagClass}>
                            {bookingStatusLabels[booking.status]}
                          </Tag>
                        </div>
                      </button>
                    );
                  })
                : null}
            </>
          ) : (
            <div className="absolute left-md right-md top-[84px] bottom-0 overflow-y-auto px-[1px] pb-[120px]">
              {dayBookings.map((booking, index) => (
                <button
                  key={booking.id}
                  onClick={() => navigate(`/bookings/${booking.id}`)}
                  className="mb-sm w-full overflow-hidden rounded-card border border-black/[0.05] bg-white/96 px-md py-md text-left shadow-card last:mb-0"
                >
                  <div className="flex items-start justify-between gap-sm">
                    <div className="flex min-w-0 items-center gap-md">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-caption font-semibold text-white">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-x-[8px]">
                          <p className="truncate text-title-sm font-semibold text-text-primary">{booking.customerName}</p>
                          {booking.serviceType && (
                            <span className={`shrink-0 rounded-full px-[6px] py-[1px] text-[9px] font-medium ${serviceTypeColors[booking.serviceType] || 'bg-gray-50 text-gray-600'}`}>
                              {serviceTypeLabels[booking.serviceType] || booking.serviceType}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-caption text-text-secondary">
                          {formatClock(booking.startTime)} · {booking.address}
                        </p>
                      </div>
                    </div>
                    <Tag variant={appointmentStatusVariant[booking.status]} className={`shrink-0 ${compactTagClass}`}>
                      {bookingStatusLabels[booking.status]}
                    </Tag>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            className="absolute bottom-md right-md z-20 flex min-h-[44px] w-[88px] flex-col items-center gap-[8px] rounded-[20px] border border-black/[0.05] bg-white/96 px-sm py-[12px] text-center shadow-card backdrop-blur-sm"
            type="button"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffe9f0] text-primary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18m9-9H3" />
              </svg>
            </span>
            <span className="text-[11px] leading-[15px] text-text-primary">路线规划</span>
          </button>
        </div>
      </Card>

      <div className="flex flex-col gap-md min-[391px]:flex-row min-[391px]:items-start min-[391px]:justify-between">
        <div className="min-w-0">
          <h2 className="text-title-lg font-semibold text-text-primary">{scheduleHeading}</h2>
          <p className="mt-xs text-body-sm text-text-tertiary">
            （{activeDate.getMonth() + 1}月{activeDate.getDate()}日 {new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(activeDate)}）
            {filterParam && (
              <span className="ml-2 inline-flex items-center rounded-full bg-[#ffe9f0] px-2 py-0.5 text-xs text-pink-500">
                {filterParam === 'today' ? '今日行程' : filterParam === 'confirmed' ? '待服务' : filterParam === 'pending' ? '待确认' : ''}
                <button
                  onClick={() => {
                    searchParams.delete('filter');
                    setSearchParams(searchParams);
                  }}
                  className="ml-1 text-pink-500 hover:text-[#ea5e93]"
                >
                  ×
                </button>
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          className={`${outlineButtonClass} w-full text-primary min-[391px]:w-auto`}
          onClick={() => navigate('/orders')}
        >
          查看全部
        </Button>
      </div>

      <div className="relative pl-[18px]">
        {hasTimelineBookings ? (
          <div
            className="absolute bottom-[24px] top-[18px] w-px"
            style={{
              left: '4px',
              background: 'linear-gradient(180deg, #C8D6FF 0%, #EDE8FF 52%, #E8E8E8 100%)',
            }}
          />
        ) : null}
        {isLoading ? (
          <Card className="py-xl text-center text-body text-text-tertiary">行程加载中...</Card>
        ) : dayBookings.length === 0 ? (
          <Card className="py-xl text-center text-body text-text-tertiary">当前日期还没有预约安排</Card>
        ) : (
          dayBookings.map((booking, index) => (
            <div key={booking.id} className="relative pb-md">
              <div
                className="absolute left-[-2px] top-[22px] h-3 w-3 rounded-full ring-4 ring-[#fff9f8]"
                style={{ backgroundColor: timelineDotColors[index % timelineDotColors.length] }}
              />
              <Card
                className="px-md py-md cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/bookings/${booking.id}`)}
              >
                <div className="flex flex-col gap-[12px]">
                  <div className="flex items-start justify-between gap-md">
                    <div className="min-w-0">
                      <p className="text-[18px] font-semibold leading-[22px] text-primary">{formatClock(booking.startTime)}</p>
                      <p className="mt-[3px] text-[12px] leading-[18px] text-text-tertiary">
                        预计 {getDurationMinutes(booking.startTime, booking.endTime)} 分钟
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[15px] font-semibold leading-[18px] text-primary">{formatMoney(booking.price)}</p>
                      <span
                        className={`mt-[8px] inline-flex rounded-full px-[12px] py-[6px] text-[11px] font-medium leading-[16px] ${scheduleStatusPillClass[booking.status]}`}
                      >
                        {bookingStatusLabels[booking.status]}
                      </span>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-start gap-[12px]">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-[#ea5e93]"
                      style={{ backgroundImage: buildAvatarBackground(booking.customerName) }}
                    >
                      {booking.customerName.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-[8px] gap-y-[6px]">
                        <p className="truncate text-title-sm font-semibold text-text-primary">{booking.customerName}</p>
                        {booking.serviceType && (
                          <span className={`rounded-full px-[8px] py-[3px] text-[10px] font-medium leading-[14px] ${serviceTypeColors[booking.serviceType] || 'bg-gray-50 text-gray-600'}`}>
                            {serviceTypeLabels[booking.serviceType] || booking.serviceType}
                          </span>
                        )}
                        <Tag
                          variant="primary"
                          className="max-w-full truncate px-[8px] py-[3px] text-[10px] font-medium leading-[14px]"
                        >
                          {buildTagLabel(booking.serviceName)}
                        </Tag>
                      </div>
                      <p className="mt-[8px] text-body-sm leading-[20px] text-text-secondary">{booking.address}</p>
                      <div className="mt-[8px] flex flex-wrap gap-[8px] text-[12px] leading-[18px] text-text-secondary">
                        <span className="rounded-pill bg-[#f8f8f8] px-[10px] py-[5px]">
                          定金{' '}
                          <span className={booking.depositPaid ? 'font-medium text-success' : 'font-medium text-danger'}>
                            {booking.depositPaid ? '已收' : '未收'}
                          </span>
                        </span>
                        <span className="rounded-pill bg-[#f8f8f8] px-[10px] py-[5px]">
                          时长 <span className="font-medium text-text-primary">{getDurationMinutes(booking.startTime, booking.endTime)} 分钟</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-[#f2e6ec] pt-[12px]">
                    <div className="grid grid-cols-2 gap-sm">
                      <button
                        type="button"
                        className="flex min-h-[44px] w-full items-center justify-center gap-[8px] rounded-[16px] bg-[#ffe9f0] px-md text-[13px] font-medium text-primary transition-colors active:bg-[#ffe4e9]"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: 打开导航
                        }}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s-6-4.35-6-10a6 6 0 1112 0c0 5.65-6 10-6 10zm0-8.25a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5z" />
                        </svg>
                        导航
                      </button>
                      <button
                        type="button"
                        className="flex min-h-[44px] w-full items-center justify-center gap-[8px] rounded-[16px] border border-[#f2e6ec] bg-white px-md text-[13px] font-medium text-text-secondary transition-colors active:bg-[#fff7fa]"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: 联系用户
                        }}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h2.7a1 1 0 01.95.68l1.2 3.59a1 1 0 01-.5 1.21l-1.76.88a11.04 11.04 0 005.5 5.5l.88-1.76a1 1 0 011.21-.5l3.59 1.2a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
                        </svg>
                        联系
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ))
        )}
        {dayBookings.length > 0 ? <p className="py-sm text-center text-caption text-text-tertiary">已到达最后一站</p> : null}
      </div>

      {showFilterSheet ? (
        <div className="fixed inset-0 z-[999] isolate">
          <button
            type="button"
            aria-label="关闭筛选"
            className="absolute inset-0 bg-black/18 backdrop-blur-[1px]"
            onClick={() => setShowFilterSheet(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white px-lg pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-lg shadow-[0_-12px_32px_rgba(18,28,45,0.12)]">
            <div className="mx-auto mb-md h-1.5 w-12 rounded-full bg-[#f2e6ec]" />
            <div className="mb-md flex items-center justify-between">
              <div>
                <h3 className="text-title-md font-semibold text-text-primary">筛选行程</h3>
                <p className="mt-[2px] text-caption text-text-tertiary">按当前日期查看不同状态的预约</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterSheet(false)}
                className="flex h-9 min-w-[44px] items-center justify-center rounded-full bg-[#fff7fa] px-sm text-caption text-text-secondary"
              >
                关闭
              </button>
            </div>
            <div className="space-y-sm">
              {filterOptions.map((opt) => {
                const active = (filterParam || '') === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFilter(opt.key)}
                    className={`flex min-h-[52px] w-full items-center justify-between rounded-[18px] border px-md text-left transition-colors ${
                      active
                        ? 'border-[#ffd6db] bg-[#fff5f6] text-primary'
                        : 'border-[#f2e6ec] bg-white text-text-primary'
                    }`}
                  >
                    <div>
                      <p className="text-body font-medium">{opt.label}</p>
                      <p className="mt-[2px] text-caption text-text-tertiary">
                        {opt.key === ''
                          ? '显示当前日期的全部预约'
                          : opt.key === 'today'
                            ? '聚焦当前日期的所有行程'
                            : opt.key === 'pending'
                              ? '只看待确认预约'
                              : '只看已确认预约'}
                      </p>
                    </div>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                        active ? 'bg-primary text-white' : 'bg-[#f7f2f5] text-text-tertiary'
                      }`}
                    >
                      {active ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {showCalendarSheet ? (
        <div className="fixed inset-0 z-[999] isolate">
          <button
            type="button"
            aria-label="关闭日历"
            className="absolute inset-0 bg-black/18 backdrop-blur-[1px]"
            onClick={() => setShowCalendarSheet(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white px-lg pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-lg shadow-[0_-12px_32px_rgba(18,28,45,0.12)]">
            <div className="mx-auto mb-md h-1.5 w-12 rounded-full bg-[#f2e6ec]" />
            <div className="mb-md flex items-center justify-between">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff7fa] text-text-secondary"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-center">
                <h3 className="text-title-md font-semibold text-text-primary">
                  {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
                </h3>
                <p className="mt-[2px] text-caption text-text-tertiary">带红点的日期表示当天已有预约</p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff7fa] text-text-secondary"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="mb-sm grid grid-cols-7 gap-y-[8px] text-center text-caption text-text-tertiary">
              {['一', '二', '三', '四', '五', '六', '日'].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-[8px]">
              {monthGrid.map((cell) =>
                cell.date ? (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => {
                      setActiveDate(cell.date as Date);
                      setShowCalendarSheet(false);
                    }}
                    className={`relative mx-auto flex h-11 w-11 items-center justify-center rounded-full text-body transition-colors ${
                      sameCalendarDay(activeDate, cell.date)
                        ? 'bg-[#ffe9f0] font-semibold text-primary'
                        : 'text-text-primary'
                    }`}
                  >
                    {bookingDateKeys.has(cell.key) ? (
                      <span className="absolute right-[7px] top-[7px] h-[5px] w-[5px] rounded-full bg-primary" />
                    ) : null}
                    {cell.date.getDate()}
                  </button>
                ) : (
                  <span key={cell.key} className="mx-auto h-11 w-11" />
                )
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AppPage>
  );
};
