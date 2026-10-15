const api = require('../../../services/api');
const { buildClientLoginUrl } = require('../../../utils/artist-navigation');

Page({
  data: {
    loading: true, error: '', submitting: false, uploading: false,
    customers: [], customer: null, search: '', customerPage: 1, moreCustomers: false,
    technician: null, services: [], serviceNames: '', duration: 120, price: '',
    shops: [], shop: null, serviceDate: '', startTime: '', available: false,
    note: '', images: []
  },
  async onLoad(options) {
    const app = getApp();
    if (!app.globalData.token) {
      wx.redirectTo({ url: buildClientLoginUrl('/pages/booking/index') });
      return;
    }
    if (app.globalData.role !== 'technician') {
      wx.redirectTo({ url: '/pages/client/create-order/index' });
      return;
    }
    this.presetCustomerId = Number(options.customerId) || null;
    await this.load();
  },
  async load() {
    this.setData({ loading: true, error: '' });
    try {
      const [technician, services] = await Promise.all([api.technician.auth.getUserInfo(), api.technician.services.list()]);
      const shops = (technician.shopAddresses || []).filter(shop => shop.enabled !== false);
      this.setData({ technician, services: services.filter(service => service.isActive), shops, shop: shops[0] || null });
      await this.loadCustomers(true);
      if (this.presetCustomerId) {
        const customer = await api.technician.customers.detail(this.presetCustomerId);
        if (customer.clientUserId && customer.account && customer.account.status === 'active' && customer.bindingStatus === 'active') this.setData({ customer });
      }
    } catch (error) { this.setData({ error: error.message || '加载失败，请重试' }); }
    finally { this.setData({ loading: false }); }
  },
  async loadCustomers(reset) {
    const page = reset === true ? 1 : this.data.customerPage + 1;
    const result = await api.technician.customers.list({ page, limit: 20, search: this.data.search });
    const rows = result.data || [];
    const valid = rows.filter(c => c.clientUserId && c.account && c.account.status === 'active' && c.bindingStatus === 'active');
    this.setData({ customers: page === 1 ? valid : this.data.customers.concat(valid), customerPage: page, moreCustomers: page * 20 < result.total });
  },
  onSearch(e) { this.setData({ search: e.detail.value }); },
  async searchCustomers() { try { await this.loadCustomers(true); } catch (e) { wx.showToast({ title: e.message || '搜索失败', icon: 'none' }); } },
  async moreCustomers() { try { await this.loadCustomers(false); } catch (e) { wx.showToast({ title: e.message || '加载失败', icon: 'none' }); } },
  selectCustomer(e) { this.setData({ customer: this.data.customers.find(c => c.id === Number(e.currentTarget.dataset.id)) }); },
  selectServices(e) {
    const selected = this.data.services.filter(s => e.detail.value.includes(String(s.id)));
    this.setData({ serviceNames: selected.map(s => s.name).join('、'), duration: selected.reduce((n, s) => n + Number(s.durationMinutes || 0), 0) || 120, price: String(selected.reduce((n, s) => n + Math.round(Number(s.price) * 100), 0) / 100), available: false, startTime: '' });
  },
  onServiceName(e) { this.setData({ serviceNames: e.detail.value }); },
  onDuration(e) { this.setData({ duration: Number(e.detail.value), available: false, startTime: '' }); },
  onPrice(e) { this.setData({ price: e.detail.value }); },
  onNote(e) { this.setData({ note: e.detail.value }); },
  selectShop(e) { this.setData({ shop: this.data.shops[Number(e.detail.value)], available: false, startTime: '' }); },
  onTimeChange(e) { this.setData({ serviceDate: e.detail.serviceDate, startTime: e.detail.startTime, available: !!e.detail.available }); },
  onAvailability(e) { if (!e.detail.ready || e.detail.paused) this.setData({ available: false }); },
  async addImages() {
    if (this.data.uploading || this.data.images.length >= 6) return;
    try {
      const files = await new Promise((resolve, reject) => wx.chooseMedia({
        count: 6 - this.data.images.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success: resolve,
        fail: reject
      }));
      this.setData({ uploading: true });
      const results = await Promise.all(files.tempFiles.map(f => api.upload.image(f.tempFilePath)));
      this.setData({ images: this.data.images.concat(results.map(r => r.url)) });
    } catch (e) { if (!String(e.errMsg || '').includes('cancel')) wx.showToast({ title: '图片上传失败，请重试', icon: 'none' }); }
    finally { this.setData({ uploading: false }); }
  },
  removeImage(e) { this.setData({ images: this.data.images.filter((_, i) => i !== Number(e.currentTarget.dataset.index)) }); },
  async submit() {
    const d = this.data;
    if (d.submitting || d.uploading) return;
    if (!d.customer || !d.shop || !d.serviceNames.trim() || !d.available || !d.serviceDate || !d.startTime || !Number.isInteger(d.duration) || d.duration < 1 || d.duration > 1440 || !/^\d+(\.\d{1,2})?$/.test(d.price) || Number(d.price) <= 0) {
      wx.showToast({ title: '请完整选择客户、服务、门店、可用时间和报价', icon: 'none' }); return;
    }
    const start = new Date(`${d.serviceDate}T${d.startTime}:00+08:00`);
    this.setData({ submitting: true });
    try {
      const shop = d.shop;
      const address = [shop.name, shop.address || [shop.province, shop.city, shop.district, shop.detail].filter(Boolean).join('')].filter(Boolean).join(' ');
      const order = await api.technician.orders.create({ customerId: d.customer.id, serviceName: d.serviceNames.trim(), startTime: start.toISOString(), endTime: new Date(start.getTime() + d.duration * 60000).toISOString(), serviceType: '到店美甲', address, price: Number(d.price), note: d.note, customImages: d.images, submitQuote: true });
      wx.redirectTo({ url: `/pages/technician/order-detail/index?id=${order.id}` });
    } catch (error) { wx.showToast({ title: error.message || '提交失败，请重试', icon: 'none' }); }
    finally { this.setData({ submitting: false }); }
  }
});
