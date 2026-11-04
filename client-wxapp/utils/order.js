// 技师预约数据加工：规范化 + 行程展示元数据

const { parseDate, isSameDay, formatBookingDate, formatClock } = require('./format');

// ========== 状态映射 ==========
const ORDER_STATUS_LABELS = {
  pending_quote:   '待报价',
  pending_agree:   '待用户确认',
  pending_confirm: '待我确认',
  pending_client_confirm: '待客户确认',
  quoted:         '已报价',
  confirmed:      '已确认',
  pending_shop:    '待到店',
  in_progress:     '进行中',
  completed:       '已完成',
  cancelled:       '已取消',
  rejected:        '已拒绝',
  expired:         '已过期'
};

// CSS 类名（在 wxss 里定义对应配色：Scheme A 行动优先级层级）
const ORDER_STATUS_TONES = {
  pending_quote:   'tone-red',
  pending_agree:   'tone-red',
  pending_confirm: 'tone-red',
  pending_client_confirm: 'tone-red',
  quoted:          'tone-red',
  confirmed:       'tone-sky',
  pending_shop:    'tone-sky',
  in_progress:     'tone-sky',
  completed:       'tone-emerald',
  cancelled:       'tone-gray',
  rejected:        'tone-gray',
  expired:         'tone-gray'
};

