const api = require('../../services/api');
const { openSetupStep } = require('../../utils/booking-setup');
Component({
  data: { setup: null, loading: true, error: '', saving: false },
  lifetimes: { attached() { this.refresh(); }, detached() { this._request = (this._request || 0) + 1; } },
  pageLifetimes: { show() { this.refresh(); }, hide() { this._request = (this._request || 0) + 1; } },
  methods: {
    async refresh() {
      const request = this._request = (this._request || 0) + 1;
      const user = wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || {};
      const id = user.id;
      this.setData({ loading: true, error: '' });
      try {
        const profile = await api.technician.auth.getUserInfo();
        const current = wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || {};
        if (request !== this._request || current.id !== id || wx.getStorageSync('role') !== 'technician') return;
        if (!profile.bookingSetup) throw new Error('接单准备暂不可用，请稍后重试');
        const cached = { ...current, ...profile };
        wx.setStorageSync('technician_userInfo', cached);
        wx.setStorageSync('userInfo', cached);
        this.setData({ setup: profile.bookingSetup, loading: false });
        this.triggerEvent('refresh', profile);
      } catch (error) {
        if (request === this._request) this.setData({ loading: false, error: error.message || '准备进度加载失败' });
      }
    },
    open(e) { if (!this.data.loading && !this.data.saving) openSetupStep(e.currentTarget.dataset.key); },
    async enable() {
      if (this.data.loading || this.data.saving || this.data.error || !this.data.setup || !this.data.setup.ready) return;
      this.setData({ saving: true });
      try {
        await api.technician.auth.updateStatus('active');
        wx.showToast({ title: '已开启接单', icon: 'success' });
      } catch (error) {
        wx.showToast({ title: error.message || '开启失败，请重试', icon: 'none' });
      } finally {
        await this.refresh();
        this.setData({ saving: false });
      }
    }
  }
});
