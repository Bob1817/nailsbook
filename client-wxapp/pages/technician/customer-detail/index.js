const api = require('../../../services/api');

const STATUS_LABEL = {
  pending_quote: '待报价',
  quoted: '已报价',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消'
};

Page({
  data: {
    customer: null,
    loading: false,
    tagInput: '',
    editingTags: false
  },

  onLoad(options) {
    if (options.id) this.loadCustomer(options.id);
  },

  async loadCustomer(id) {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    try {
      const customer = await api.technician.customers.detail(id);
      this.setData({
        customer: {
          ...customer,
          tagList: customer.tags ? customer.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          orders: (customer.orders || []).map(o => ({
            ...o,
            statusLabel: STATUS_LABEL[o.status] || o.status,
            dateStr: o.scheduledTime ? o.scheduledTime.slice(0, 10) : (o.createdAt || '').slice(0, 10)
          }))
        }
      });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  startEditTags() {
    const tags = this.data.customer.tagList.join(', ');
    this.setData({ editingTags: true, tagInput: tags });
  },

  onTagInput(e) {
    this.setData({ tagInput: e.detail.value });
  },

  async saveTags() {
    const { tagInput, customer } = this.data;
    const tags = tagInput.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    wx.showLoading({ title: '保存中...' });
    try {
      await api.technician.customers.updateTags(customer.id, tags);
      wx.hideLoading();
      wx.showToast({ title: '已保存', icon: 'success' });
      this.setData({
        editingTags: false,
        'customer.tagList': tags,
        'customer.tags': tags.join(',')
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  cancelEditTags() {
    this.setData({ editingTags: false });
  },

  goOrderDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  }
});
