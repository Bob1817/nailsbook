const api = require('../../../services/api');

const TABS = [
  { label: '全部', value: 'all' },
  { label: '待报价', value: 'pending_quote' },
  { label: '待确认', value: 'pending_confirm' },
  { label: '待到店', value: 'pending_shop' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
  { label: '已过期', value: 'expired' },
  { label: '已取消', value: 'cancelled' }
];

const STATUS_GROUPS = {
  pending_quote: ['pending_quote'],
  pending_confirm: ['quoted', 'pending_agree', 'pending_confirm', 'pending_client_confirm', 'confirmed'],
  pending_shop: ['pending_shop'],
  in_progress: ['in_progress'],
  completed: ['completed'],
  expired: ['expired'],
  cancelled: ['cancelled', 'rejected']
};

const TERMINAL_STATUSES = new Set(['completed', 'expired', 'cancelled', 'rejected']);
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const STATUS_MAP = {
  pending_quote: { text: '待报价', class: 'status-amber' },
  quoted: { text: '已报价', class: 'status-blue' },
  pending_agree: { text: '待确认', class: 'status-blue' },
  pending_confirm: { text: '待确认', class: 'status-purple' },
  pending_client_confirm: { text: '待客户确认', class: 'status-blue' },
  confirmed: { text: '已确认', class: 'status-purple' },
  pending_shop: { text: '待到店', class: 'status-green' },
  in_progress: { text: '进行中', class: 'status-orange' },
  completed: { text: '已完成', class: 'status-gray' },
  cancelled: { text: '已取消', class: 'status-red' },
  rejected: { text: '已拒绝', class: 'status-red' },
  expired: { text: '已过期', class: 'status-gray' }
};

const NEXT_STEP_MAP = {
  pending_quote: '美甲师报价后会通知你',
  quoted: '请确认报价与预约时间',
  pending_agree: '请确认报价与预约时间',
  pending_confirm: '美甲师正在确认最终排期',
  pending_client_confirm: '请确认本次预约安排',
  confirmed: '预约已确认，请按时到达',
  pending_shop: '请按预约时间前往门店',
  in_progress: '服务正在进行，完成后可上传照片',
  completed: '可以评价并加入你的美甲记录',
  expired: '预约已过期，可重新发起预约',
  cancelled: '该预约已取消，可重新预约',
  rejected: '报价未达成，可重新预约'
};

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function formatMoney(value) {
  if (!value && value !== 0) return '0';
  return Math.round(value);
}

function formatCountdown(startTime, status) {
  if (status === 'in_progress') return '服务进行中';
  if (!startTime) return '预约时间待确认';

  const diff = new Date(startTime).getTime() - Date.now();
  if (diff <= 0) return '预约即将开始';

  const totalMinutes = Math.ceil(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return '距离预约还有 ' + days + '天' + (hours ? hours + '小时' : '');
  if (hours > 0) return '距离预约还有 ' + hours + '小时' + (minutes ? minutes + '分钟' : '');
  return '距离预约还有 ' + Math.max(minutes, 1) + '分钟';
}

function filterOrders(orders, status) {
  if (status === 'all') return orders;
  const statuses = STATUS_GROUPS[status] || [];
  return orders.filter((order) => statuses.includes(order.status));
}

function formatAddress(address) {
  if (!address) return '';
  return [address.province, address.city, address.district, address.detailAddress, address.doorInfo]
    .filter(Boolean)
    .join(' ');
}

function decorateOrder(order) {
  const statusInfo = STATUS_MAP[order.status] || { text: '状态待确认', class: 'status-gray' };
  // Date block fields
  var startDate = order.startTime ? new Date(order.startTime) : null;
  var monthText = startDate ? pad2(startDate.getMonth() + 1) + '月' : '--';
  var dayText = startDate ? '' + startDate.getDate() : '--';
  var weekdayText = startDate ? WEEKDAYS[startDate.getDay()] : '待定';

  // Time range
  var timeRangeText = '';
  if (order.startTime && order.endTime) {
    var st = new Date(order.startTime);
    var et = new Date(order.endTime);
    timeRangeText = pad2(st.getHours()) + ':' + pad2(st.getMinutes()) + ' - ' + pad2(et.getHours()) + ':' + pad2(et.getMinutes());
  }

  // Service mode and location
  var isShopService = order.serviceType === '到店美甲';
  var isHomeService = order.serviceType === '上门美甲';
  if (!isShopService && !isHomeService) {
    isHomeService = Boolean(order.clientAddress);
    isShopService = !isHomeService && Boolean(order.address || order.shopAddress);
  }
  var serviceModeText = isShopService ? '到店美甲' : (isHomeService ? '上门美甲' : '服务方式待确认');
  var titleText = order.customTitle ||
    (order.serviceType && order.serviceType !== '上门美甲' && order.serviceType !== '到店美甲'
      ? order.serviceType
      : '美甲服务');
  var addr = order.address || formatAddress(isShopService ? order.shopAddress : order.clientAddress) || order.addressDetail;
  var shopName = isShopService && order.shopAddress ? order.shopAddress.name : '';

  var quoteText = order.status === 'pending_quote' ? '等待美甲师报价' : '暂未提供报价';

  return {
    ...order,
    statusText: statusInfo.text,
    _statusClass: statusInfo.class,
    _monthText: monthText,
    _dayText: dayText,
    _weekdayText: weekdayText,
    _titleText: titleText,
    _serviceModeText: serviceModeText,
    _isShopService: isShopService,
    _shopNameText: shopName || '店铺名称待确认',
    _timeRangeText: timeRangeText,
    _addressText: addr || '地址待确认',
    _priceText: formatMoney(order.quotePrice || order.price),
    _quoteText: quoteText,
    _isTerminal: TERMINAL_STATUSES.has(order.status),
    _countdownText: formatCountdown(order.startTime, order.status),
    _nextStepText: NEXT_STEP_MAP[order.status] || '点击查看预约详情'
  };
}

Page({
  data: {
    tabs: TABS,
    currentStatus: 'all',
    allOrders: [],
    orders: [],
    loading: false,
    emptyTitle: '还没有预约',
    emptyCopy: '选择喜欢的作品或服务，发起你的下一次美甲预约',
    tradeView: false
  },

  onLoad(options) {
    this.setData({ tradeView: options && options.view === 'trade' });
    this.startCountdownTimer();
    this.loadOrders();
  },

  onUnload() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  },

  onShow() {
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders().finally(() => wx.stopPullDownRefresh());
  },

  async loadOrders() {
    this.setData({ loading: true });

    try {
      const res = await api.client.orders.list();
      const rawList = res.list || res.data || (Array.isArray(res) ? res : []);
      const allOrders = rawList
        .filter(order => !this.data.tradeView || Boolean(order.tradeCreatedAt || order.tradeStatus))
        .map(decorateOrder);

      this.setData({
        allOrders,
        orders: filterOrders(allOrders, this.data.currentStatus),
        loading: false
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  switchStatus(e) {
    const status = e.currentTarget.dataset.status;
    if (status === this.data.currentStatus) return;
    const tab = this.data.tabs.find(item => item.value === status);
    this.setData({
      currentStatus: status,
      orders: filterOrders(this.data.allOrders, status),
      emptyTitle: status === 'all' ? '还没有预约' : `暂无${tab ? tab.label : ''}预约`,
      emptyCopy: status === 'all' ? '选择喜欢的作品或服务，发起你的下一次美甲预约' : '可以切换其他状态查看，或发起新的预约'
    });
  },

  startCountdownTimer() {
    this.countdownTimer = setInterval(() => {
      const allOrders = this.data.allOrders.map(decorateOrder);
      this.setData({
        allOrders,
        orders: filterOrders(allOrders, this.data.currentStatus)
      });
    }, 60000);
  },

  viewOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/client/order-detail/index?id=${id}` });
  },

  createOrder() {
    wx.navigateTo({ url: '/pages/client/create-order/index' });
  }
});
