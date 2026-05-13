export type OrderStatus =
  | 'pending_quote'
  | 'pending_agree'
  | 'pending_confirm'
  | 'pending_home'
  | 'pending_shop'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface TechnicianOrder {
  id: number;
  orderNo: string;
  customerId: number;
  customerName: string;
  customerPhone?: string;
  customerAvatar?: string;
  serviceName: string;
  address: string;
  startTime: string;
  endTime: string;
  status: OrderStatus;
  price: number;
  quoteRemark: string | null;
  quotedAt: string | null;
  depositPaid: boolean;
  note?: string;
  isLocalDraft?: boolean;
  serviceType?: 'home' | 'shop';
  shopId?: number;
  shopName?: string;
  priceBreakdown?: {
    basePrice: number;
    homeServiceFee?: number;
    nightFee?: number;
    holidayFee?: number;
    otherFees?: number;
  };
  serviceItems?: Array<{
    id: string;
    name: string;
    description?: string;
    images?: string[];
  }>;
}

export interface TechnicianCustomerSummary {
  id: number;
  name: string;
  phone: string;
  address: string;
  tags: string[];
  note: string;
  recentServiceAt?: string;
  totalOrders: number;
  totalSpent: number;
}

export interface TechnicianCustomerDetail extends TechnicianCustomerSummary {
  preferenceStyle: string;
  preferenceColor: string;
  allergyNote: string;
  history: Array<{
    id: number;
    label: string;
    date: string;
    price: number;
    status: string;
    depositPaid?: boolean;
  }>;
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending_quote: '待报价',
  pending_agree: '待同意',
  pending_confirm: '待确认',
  pending_home: '待上门',
  pending_shop: '待到店',
  in_progress: '服务中',
  completed: '已完成',
  cancelled: '已取消',
};

