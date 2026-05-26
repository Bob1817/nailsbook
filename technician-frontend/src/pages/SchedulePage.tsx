import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ordersService } from '../services/orders';
import {
  addDays,
  orderStatusLabels,
  formatClock,
  getDurationMinutes,
  isSameDay,
  startOfDay,
  type OrderStatus,
  type TechnicianOrder,
} from '../services/technicianData';
import { AppPage } from '../components/layout/AppPage';
import { Card } from '../components/base/Card';

const serviceTypeLabels: Record<string, string> = {
  home: '上门美甲',
  shop: '到店美甲',
};

const statusPillClass: Record<OrderStatus, string> = {
  pending_quote: 'bg-[#fff6eb] text-[#b87425]',
  pending_agree: 'bg-[#fff4df] text-[#c8892f]',
  pending_confirm: 'bg-[#fff6eb] text-[#b87425]',
  pending_home: 'bg-[#e8f5e9] text-[#2e7d32]',
  pending_shop: 'bg-[#e3f2fd] text-[#1565c0]',
  in_progress: 'bg-[#ffe9f0] text-pink-500',
  completed: 'bg-[#edf8f1] text-[#3b9460]',
  cancelled: 'bg-[#f4f4f5] text-[#8f8f95]',
};

const timelineDotColors: Record<OrderStatus, string> = {
  pending_quote: '#B3B3B3',
  pending_agree: '#FF9F43',
  pending_confirm: '#FF9F43',
  pending_home: '#FF5A66',
  pending_shop: '#FF5A66',
  in_progress: '#FF9F43',
  completed: '#22C55E',
  cancelled: '#B3B3B3',
};

function sameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekdayShort(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date);
}

function getRelativeDayLabel(date: Date) {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff === 2) return '后天';
  return null;
}

function estimateDistance(orders: TechnicianOrder[]) {
  if (orders.length === 0) return 0;
  if (orders.length === 1) return 2.8;
  return Number((orders.length * 3.15).toFixed(1));
}

function estimateTravelMinutes(orders: TechnicianOrder[]) {
  if (orders.length === 0) return 0;
  return orders.length * 24 + Math.max(0, orders.length - 1) * 11;
}

function CustomerAvatar({ name, avatarUrl, size = 36 }: { name: string; avatarUrl?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const showImage = avatarUrl && !imgError;

  if (showImage) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  const bgColors = [
    'linear-gradient(135deg, #FFDCE4 0%, #FFC8D6 100%)',
    'linear-gradient(135deg, #FFF0D8 0%, #FFE3B8 100%)',
    'linear-gradient(135deg, #EEE7FF 0%, #DCD0FF 100%)',
    'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
  ];
  const bg = bgColors[name.charCodeAt(0) % bgColors.length];

  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundImage: bg,
        fontSize: size * 0.4,
        fontWeight: 600,
        color: '#666',
      }}
    >
      {name.slice(0, 1)}
    </div>
  );
}

