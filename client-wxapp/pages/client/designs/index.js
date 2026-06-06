const api = require('../../../services/api');

Page({
  data: {
    designs: [],
    loading: true,
    refreshing: false
  },

  onLoad() {
    this.loadDesigns();
  },

  onShow() {
    this.loadDesigns();
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadDesigns().finally(() => {
      wx.stopPullDownRefresh();
      this.setData({ refreshing: false });
    });
  },

  async loadDesigns() {
    try {
      const designs = await api.client.designs.list();
      this.setData({
        designs: (designs || []).map(d => ({
          ...d,
          statusText: this.getStatusText(d.status),
          statusClass: this.getStatusClass(d.status),
          dateStr: this.formatDate(d.createdAt)
        })),
        loading: false
      });
    } catch (err) {
      console.error('Failed to load designs:', err);
      this.setData({ loading: false });
    }
  },

  getStatusText(status) {
    const map = {
      'pending_quote': '待报价',
      'quoted': '已报价',
      'accepted': '已接受',
      'rejected': '已拒绝',
      'converted': '已转预约',
      'cancelled': '已取消'
    };
    return map[status] || status;
  },

  getStatusClass(status) {
    const map = {
      'pending_quote': 'status-pending',
      'quoted': 'status-quoted',
      'accepted': 'status-accepted',
      'rejected': 'status-rejected',
      'converted': 'status-converted',
      'cancelled': 'status-cancelled'
    };
    return map[status] || '';
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  },

  goToCreateDesign() {
    wx.navigateTo({ url: '/pages/client/create-design/index' });
  },

  goToCustomizeDesign() {
    wx.navigateTo({ url: '/pages/client/customize-design/index' });
  },

  goToDesignDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/client/design-detail/index?id=${id}` });
  }
});
