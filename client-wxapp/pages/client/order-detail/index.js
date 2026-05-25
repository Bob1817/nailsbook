const api = require('../../../services/api');

const STATUS_TEXT = {
  pending_quote: '待报价',
  quoted: '已报价',
  confirmed: '已确认',
  in_progress: '服务中',
  completed: '已完成',
  cancelled: '已取消',
  rejected: '已拒绝'
};

Page({
  data: {
    order: null,
    loading: true
  },

  onLoad(options) {
    this.orderId = options.id;
    this.loadOrder();
  },

  onShow() {
    if (this.orderId) this.loadOrder();
  },

  async loadOrder() {
    try {
      const order = await api.client.orders.detail(this.orderId);
      this.setData({
        order: {
          ...order,
          statusText: STATUS_TEXT[order.status] || order.status,
          techName: order.technician?.name || '',
          techAvatar: order.technician?.avatarUrl || '',
          addressText: order.address
            ? `${order.address.province || ''}${order.address.city || ''}${order.address.district || ''}${order.address.detail || ''}`
            : ''
        },
        loading: false
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  acceptQuote() {
    wx.showModal({
      title: '确认接受报价',
      content: `报价金额 ¥${this.data.order.price}，确认接受？`,
      confirmText: '接受',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        try {
          await api.client.orders.acceptQuote(this.orderId);
          wx.hideLoading();
          wx.showToast({ title: '已接受报价', icon: 'success' });
          this.loadOrder();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        }
      }
    });
  },

  rejectQuote() {
    wx.showModal({
      title: '拒绝报价',
      content: '确定拒绝当前报价吗？',
      confirmText: '拒绝',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        try {
          await api.client.orders.rejectQuote(this.orderId, '用户拒绝');
          wx.hideLoading();
          wx.showToast({ title: '已拒绝报价', icon: 'success' });
          this.loadOrder();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        }
      }
    });
  },

  cancelOrder() {
    wx.showModal({
      title: '取消预约',
      content: '确定要取消这个预约吗？',
      confirmText: '取消预约',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        try {
          await api.client.orders.cancel(this.orderId);
          wx.hideLoading();
          wx.showToast({ title: '预约已取消', icon: 'success' });
          this.loadOrder();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        }
      }
    });
  }
});