// 状态 tab（首项 all 用于"全部"）
const ORDER_TABS = [
  { value: '',                label: '全部' },
  { value: 'pending_quote',   label: '待报价' },
  { value: 'pending_agree',   label: '待用户确认' },
  { value: 'pending_confirm', label: '待我确认' },
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

function normalizeDepositAmount(raw) {
  const amount = Number(raw && raw.depositAmount || 0);
  const quotePrice = Number(raw && (raw.quotePrice || raw.price) || 0);
  if (amount > quotePrice && quotePrice > 0 && amount / 100 <= quotePrice) {
    return amount / 100;
  }
  return amount;
}

// 把后端原始 order 转成视图层一致字段
function normalizeOrder(raw) {
  if (!raw) return null;
  const dateParts = formatBookingDate(raw.startTime).split(' ');
  const serviceNames = (Array.isArray(raw.serviceLines) ? raw.serviceLines : [])
    .map(line => line.nameSnapshot || line.name).filter(Boolean);
  return {
    _cardDate: dateParts[0] || '',
    _cardWeekday: dateParts[1] || '',
    id: raw.id,
    status: raw.status,
    quoteVersion: Number(raw.quoteVersion || 0),
    startTime: raw.startTime,
    endTime: raw.quickBooking && !raw.totalDurationMinutes ? null : raw.endTime,
    quickBooking: raw.quickBooking === true,
    durationPending: raw.quickBooking === true && !raw.totalDurationMinutes,
    address: raw.address || raw.clientAddress?.detailAddress || '',
    serviceType: raw.serviceType || 'shop',     // 'home' | 'shop'
    price: raw.quotePrice || 0,
    tradeStatus: raw.tradeStatus || null,
    tradeCreatedAt: raw.tradeCreatedAt || null,
    paymentStatus: raw.paymentStatus || 'unpaid',
    paidAmount: Number(raw.paidAmount || 0),
    depositAmount: normalizeDepositAmount(raw),
    depositModeSnapshot: raw.depositModeSnapshot || 'none',
    depositValueSnapshot: Number(raw.depositValueSnapshot || 0),
    depositPaid: !!raw.isDepositPaid,
    acceptedProposal: raw.acceptedProposal || null,
    pricingDetails: raw.pricingDetails || null,
    customerId: raw.customer?.id,
    clientUserId: raw.clientUserId || raw.customer?.clientUserId || null,
    customerName: raw.customer?.name || '客户',
    customerPhone: raw.customer?.phone || '',
    customerAvatar: raw.customer?.avatarUrl || '',
    serviceName: (raw.isRepeatBooking && raw.customTitle) || raw.sourceWork?.title || raw.customTitle || raw.customServiceRequest?.title || raw.designRequest?.title || serviceNames.join('、') || raw.service?.name || raw.serviceName || (raw.quickBooking ? '快捷预约 · 款式待沟通' : '预约服务'),
    latitude: raw.clientAddress?.latitude,
    longitude: raw.clientAddress?.longitude,
    shopName: raw.shopName || ''
  };
}

const REBOOKABLE_STATUSES = ['rejected', 'cancelled', 'completed', 'expired', 'no_show'];

function normalizeAddress(value) {
  return String(value || '').replace(/\s+/g, '');
}

function getBookingSourceLabel(raw) {
  if (raw.isRepeatBooking || raw.attributionChannel === 'repeat') return '再次预约';
  if (raw.quickBooking) return '快速预约';
  if (raw.sourceWorkId || raw.sourceWork) return '预约同款';
  if (raw.source === 'technician') return '美甲师代客预约';
  return '美甲师主页';
}

function getActionStatus(status) {
  if (status === 'quoted' || status === 'pending_client_confirm') return 'pending_agree';
  if (status === 'confirmed') return 'pending_shop';
  return status;
}

function decorateTechnicianOrder(raw, shops = []) {
  const order = normalizeOrder(raw);
  if (!order) return null;
  const orderAddress = normalizeAddress(order.address);
  const configuredShop = (Array.isArray(shops) ? shops : []).find((shop) => {
    if (!shop || shop.enabled === false) return false;
    const fullAddress = normalizeAddress([
      shop.province, shop.city, shop.district, shop.detailAddress, shop.doorInfo
    ].filter(Boolean).join(''));
    const detailAddress = normalizeAddress(shop.detailAddress);
    return orderAddress && (fullAddress === orderAddress || (detailAddress && orderAddress.includes(detailAddress)));
  });
  const status = getActionStatus(order.status);
  const price = Number(order.price) || 0;
  const hasWork = Boolean(
    (Array.isArray(raw.worksFromOrder) && raw.worksFromOrder.length > 0) ||
    (Array.isArray(raw.works) && raw.works.length > 0) ||
    raw.workId ||
    raw.createdWorkId ||
    raw.sourceWorkId ||
    raw.sourceWork
  );
  const workId = (Array.isArray(raw.worksFromOrder) && raw.worksFromOrder[0] && raw.worksFromOrder[0].id)
    || (Array.isArray(raw.works) && raw.works[0] && raw.works[0].id)
    || raw.createdWorkId
    || raw.workId
    || (raw.sourceWork && raw.sourceWork.id)
    || raw.sourceWorkId
    || null;
  const recordCompleted = Boolean(raw.serviceRecord && raw.serviceRecord.status === 'complete');
  const hasScheduleActions = [
    'pending_quote',
    'pending_agree',
    'pending_confirm',
    'pending_shop',
    'in_progress'
  ].includes(status) || order.status === 'completed';
  return {
    ...order,
    _clock: formatClock(order.startTime),
    _statusLabel: order.status === 'rejected'
      ? '已驳回'
      : (order.status === 'no_show' ? '已爽约' : getStatusLabel(order.status)),
    _statusTone: getStatusTone(order.status),
    _priceText: price > 0 ? `¥${Number.isInteger(price) ? price : price.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}` : '',
    _sourceLabel: getBookingSourceLabel(raw),
    _serviceLabel: order.serviceName || '预约项目待确认',
    _shopName: order.shopName || (configuredShop && configuredShop.name) || '门店待确认',
    _notes: raw.remark && raw.remark !== order.serviceName ? raw.remark : (raw.note || ''),
    _canRebook: false,
    _hasWork: hasWork,
    _workId: workId,
    _recordCompleted: recordCompleted,
    _depositPaid: !!raw.isDepositPaid,
    _actionStatus: status,
    _hasScheduleActions: hasScheduleActions
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
  if (status === 'cancelled' || status === 'rejected' || status === 'expired') {
    return { tone: 'state-cancelled', label: '已取消' };
  }
  if (status === 'pending_quote' || status === 'pending_confirm' || status === 'pending_agree') {
    return { tone: 'state-urgent', label: '待确认' };
  }
  return { tone: 'state-pending', label: '待出发' };
}

// 服务类型展示
function resolveOrderPresentation(order) {
  const shopName = order.shopName || '';

  return {
    isShop: true,
    typeLabel: '到店美甲',
    typeClass: 'tag-shop',
    fullAddress: shopName
      ? `到店 · ${shopName} · ${order.address}`
      : `到店 · ${order.address}`,
  };
}

// 单趟预估时长（分钟）— 到店服务常量
function estimateSingleTravelMinutes(order) {
  return 16;
}

// 单趟预估距离（km）
function estimateRouteDistance(order) {
  return 3.6;
}

// 是否「待出发/待到店/服务中」之一（用于行程列表）
function isActiveOrderStatus(status) {
  return status === 'pending_shop' || status === 'in_progress';
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
    (o) => o.status === 'pending_shop'
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
  decorateTechnicianOrder,
  getBookingSourceLabel,
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
  getStatusTone,
  normalizeDepositAmount
};
