const api = require('../../../services/api');
const { formatTime } = require('../../../utils/util');

Page({
  data: {
    order: {}
  },

  onLoad(options) {
    this.loadOrder(options.id);
  },

  async loadOrder(id) {
    try {
      wx.showLoading({ title: '加载中...' });
      const res = await api.client.orders.detail(id);
      res.startTime = formatTime(res.startTime);
      res.statusText = this.getStatusText(res.status);
      this.setData({ order: res });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  getStatusText(status) {
    const map = {
      pending_quote: '待报价',
      quoted: '已报价',
      confirmed: '已确认',
      completed: '已完成',
      cancelled: '已取消'
    };
    return map[status] || status;
  },

  async acceptQuote() {
    const { order } = this.data;

    wx.showModal({
      title: '确认接受报价',
      content: '确认接受当前报价？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });
            await api.client.orders.acceptQuote(order.id);
            wx.hideLoading();
            wx.showToast({ title: '已接受报价', icon: 'success' });
            this.loadOrder(order.id);
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: err.message || '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  async rejectQuote() {
    const { order } = this.data;

    wx.showModal({
      title: '拒绝报价',
      content: '确定要拒绝当前报价吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });
            await api.client.orders.rejectQuote(order.id, '用户拒绝');
            wx.hideLoading();
            wx.showToast({ title: '已拒绝报价', icon: 'success' });
            this.loadOrder(order.id);
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: err.message || '操作失败', icon: 'none' });
          }
        }
      }
    });
  }
});