export const orderStatusClasses: Record<OrderStatus, string> = {
  pending_quote: 'bg-orange-100 text-orange-700',
  pending_agree: 'bg-purple-100 text-purple-700',
  pending_confirm: 'bg-yellow-100 text-yellow-700',
  pending_home: 'bg-emerald-100 text-emerald-700',
  pending_shop: 'bg-teal-100 text-teal-700',
  in_progress: 'bg-sky-100 text-sky-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

export const orderStatusActions: Record<OrderStatus, OrderStatus[]> = {
  pending_quote: ['pending_agree', 'cancelled'],
  pending_agree: ['cancelled'],
  pending_confirm: ['pending_home', 'pending_shop', 'cancelled'],
  pending_home: [],
  pending_shop: [],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};

export const fallbackOrders: TechnicianOrder[] = [
  {
    id: 1,
    orderNo: 'ORD20260428001',
    customerId: 1,
    customerName: '王小美',
    customerPhone: '13800138001',
    serviceName: '法式渐变',
    address: '朝阳区建国路88号',
    startTime: '2026-04-28T10:00:00+08:00',
    endTime: '2026-04-28T12:00:00+08:00',
    status: 'pending_confirm',
    price: 299,
    quoteRemark: null,
    quotedAt: null,
    depositPaid: false,
  },
  {
    id: 2,
    orderNo: 'ORD20260428002',
    customerId: 2,
    customerName: '李小红',
    customerPhone: '13800138002',
    serviceName: '纯色跳色',
    address: '海淀区中关村大街1号',
    startTime: '2026-04-28T14:00:00+08:00',
    endTime: '2026-04-28T16:00:00+08:00',
    status: 'pending_home',
    price: 399,
    quoteRemark: null,
    quotedAt: null,
    depositPaid: true,
  },
  {
    id: 3,
    orderNo: 'ORD20260428003',
    customerId: 3,
    customerName: '张小丽',
    customerPhone: '13800138003',
    serviceName: '水晶延长款',
    address: '西城区金融街19号',
    startTime: '2026-04-28T18:00:00+08:00',
    endTime: '2026-04-28T20:00:00+08:00',
    status: 'completed',
    price: 499,
    quoteRemark: null,
    quotedAt: null,
    depositPaid: true,
  },
  {
    id: 4,
    orderNo: 'ORD20260429001',
    customerId: 4,
    customerName: 'Lily',
    customerPhone: '13800138004',
    serviceName: '简约裸色',
    address: '浦东新区张杨路188号',
    startTime: '2026-04-29T11:00:00+08:00',
    endTime: '2026-04-29T12:30:00+08:00',
    status: 'pending_home',
    price: 328,
    quoteRemark: null,
    quotedAt: null,
    depositPaid: true,
  },
];

export const fallbackCustomers: TechnicianCustomerDetail[] = [
  {
    id: 1,
    name: '王小美',
    phone: '13800138001',
    address: '朝阳区建国路88号',
    tags: ['常客', '高频'],
    note: '喜欢精致简约风格',
    recentServiceAt: '2026-04-28T10:00:00+08:00',
    totalOrders: 6,
    totalSpent: 1888,
    preferenceStyle: '简约',
    preferenceColor: '粉色系',
    allergyNote: '无',
    history: [
      { id: 11, label: '法式渐变', date: '2026-04-28T10:00:00+08:00', price: 299, status: 'pending_confirm' },
      { id: 12, label: '猫眼款', date: '2026-04-12T14:30:00+08:00', price: 368, status: 'completed' },
    ],
  },
  {
    id: 2,
    name: '李小红',
    phone: '13800138002',
    address: '海淀区中关村大街1号',
    tags: ['新客'],
    note: '偏爱低饱和颜色',
    recentServiceAt: '2026-04-28T14:00:00+08:00',
    totalOrders: 2,
    totalSpent: 598,
    preferenceStyle: '纯色',
    preferenceColor: '裸色系',
    allergyNote: '无',
    history: [
      { id: 21, label: '纯色跳色', date: '2026-04-28T14:00:00+08:00', price: 399, status: 'pending_home' },
    ],
  },
  {
    id: 3,
    name: '张小丽',
    phone: '13800138003',
    address: '西城区金融街19号',
    tags: ['常客'],
    note: '愿意尝试复杂款式',
    recentServiceAt: '2026-04-28T18:00:00+08:00',
    totalOrders: 8,
    totalSpent: 3560,
    preferenceStyle: '延长款',
    preferenceColor: '红色系',
    allergyNote: '对部分胶水敏感',
    history: [
      { id: 31, label: '水晶延长款', date: '2026-04-28T18:00:00+08:00', price: 499, status: 'completed' },
      { id: 32, label: '法式款', date: '2026-04-03T16:00:00+08:00', price: 428, status: 'completed' },
    ],
  },
];

export function formatMoney(value: number): string {
  return `¥${Math.round(value)}`;
}

function parseSafeDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateLabel(value: string): string {
  const date = parseSafeDate(value);
  if (!date) {
    return '暂无记录';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

export function formatDateTimeLabel(value: string): string {
  const dateLabel = formatDateLabel(value);
  const timeLabel = formatClock(value);

  if (dateLabel === '暂无记录' || timeLabel === '--:--') {
    return '暂无记录';
  }

  return `${dateLabel} ${timeLabel}`;
}

export function formatRelativeDateLabel(value: string, now = new Date()): string {
  const date = parseSafeDate(value);
  if (!date) {
    return '暂无记录';
  }

  const today = startOfDay(now);
  const target = startOfDay(date);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return '今天';
  }

  if (diffDays === -1) {
    return '昨天';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatClock(startTime)} - ${formatClock(endTime)}`;
}

export function formatClock(value: string): string {
  const date = parseSafeDate(value);
  if (!date) {
    return '--:--';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function isSameDay(value: string, base: Date): boolean {
  const date = parseSafeDate(value);
  if (!date) {
    return false;
  }

  return (
    date.getFullYear() === base.getFullYear() &&
    date.getMonth() === base.getMonth() &&
    date.getDate() === base.getDate()
  );
}

export function startOfDay(base: Date): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate());
}

export function addDays(base: Date, offset: number): Date {
  const next = new Date(base);
  next.setDate(base.getDate() + offset);
  return next;
}

export function getDurationMinutes(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

export function detectOrderConflict(
  startTime: string,
  endTime: string,
  orders: TechnicianOrder[],
  ignoreId?: number
): boolean {
  const nextStart = new Date(startTime).getTime();
  const nextEnd = new Date(endTime).getTime();

  return orders.some((order) => {
    if (ignoreId && order.id === ignoreId) {
      return false;
    }

    const currentStart = new Date(order.startTime).getTime();
    const currentEnd = new Date(order.endTime).getTime();
    return nextStart < currentEnd && nextEnd > currentStart;
  });
}

export function buildDashboardSummary(orders: TechnicianOrder[], baseDate: Date) {
  const todayOrders = orders.filter((order) => isSameDay(order.startTime, baseDate));
  const confirmedOrders = todayOrders.filter(
    (order) => order.status === 'pending_home' || order.status === 'pending_shop',
  );
  const pendingOrders = todayOrders.filter((order) => order.status === 'pending_confirm');
  const completedOrders = todayOrders.filter((order) => order.status === 'completed');
  const todayIncome = completedOrders.reduce((sum, order) => sum + order.price, 0);
  const expectedIncome = todayOrders.reduce((sum, order) => sum + order.price, 0);

  return {
    todayOrders,
    confirmedCount: confirmedOrders.length,
    pendingCount: pendingOrders.length,
    completedCount: completedOrders.length,
    todayIncome,
    expectedIncome,
  };
}

export function parseTagString(tags: string | null | undefined): string[] {
  if (!tags) {
    return [];
  }

  return tags
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
