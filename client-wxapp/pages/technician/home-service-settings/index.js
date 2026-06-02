const api = require('../../../services/api');

Page({
  data: {
    enabled: false,
    radius: '',
    extraFee: '',
    minOrderAmount: '',
    notes: '',
    loading: true,
    saving: false
  },

  async onLoad() {
    try {
      const res = await api.technician.homeService.get();
      this.setData({
        enabled: res.enabled || false,
        radius: res.radius ? String(res.radius) : '',
        extraFee: res.extraFee ? String(res.extraFee) : '',
        minOrderAmount: res.minOrderAmount ? String(res.minOrderAmount) : '',
        notes: res.notes || '',
        loading: false
      });
    } catch {
      this.setData({ loading: false });
    }
  },

  toggleEnabled(e) {
    this.setData({ enabled: e.detail.value });
  },

  onRadiusInput(e) { this.setData({ radius: e.detail.value }); },
  onExtraFeeInput(e) { this.setData({ extraFee: e.detail.value }); },
  onMinAmountInput(e) { this.setData({ minOrderAmount: e.detail.value }); },
  onNotesInput(e) { this.setData({ notes: e.detail.value }); },

  async save() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      await api.technician.homeService.update({
        enabled: this.data.enabled,
        radius: this.data.radius ? Number(this.data.radius) : null,
        extraFee: this.data.extraFee ? Number(this.data.extraFee) : null,
        minOrderAmount: this.data.minOrderAmount ? Number(this.data.minOrderAmount) : null,
        notes: this.data.notes
      });
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