export const SchedulePage: React.FC = () => {
  const { technician } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<TechnicianOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDate, setActiveDate] = useState<Date>(() => {
    const dateParam = searchParams.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const d = new Date(`${dateParam}T00:00:00`);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  // 处理后续路由更新时携带的 ?date= 参数
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const d = new Date(`${dateParam}T00:00:00`);
      if (!isNaN(d.getTime())) {
        setActiveDate(d);
        // 用完即清掉，避免 URL 一直挂着
        setSearchParams({}, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const dateStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadOrders() {
      setIsLoading(true);
      const nextOrders = await ordersService.list({ technicianId: technician?.id });
      if (!cancelled) {
        setOrders(nextOrders);
        setIsLoading(false);
      }
    }
    void loadOrders();
    return () => { cancelled = true; };
  }, [technician?.id]);

  // Generate dates starting from tomorrow for the scrollable strip
  const scrollDateOptions = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => {
        const date = addDays(new Date(), i + 1);
        return { date, key: toDateKey(date) };
      }),
    [],
  );

  const orderDateKeys = useMemo(
    () => new Set(orders.map((o) => toDateKey(new Date(o.startTime)))),
    [orders],
  );

  const todayDate = new Date();
  const todayKey = toDateKey(todayDate);
  const isTodayActive = sameCalendarDay(activeDate, todayDate);
  const todayHasOrders = orderDateKeys.has(todayKey);

  const dayOrders = useMemo(
    () =>
      orders
        .filter((o) => isSameDay(o.startTime, activeDate))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [activeDate, orders],
  );

  const tripOrders = useMemo(
    () =>
      dayOrders.filter((o) =>
        ['pending_home', 'pending_shop', 'in_progress'].includes(o.status),
      ),
    [dayOrders],
  );

  const nextOrder = tripOrders[0] ?? null;

  const summary = useMemo(() => {
    // 统计也只针对行程订单（已确认/进行中）
    const totalServiceMinutes = tripOrders.reduce(
      (sum, o) => sum + getDurationMinutes(o.startTime, o.endTime),
      0,
    );
    const travelMinutes = estimateTravelMinutes(tripOrders);
    const totalAmount = tripOrders.reduce((sum, o) => sum + o.price, 0);
    const completedCount = tripOrders.filter((o) => o.status === 'in_progress').length;
    return {
      count: tripOrders.length,
      distance: estimateDistance(tripOrders),
      duration: totalServiceMinutes + travelMinutes,
      amount: totalAmount,
      completed: completedCount,
    };
  }, [tripOrders]);

  const resetToToday = () => {
    setActiveDate(new Date());
    if (dateStripRef.current) {
      dateStripRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  return (
    <AppPage
      className="schedule-page overflow-x-hidden"
      title="行程"
      subtitle="高效规划路线，准时上门服务"
    >
      {/* ===== 日期选择器 ===== */}
      <div className="flex gap-2 mb-4">
        {/* 今天 — 固定在左侧，不随滚动消失 */}
        <button
          type="button"
          onClick={resetToToday}
          className={`shrink-0 w-[56px] text-center rounded-[14px] cursor-pointer transition-colors ${
            isTodayActive
              ? 'bg-primary text-white py-2.5'
              : 'bg-[#f8f8f8] text-text-primary py-2.5'
          }`}
        >
          <div className={`text-[11px] ${isTodayActive ? 'text-white/80' : 'text-text-tertiary'}`}>
            今天
          </div>
          <div className={`text-[20px] font-bold leading-tight mt-0.5 ${isTodayActive ? 'text-white' : 'text-text-primary'}`}>
            {todayDate.getDate()}
          </div>
          <div className={`text-[11px] ${isTodayActive ? 'text-white/80' : 'text-text-tertiary'}`}>
            {todayDate.getMonth() + 1}月
          </div>
          <div
            className={`w-1 h-1 rounded-full mx-auto mt-1 ${
              isTodayActive
                ? 'bg-white'
                : todayHasOrders
                  ? 'bg-[#22c55e]'
                  : 'bg-transparent'
            }`}
          />
        </button>
        {/* 其余日期 — 可横向滚动 */}
        <div
          ref={dateStripRef}
          className="flex gap-2 overflow-x-auto flex-1 scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {scrollDateOptions.map(({ date, key }) => {
            const isActive = sameCalendarDay(activeDate, date);
            const relativeLabel = getRelativeDayLabel(date);
            const weekday = getWeekdayShort(date);
            const hasOrders = orderDateKeys.has(key);

            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveDate(date)}
                className={`shrink-0 w-[56px] text-center rounded-[14px] cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-primary text-white py-2.5'
                    : 'bg-[#f8f8f8] text-text-primary py-2.5'
                }`}
              >
                <div className={`text-[11px] ${isActive ? 'text-white/80' : 'text-text-tertiary'}`}>
                  {relativeLabel || weekday}
                </div>
                <div className={`text-[20px] font-bold leading-tight mt-0.5 ${isActive ? 'text-white' : 'text-text-primary'}`}>
                  {date.getDate()}
                </div>
                <div className={`text-[11px] ${isActive ? 'text-white/80' : 'text-text-tertiary'}`}>
                  {date.getMonth() + 1}月
                </div>
                <div
                  className={`w-1 h-1 rounded-full mx-auto mt-1 ${
                    isActive
                      ? 'bg-white'
                      : hasOrders
                        ? 'bg-[#22c55e]'
                        : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Section 1: 下一单卡片 ===== */}
      {!isLoading && nextOrder && (
        <Card className="mb-4 overflow-hidden p-0">
          <div
            className="p-4"
            style={{ background: 'linear-gradient(135deg, #fff5f5, #fff)' }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="text-[28px] font-bold text-text-primary">
                  {formatClock(nextOrder.startTime)}
                </div>
                <div className="text-sm text-text-secondary mt-1">
                  预计 {formatClock(nextOrder.endTime)} 结束
                </div>
                <div className="flex items-center gap-2.5 mt-3">
                  <CustomerAvatar
                    name={nextOrder.customerName}
                    avatarUrl={nextOrder.customerAvatar}
                    size={36}
                  />
                  <div className="font-semibold text-base">{nextOrder.customerName}</div>
                </div>
                <div className="flex gap-2 mt-2">
                  {nextOrder.serviceType && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                      {serviceTypeLabels[nextOrder.serviceType] || nextOrder.serviceType}
                    </span>
                  )}
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                    {nextOrder.serviceName}
                  </span>
                </div>
                <div className="text-[13px] text-text-tertiary mt-2">
                  📍 {nextOrder.address}
                </div>
              </div>
              <div className="text-center shrink-0 ml-3">
                <div className="bg-white border border-gray-100 rounded-xl p-3">
                  <div className="text-[11px] text-text-tertiary">距出发</div>
                  <div className="text-2xl font-bold text-primary mt-0.5">
                    {(() => {
                      const mins = Math.max(0, Math.round((new Date(nextOrder.startTime).getTime() - Date.now()) / 60000));
                      return mins >= 60 ? `${Math.floor(mins / 60)}时${mins % 60}分` : `${mins}分`;
                    })()}
                  </div>
                  <div className="text-[11px] text-text-tertiary">建议提前出发</div>
                </div>
              </div>
            </div>

            {/* 路线示意图 */}
            <div className="mt-4 bg-[#f8f8f8] rounded-xl p-3 flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
              <div className="flex-1 h-0.5 border-t-2 border-dashed border-gray-200" />
              <div className="text-xs text-text-secondary shrink-0">
                约 {estimateDistance([nextOrder])}km · 预计 {estimateTravelMinutes([nextOrder])} 分钟
              </div>
              <div className="flex-1 h-0.5 border-t-2 border-dashed border-gray-200" />
              <div className="w-2 h-2 bg-gray-800 rounded-full shrink-0" />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white rounded-[10px] py-2.5 text-sm font-semibold min-h-[44px]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 21s-6-4.35-6-10a6 6 0 1112 0c0 5.65-6 10-6 10zm0-8.25a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5z" />
                </svg>
                开始导航
              </button>
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#f5f5f5] text-text-primary rounded-[10px] py-2.5 text-sm font-semibold min-h-[44px]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h2.7a1 1 0 01.95.68l1.2 3.59a1 1 0 01-.5 1.21l-1.76.88a11.04 11.04 0 005.5 5.5l.88-1.76a1 1 0 011.21-.5l3.59 1.2a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
                </svg>
                联系客户
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ===== Section 2: 当日数据总结 ===== */}
      <Card className="mb-4 p-4">
        <div className="flex gap-3">
          {[
            { value: summary.count, unit: '', label: '今日行程' },
            { value: summary.distance, unit: 'km', label: '总里程' },
            { value: `¥${summary.amount}`, unit: '', label: '预计收入' },
            { value: `${summary.completed}/${summary.count}`, unit: '', label: '已完成' },
          ].map((item) => (
            <div key={item.label} className="flex-1 bg-[#f8f8f8] rounded-xl p-3 text-center">
              <div className="text-[20px] font-bold text-text-primary">
                {item.value}
                {item.unit && <span className="text-[11px] font-medium text-text-secondary ml-0.5">{item.unit}</span>}
              </div>
              <div className="text-[11px] text-text-tertiary mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* 路线时间轴 - 仅展示确认后/进行中的行程 */}
      {tripOrders.length > 0 && (
        <Card className="mb-4 p-4">
          <div className="text-sm font-semibold text-text-primary mb-3">当日路线</div>
          <div className="space-y-0">
            {tripOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 cursor-pointer"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: timelineDotColors[order.status] || '#B3B3B3' }}
                />
                <div className="text-sm font-semibold w-[50px] shrink-0">
                  {formatClock(order.startTime)}
                </div>
                <CustomerAvatar
                  name={order.customerName}
                  avatarUrl={order.customerAvatar}
                  size={24}
                />
                <div className="text-sm flex-1 min-w-0 truncate">
                  {order.customerName} · {serviceTypeLabels[order.serviceType || ''] || order.serviceName}
                </div>
                <span className={`text-xs shrink-0 ${orderStatusLabels[order.status] === '已完成' ? 'text-[#22c55e]' : order.status === 'in_progress' ? 'text-[#f59e0b]' : order.status === 'pending_home' || order.status === 'pending_shop' ? 'text-primary font-semibold' : 'text-text-tertiary'}`}>
                  {orderStatusLabels[order.status]}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ===== Section 3: 行程列表 ===== */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-text-primary">
          {sameCalendarDay(activeDate, new Date()) ? '今日行程' : `${activeDate.getMonth() + 1}月${activeDate.getDate()}日行程`}
        </h2>
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="text-sm text-primary font-medium"
        >
          全部订单
        </button>
      </div>

      {isLoading ? (
        <Card className="py-8 text-center text-sm text-text-tertiary">行程加载中...</Card>
      ) : tripOrders.length === 0 ? (
        <Card className="py-8 text-center text-sm text-text-tertiary">暂无行程</Card>
      ) : (
        <div className="space-y-3">
          {tripOrders.map((order) => (
            <Card
              key={order.id}
              className="p-4 cursor-pointer"
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="text-[20px] font-bold text-text-primary w-[56px] shrink-0">
                    {formatClock(order.startTime)}
                  </div>
                  <CustomerAvatar
                    name={order.customerName}
                    avatarUrl={order.customerAvatar}
                    size={36}
                  />
                  <div>
                    <div className="text-[15px] font-semibold text-text-primary">{order.customerName}</div>
                    <div className="text-xs text-text-tertiary">
                      {serviceTypeLabels[order.serviceType || ''] || '预约服务'} · {order.serviceName}
                    </div>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 ${statusPillClass[order.status]}`}>
                  {orderStatusLabels[order.status]}
                </span>
              </div>
              <div className="text-xs text-text-tertiary mt-2">📍 {order.address}</div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white rounded-lg py-2 text-[13px] min-h-[44px]"
                  onClick={(e) => { e.stopPropagation(); /* TODO: open nav */ }}
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 21s-6-4.35-6-10a6 6 0 1112 0c0 5.65-6 10-6 10zm0-8.25a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5z" />
                  </svg>
                  去导航
                </button>
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#f5f5f5] text-text-primary rounded-lg py-2 text-[13px] min-h-[44px]"
                  onClick={(e) => { e.stopPropagation(); /* TODO: contact client */ }}
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h2.7a1 1 0 01.95.68l1.2 3.59a1 1 0 01-.5 1.21l-1.76.88a11.04 11.04 0 005.5 5.5l.88-1.76a1 1 0 011.21-.5l3.59 1.2a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
                  </svg>
                  联系客户
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppPage>
  );
};
