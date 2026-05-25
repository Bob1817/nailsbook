const api = require('../../../services/api');

Page({
  data: {
    customers: [],
    loading: false,
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadCustomers();
  },

  async loadCustomers() {
    this.setData({ loading: true, page: 1 });

    try {
      const res = await api.technician.customers.list({ page: 1, limit: 20 });
      const customers = (res.list || res.data || []).map(c => ({
        ...c,
        tags: c.tags ? (typeof c.tags === 'string' ? JSON.parse(c.tags) : c.tags) : []
      }));

      this.setData({
        customers,
        hasMore: customers.length >= 20,
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
    const { page, customers } = this.data;
    const nextPage = page + 1;

    try {
      const res = await api.technician.customers.list({ page: nextPage, limit: 20 });
      const newCustomers = (res.list || res.data || []).map(c => ({
        ...c,
        tags: c.tags ? (typeof c.tags === 'string' ? JSON.parse(c.tags) : c.tags) : []
      }));

      this.setData({
        customers: [...customers, ...newCustomers],
        page: nextPage,
        hasMore: newCustomers.length >= 20
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onSearch(e) {
    const keyword = e.detail.value;
    if (keyword) {
      this.searchCustomers(keyword);
    } else {
      this.loadCustomers();
    }
  },

  async searchCustomers(keyword) {
    this.setData({ loading: true });

    try {
      const res = await api.technician.customers.list({ keyword, limit: 50 });
      const customers = (res.list || res.data || []).map(c => ({
        ...c,
        tags: c.tags ? (typeof c.tags === 'string' ? JSON.parse(c.tags) : c.tags) : []
      }));

      this.setData({ customers, loading: false, hasMore: false });
    } catch (err) {
      this.setData({ loading: false });
    }
  },

  viewCustomer(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/technician/customer-detail/index?id=${id}` });
  },

  preventBubble() {},

  onPullDownRefresh() {
    this.loadCustomers().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
