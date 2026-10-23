const api = require('../../../services/api');
const { buildClientLoginUrl } = require('../../../utils/artist-navigation');

Page({
  data: { loading: true, submitting: false, quote: null, client: null, serviceDate: '', startTime: '', error: '' },
  onLoad(options) {
    this.token = String(options.token || '');
    if (!this.loggedIn()) {
      const path = `/pages/client/quote-booking/index?token=${this.token}`;
      return wx.redirectTo({ url: buildClientLoginUrl(path, { source: 'booking_quote' }) });
    }
    this.load();
  },
  loggedIn() {
    const app = getApp();
    if ((wx.getStorageSync('role') || app.globalData.role) !== 'client') return false;
    const token = wx.getStorageSync('client_token') || app.globalData.token;
    if (!token) return false;
    // 过期登录态视为未登录：走登录跳转并保留预约页回跳，避免提交时 401 清态后丢失上下文
    const expiresAt = typeof app.getTokenExpiresAt === 'function' ? app.getTokenExpiresAt(token) : 0;
    return !(expiresAt > 0 && expiresAt <= Date.now());
  },
  goHome() {
    const role = wx.getStorageSync('role') || getApp().globalData.role;
    wx.reLaunch({ url: role === 'technician' ? '/pages/technician/home/index' : '/pages/client/home/index' });
  },
  async load() {
    try {
      const quote = await api.public.bookingQuotes.detail(this.token);
      if (quote.status === 'booked') return wx.redirectTo({ url: `/pages/client/quote-confirm/index?token=${this.token}` });
      if (quote.status !== 'accepted_pending_schedule') throw new Error('请先确认报价后再预约');
      this.setData({ quote, loading: false, error: '' });
      this.loadClient();
    } catch (err) { this.setData({ loading: false, error: err.message || '预约信息加载失败' }); }
  },
  async loadClient() {
    try {
      const result = await api.auth.getUserInfo('client');
      const client = result.client || result;
      const phone = String(client.phone || '');
      this.setData({ client: { displayName: client.nickname || client.phone || '客户', phoneText: phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone } });
    } catch (err) { /* 客户信息仅用于展示，加载失败不阻断预约 */ }
  },
  onBookingTimeChange(e) { this.setData({ serviceDate: e.detail.serviceDate, startTime: e.detail.startTime }); },
  async submit() {
    if (!this.data.startTime || this.data.submitting) return wx.showToast({ title: '请选择预约日期和时间', icon: 'none' });
    this.setData({ submitting: true });
    try {
      await api.client.bookingQuotes.book(this.token, { version: this.data.quote.version, serviceDate: this.data.serviceDate, startTime: this.data.startTime });
      wx.redirectTo({ url: `/pages/client/quote-confirm/index?token=${this.token}` });
    } catch (err) { this.setData({ submitting: false }); wx.showToast({ title: err.message || '预约提交失败', icon: 'none' }); }
  }
});
