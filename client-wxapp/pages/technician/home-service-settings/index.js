const api = require('../../../services/api');

const DEFAULTS = {
  radius: '10',
  extraFee: '0',
  minOrderAmount: '0',
  notes: ''
};

Page({
  data: {
    enabled: false,
    radius: '',
    extraFee: '',
    minOrderAmount: '',
    notes: '',
    loading: true,
    saving: false,
    fromSetup: false,       // 从引导卡进入时显示不同文案
    _defaultFilled: false
  },

  async onLoad(options) {
    const fromSetup = options.from === 'setup';
    try {
      const res = await api.technician.homeService.get();
      this.setData({
        enabled: res.enabled || false,
        radius: res.radius ? String(res.radius) : '',
        extraFee: res.extraFee != null ? String(res.extraFee) : '',
        minOrderAmount: res.minOrderAmount != null ? String(res.minOrderAmount) : '',
        notes: res.notes || '',
        loading: false,
        fromSetup
      });
    } catch {
      this.setData({ loading: false, fromSetup });
    }
  },

  // 手动拨 toggle：开启时若字段全空则自动填入默认值
  toggleEnabled(e) {
    const enabled = e.detail.value;
    if (enabled && this._isConfigEmpty()) {
      this.setData({ enabled, ...DEFAULTS, _defaultFilled: true });
    } else {
      this.setData({ enabled, _defaultFilled: false });
    }
  },

  // 快速开启：填入默认值 + 立即保存
  async quickEnable() {
    this.setData({ enabled: true, ...DEFAULTS, _defaultFilled: true });
    await this.save();
  },

  _isConfigEmpty() {
    const d = this.data;
    return !d.radius && !d.extraFee && !d.minOrderAmount;
  },

  onRadiusInput(e) { this.setData({ radius: e.detail.value, _defaultFilled: false }); },
  onExtraFeeInput(e) { this.setData({ extraFee: e.detail.value, _defaultFilled: false }); },
  onMinAmountInput(e) { this.setData({ minOrderAmount: e.detail.value, _defaultFilled: false }); },
  onNotesInput(e) { this.setData({ notes: e.detail.value }); },

  async save() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      await api.technician.homeService.update({
        enabled: this.data.enabled,
        radius: this.data.radius ? Number(this.data.radius) : null,
        extraFee: this.data.extraFee !== '' ? Number(this.data.extraFee) : null,
        minOrderAmount: this.data.minOrderAmount !== '' ? Number(this.data.minOrderAmount) : null,
        notes: this.data.notes
      });
      wx.hideLoading();
      this.setData({ _defaultFilled: false });

      // 更新本地 userInfo 缓存，让 profile 页回来后状态点立即刷新
      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.homeService = this.data.enabled || null;
      wx.setStorageSync('userInfo', userInfo);

      const toastTitle = this.data.enabled ? '上门服务已开启' : '设置已保存';
      wx.showToast({ title: toastTitle, icon: 'success' });

      // 从引导卡进入且已成功开启 → 延迟返回，引导卡会自动消失
      if (this.data.fromSetup && this.data.enabled) {
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
