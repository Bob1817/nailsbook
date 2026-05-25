const api = require('../../../services/api');
const { formatTime } = require('../../../utils/util');

Page({
  data: {
    orders: [],
    loading: false,
    currentStatus: '',
    page: 1,
    hasMore: true
  },

  // 预处理订单数据
  formatOrders(orders) {
    return orders.map(order => ({
      ...order,
      startTime: formatTime(order.startTime),
      statusText: this.getStatusText(order.status),
      customerAvatar: order.customer && order.customer.avatarUrl,
      customerName: order.customer && order.customer.name,
      customerPhone: order.customer && order.customer.phone
    }));
  },

  onLoad(options) {
    if (options.status) {
      this.setData({ currentStatus: options.status });
    }
    this.loadOrders();
  },

  onShow() {
    if (getApp().globalData.role === 'technician') {
      this.loadOrders();
    }
  },

  async loadOrders() {
    this.setData({ loading: true, page: 1 });

    try {
      const params = { page: 1, limit: 20 };
      if (this.data.currentStatus) {
        params.status = this.data.currentStatus;
      }

      const res = await api.technician.orders.list(params);
      const orders = this.formatOrders(res.list || res.data || []);

      this.setData({
        orders,
        hasMore: orders.length >= 20,
        loading: false
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
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

      const res = await api.technician.orders.list(params);
      const newOrders = this.formatOrders(res.list || res.data || []);

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

  getStatusText(status) {
    const map = {
      pending_quote: '待报价',
      quoted: '待确认',
      confirmed: '已确认',
      completed: '已完成',
      cancelled: '已取消',
      rejected: '已拒绝'
    };
    return map[status] || status;
  },

  viewOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  },

  preventBubble() {},

  quoteOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}&action=quote` });
  },

  onPullDownRefresh() {
    this.loadOrders().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
