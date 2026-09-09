const api = require('../../../services/api');
const { buildClientLoginUrl } = require('../../../utils/artist-navigation');

Page({
  data: { artist: null, loading: true, error: '', owner: false, enabled: false, quickBookingEnabled: false, acceptingBookings: false, savingAvailability: false, submitting: false },

  onLoad(options) {
    this.techId = Number(options.techId);
    this.inviteCode = options.invite || '';
    const user = wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || {};
    this.setData({ owner: options.tool === '1' && wx.getStorageSync('role') === 'technician' && Number(user.id) === this.techId });
    wx.hideShareMenu();
    this.loadArtist();
  },

  async loadArtist() {
    this.setData({ loading: true, error: '' });
    try {
      if (!Number.isInteger(this.techId) || this.techId <= 0 || !this.inviteCode) throw new Error('预约邀请不完整，请向美甲师索取新的分享');
      const [result, settings] = await Promise.all([
        api.public.artists.detail(this.techId), api.public.bookingSettings(this.techId).catch(err => {
          if (err.bookingSettingsUnsupported) return { quickBookingEnabled: false };
          throw err;
        })
      ]);
      const artist = result.artist || result;
      if (Number(artist.id) !== this.techId || artist.invitationCode !== this.inviteCode) throw new Error('预约邀请已失效，请向美甲师索取新的分享');
      const quickBookingEnabled = settings.quickBookingEnabled === true;
      const acceptingBookings = artist.acceptingBookings === true;
      this.setData({ artist, quickBookingEnabled, acceptingBookings, enabled: quickBookingEnabled && acceptingBookings });
      wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    } catch (err) {
      this.setData({ error: err.message || '加载失败，请重试', artist: null, enabled: false });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onAvailabilityChange(e) {
    if (!this.data.owner || this.data.savingAvailability) return;
    const quickBookingEnabled = !!e.detail.value;
    const previous = this.data.quickBookingEnabled;
    this.setData({ quickBookingEnabled, enabled: quickBookingEnabled && this.data.acceptingBookings, savingAvailability: true });
    try {
      await api.technician.bookingDays.updateSettings({ quickBookingEnabled });
      wx.showToast({ title: quickBookingEnabled ? '已开放一键预约' : '已关闭一键预约', icon: 'success' });
    } catch (err) {
      this.setData({ quickBookingEnabled: previous, enabled: previous && this.data.acceptingBookings });
      wx.showToast({ title: err.message || '设置失败，请重试', icon: 'none' });
    } finally {
      this.setData({ savingAvailability: false });
    }
  },

  shareQuery() {
    return `techId=${this.techId}&invite=${encodeURIComponent(this.inviteCode)}`;
  },

  onShareAppMessage() {
    if (!this.data.artist) return { title: 'NailBook', path: '/pages/client/discover/index' };
    return {
      title: `预约${this.data.artist.name || '美甲师'} · 选个时间就好`,
      path: '/pages/client/quick-booking/index?' + this.shareQuery(),
      imageUrl: this.data.artist.avatarUrl || undefined
    };
  },

  onShareTimeline() {
    return {
      title: `预约${(this.data.artist || {}).name || '美甲师'} · 选个时间就好`,
      query: this.shareQuery(),
      imageUrl: (this.data.artist || {}).avatarUrl || undefined
    };
  },

  shareTimeline() {
    wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    wx.showModal({ title: '分享到朋友圈', content: '点击右上角“…”中的“分享到朋友圈”。分享会自动携带您的预约入口和绑定邀请码。', showCancel: false });
  },

  viewArtistHome() {
    if (!this.data.artist || !this.techId) return;
    wx.navigateTo({ url: `/pages/client/artist-home/index?id=${this.techId}&source=quick_booking` });
  },

  async bookNow() {
    if (this.data.submitting || !this.data.artist || !this.data.enabled) return;
    const launch = typeof wx.getLaunchOptionsSync === 'function' ? wx.getLaunchOptionsSync() : {};
    if (launch.scene === 1154) {
      wx.showModal({ title: '进入小程序预约', content: '请点击页面底部“前往小程序”，进入后点击“立即预约”完成授权。', showCancel: false });
      return;
    }
    const path = `/pages/client/create-order/index?techId=${this.techId}&mode=quick&source=quick_booking`;
    const loggedIn = wx.getStorageSync('role') === 'client' && !wx.getStorageSync('isTourist') &&
      (wx.getStorageSync('client_token') || wx.getStorageSync('token'));
    if (!loggedIn) {
      const url = buildClientLoginUrl(path, { inviteCode: this.inviteCode, source: 'card' });
      wx.navigateTo({ url: url + `&quickBookingTechId=${this.techId}` });
      return;
    }
    this.setData({ submitting: true });
    try {
      await api.client.profile.bindQuickBooking(this.techId, this.inviteCode);
      wx.navigateTo({ url: path });
    } catch (err) {
      wx.showToast({ title: err.message || '暂时无法预约，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
