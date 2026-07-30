// 技师预约数据加工：规范化 + 行程展示元数据

const { parseDate, isSameDay } = require('./format');

// ========== 状态映射 ==========
const ORDER_STATUS_LABELS = {
  pending_quote:   '待报价',
  pending_agree:   '待用户确认',
  pending_confirm: '待我确认',
  pending_client_confirm: '待客户确认',
  quoted:         '已报价',
  confirmed:      '已确认',
  pending_home:    '待上门',
  pending_shop:    '待到店',
  in_progress:     '进行中',
  completed:       '已完成',
  cancelled:       '已取消',
  rejected:        '已拒绝',
  expired:         '已过期'
};

// CSS 类名（在 wxss 里定义对应配色）
const ORDER_STATUS_TONES = {
  pending_quote:   'tone-orange',
  pending_agree:   'tone-purple',
  pending_confirm: 'tone-yellow',
  pending_client_confirm: 'tone-purple',
  quoted:          'tone-sky',
  confirmed:       'tone-purple',
  pending_home:    'tone-emerald',
  pending_shop:    'tone-teal',
  in_progress:     'tone-sky',
  completed:       'tone-gray',
  cancelled:       'tone-red',
  rejected:        'tone-red',
  expired:         'tone-gray'
};

// 状态 tab（首项 all 用于"全部"）
const ORDER_TABS = [
  { value: '',                label: '全部' },
  { value: 'pending_quote',   label: '待报价' },
  { value: 'pending_agree',   label: '待用户确认' },
  { value: 'pending_confirm', label: '待我确认' },
  { value: 'pending_home',    label: '待上门' },
  { value: 'pending_shop',    label: '待到店' },
  { value: 'in_progress',     label: '进行中' },
  { value: 'completed',       label: '已完成' },
  { value: 'cancelled',       label: '已取消' }
];

function getStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] || '状态待确认';
}
function getStatusTone(status) {
  return ORDER_STATUS_TONES[status] || 'tone-gray';
}

// 把后端原始 order 转成视图层一致字段
function normalizeOrder(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    status: raw.status,
    startTime: raw.startTime,
    endTime: raw.endTime,
    address: raw.address || raw.clientAddress?.detailAddress || '',
    serviceType: raw.serviceType || 'home',     // 'home' | 'shop'
    price: raw.quotePrice || 0,
    depositPaid: !!raw.isDepositPaid,
    customerId: raw.customer?.id,
    customerName: raw.customer?.name || '客户',
    customerPhone: raw.customer?.phone || '',
    customerAvatar: raw.customer?.avatarUrl || '',
    serviceName: raw.customTitle || raw.customServiceRequest?.title || raw.designRequest?.title || '预约服务',
    latitude: raw.clientAddress?.latitude,
    longitude: raw.clientAddress?.longitude,
    shopName: raw.shopName || ''
  };
}

// 预约状态 chip 样式
function getOrderStateMeta(status) {
  if (status === 'in_progress') {
    return { tone: 'state-in-progress', label: '服务中' };
  }
  if (status === 'completed') {
    return { tone: 'state-completed', label: '已完成' };
  }
  if (status === 'cancelled') {
    return { tone: 'state-completed', label: '已取消' };
  }
  return { tone: 'state-pending', label: '待出发' };
}

// 服务类型展示
function resolveOrderPresentation(order) {
  const isShop = order.serviceType === 'shop';
  const shopName = order.shopName || '';

  return {
    isShop,
    typeLabel: isShop ? '到店美甲' : '上门美甲',
    typeClass: isShop ? 'tag-shop' : 'tag-home',
    fullAddress: isShop
      ? (shopName ? `到店 · ${shopName} · ${order.address}` : `到店 · ${order.address}`)
      : `上门 · ${order.address}`,
  };
}

// 单趟预估时长（分钟）— 与 webapp 一致的常量估算
function estimateSingleTravelMinutes(order) {
  return order.serviceType === 'home' ? 24 : 16;
}

// 单趟预估距离（km）
function estimateRouteDistance(order) {
  return order.serviceType === 'home' ? 7.8 : 3.6;
}

// 是否「待出发/待到店/服务中」之一（用于行程列表）
function isActiveOrderStatus(status) {
  return status === 'pending_home' || status === 'pending_shop' || status === 'in_progress';
}

// 是否未确认地址
function hasAddressIssue(order) {
  const addr = (order.address || '').trim();
  if (!addr) return true;
  return /待确认|待补充|稍后提供|待补全|未知/.test(addr);
}

// 汇总今日预约 / 预估收入 / 待确认数 / 下一单等
function buildDashboardSummary(orders, now = new Date()) {
  const today = orders.filter((o) => {
    const t = parseDate(o.startTime);
    return t && isSameDay(t, now);
  });

  const expectedIncome = today
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.price) || 0), 0);

  // 待确认：状态为 pending_quote 等（即 trips 里看不到的，但从 list 里能看到）
  // 我们这里以 trips 为输入，pendingCount 计为：trips 中 pending_home/pending_shop 总数
  const pendingCount = orders.filter(
    (o) => o.status === 'pending_home' || o.status === 'pending_shop'
  ).length;

  const sortedActive = orders
    .filter((o) => isActiveOrderStatus(o.status))
    .sort((a, b) => {
      const ta = parseDate(a.startTime)?.getTime() ?? 0;
      const tb = parseDate(b.startTime)?.getTime() ?? 0;
      return ta - tb;
    });

  const nextOrder = (() => {
    if (!sortedActive.length) return null;
    const nowMs = now.getTime();
    return (
      sortedActive.find((o) => {
        const e = parseDate(o.endTime)?.getTime();
        return !e || e >= nowMs;
      }) || sortedActive[0]
    );
  })();

  return {
    todayOrders: today.sort((a, b) => {
      const ta = parseDate(a.startTime)?.getTime() ?? 0;
      const tb = parseDate(b.startTime)?.getTime() ?? 0;
      return ta - tb;
    }),
    expectedIncome,
    pendingCount,
    nextOrder,
    activeOrders: sortedActive
  };
}

module.exports = {
  normalizeOrder,
  getOrderStateMeta,
  resolveOrderPresentation,
  estimateSingleTravelMinutes,
  estimateRouteDistance,
  isActiveOrderStatus,
  hasAddressIssue,
  buildDashboardSummary,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  ORDER_TABS,
  getStatusLabel,
  getStatusTone
};
