const api = require('../../../services/api');

const TABS = [
  { label: '全部', value: '' },
  { label: '待报价', value: 'pending_quote' },
  { label: '待确认', value: 'pending_agree' },
  { label: '已确认', value: 'confirmed' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' }
];

const STATUS_MAP = {
  pending_quote: { text: '待报价', class: 'status-amber' },
  quoted: { text: '已报价', class: 'status-blue' },
  pending_agree: { text: '待确认', class: 'status-blue' },
  pending_confirm: { text: '待确认', class: 'status-purple' },
  confirmed: { text: '已确认', class: 'status-purple' },
  pending_home: { text: '待上门', class: 'status-green' },
  pending_shop: { text: '待到店', class: 'status-green' },
  in_progress: { text: '进行中', class: 'status-orange' },
  completed: { text: '已完成', class: 'status-gray' },
  cancelled: { text: '已取消', class: 'status-red' },
  rejected: { text: '已拒绝', class: 'status-red' }
};

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return '今天';
  if (diff < 172800000) return '昨天';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return m + '月' + day + '日';
}

function formatMoney(value) {
  if (!value && value !== 0) return '0';
  return Math.round(value);
}

function decorateOrder(order) {
  const statusInfo = STATUS_MAP[order.status] || { text: order.status, class: 'status-gray' };
  const techName = order.technician && order.technician.name;
  const techAvatar = order.technician && order.technician.avatarUrl;

  // Date block fields
  var startDate = order.startTime ? new Date(order.startTime) : null;
  var monthText = startDate ? pad2(startDate.getMonth() + 1) + '月' : '--';
  var dayText = startDate ? '' + startDate.getDate() : '--';

  // Time range
  var timeRangeText = '';
  if (order.startTime && order.endTime) {
    var st = new Date(order.startTime);
    var et = new Date(order.endTime);
    timeRangeText = pad2(st.getHours()) + ':' + pad2(st.getMinutes()) + ' - ' + pad2(et.getHours()) + ':' + pad2(et.getMinutes());
  }

  // Title
  var titleText = order.customTitle || order.serviceType || '美甲服务';

  // Address
  var addr = order.address;
  if (!addr && order.shopAddress) {
    var sa = order.shopAddress;
    addr = [sa.province, sa.city, sa.district, sa.detailAddress].filter(Boolean).join('');
  }
  if (!addr && order.addressDetail) {
    addr = order.addressDetail;
  }

  // Footer context text
  var _footerText = '';
  if (!order.quotePrice) {
    if (order.status === 'pending_quote') _footerText = '等待美甲师报价';
    else if (order.status === 'pending_confirm' || order.status === 'pending_agree') _footerText = '等待美甲师确认';
    else _footerText = '查看预约详情';
  }

  return {
    ...order,
    statusText: statusInfo.text,
    _statusClass: statusInfo.class,
    techName,
    techAvatar,
    _monthText: monthText,
    _dayText: dayText,
    _titleText: titleText,
    _timeRangeText: timeRangeText,
    _addressText: addr || '地址待确认',
    _priceText: formatMoney(order.quotePrice || order.price),
    _footerText: _footerText
  };
}

Page({
  data: {
    tabs: TABS,
    currentStatus: '',
    orders: [],
    orderCount: 0,
    loading: false,
    page: 1,
    hasMore: true
  },

  onLoad(options) {
    if (options.status) {
      this.setData({ currentStatus: options.status });
    }
    this.loadOrders();
  },

  onShow() {
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  async loadOrders() {
    this.setData({ loading: true, page: 1 });

    try {
      const params = { page: 1, limit: 20 };
      if (this.data.currentStatus) {
        params.status = this.data.currentStatus;
      }

      const res = await api.client.orders.list(params);
      const rawList = res.list || res.data || [];
      const orders = rawList.map(decorateOrder);

      this.setData({
        orders,
        orderCount: orders.length,
        hasMore: orders.length >= 20,
        loading: false
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async loadMore() {
    const { page, orders, currentStatus } = this.data;
    const nextPage = page + 1;

    try {
      const params = { page: nextPage, limit: 20 };
      if (currentStatus) {
        params.status = currentStatus;
      }

      const res = await api.client.orders.list(params);
      const rawList = res.list || res.data || [];
      const newOrders = rawList.map(decorateOrder);

      this.setData({
        orders: [...orders, ...newOrders],
        page: nextPage,
        hasMore: newOrders.length >= 20
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  switchStatus(e) {
    const status = e.currentTarget.dataset.status;
    if (status !== this.data.currentStatus) {
      this.setData({ currentStatus: status });
      this.loadOrders();
    }
  },

  viewOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/client/order-detail/index?id=${id}` });
  },

  createOrder() {
    wx.navigateTo({ url: '/pages/client/create-order/index' });
  },

  async acceptQuote(e) {
    const id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认接受报价',
      content: '确认接受当前报价并预约该服务？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });
            await api.client.orders.acceptQuote(id);
            wx.hideLoading();
            wx.showToast({ title: '已接受报价', icon: 'success' });
            this.loadOrders();
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: err.message || '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  async rejectQuote(e) {
    const id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '拒绝报价',
      content: '确定要拒绝当前报价吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });
            await api.client.orders.rejectQuote(id, '用户拒绝');
            wx.hideLoading();
            wx.showToast({ title: '已拒绝报价', icon: 'success' });
            this.loadOrders();
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: err.message || '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  noop() {}
});
