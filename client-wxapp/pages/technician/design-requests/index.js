const api = require('../../../services/api');

const STATUS_TEXT = {
  pending_quote: '待报价', quoted: '已报价', accepted: '客户已接受', rejected: '客户已拒绝', converted: '已转预约', cancelled: '已取消'
};

Page({
  data: {
    designs: [], loading: true, loadFailed: false,
    showQuote: false, quotingId: null, quotePrice: '', quoteRemark: '', submitting: false
  },
  onLoad() { this.loadDesigns(); },
  onPullDownRefresh() { this.loadDesigns().finally(() => wx.stopPullDownRefresh()); },
  async loadDesigns() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const list = await api.technician.designs.list();
      this.setData({
        designs: (list || []).map(item => ({
          ...item,
          statusText: STATUS_TEXT[item.status] || item.status,
          clientName: (item.client && (item.client.nickname || item.client.phone)) || '客户',
          coverUrl: (item.imageUrls || [])[0] || '',
          dateText: item.createdAt ? String(item.createdAt).slice(0, 10) : ''
        })),
        loading: false
      });
    } catch (err) {
      this.setData({ loading: false, loadFailed: true });
    }
  },
  previewImages(e) {
    const design = this.data.designs.find(item => item.id === Number(e.currentTarget.dataset.id));
    if (design && design.imageUrls.length) wx.previewImage({ current: e.currentTarget.dataset.url, urls: design.imageUrls });
  },
  openQuote(e) {
    const design = this.data.designs.find(item => item.id === Number(e.currentTarget.dataset.id));
    if (!design) return;
    this.setData({ showQuote: true, quotingId: design.id, quotePrice: design.quotePrice != null ? String(design.quotePrice) : '', quoteRemark: design.quoteRemark || '' });
  },
  closeQuote() { if (!this.data.submitting) this.setData({ showQuote: false }); },
  onQuoteInput(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },
  async submitQuote() {
    if (this.data.submitting) return;
    const price = Number(this.data.quotePrice);
    if (!Number.isFinite(price) || price <= 0) return wx.showToast({ title: '请输入有效报价', icon: 'none' });
    this.setData({ submitting: true });
    try {
      await api.technician.designs.quote(this.data.quotingId, { price, remark: this.data.quoteRemark.trim() });
      this.setData({ showQuote: false });
      await this.loadDesigns();
      wx.showToast({ title: '报价已发送', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '报价失败，请重试', icon: 'none' });
    } finally { this.setData({ submitting: false }); }
  },
  noop() {}
});
