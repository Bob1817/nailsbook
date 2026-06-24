const api = require('../../../services/api');

Page({
  data: {
    enabled: false,
    radius: '',
    pricing: [{ minKm: 0, maxKm: 5, price: 0 }],
    nightFee: '',
    holidayFee: '',
    minOrderAmount: '',
    loading: true,
    saving: false,
    fromSetup: false
  },

  onLoad(options) {
    const fromSetup = options.from === 'setup';
    this.loadConfig();
    this.setData({ fromSetup });
  },

  async loadConfig() {
    this.setData({ loading: true });
    try {
      const userInfo = await api.technician.auth.getUserInfo();
      const pricing = userInfo.homeServicePricing || [{ minKm: 0, maxKm: 5, price: 0 }];
      this.setData({
        enabled: !!userInfo.homeService,
        radius: userInfo.homeServiceRadius ? String(userInfo.homeServiceRadius) : '',
        pricing: Array.isArray(pricing) ? pricing : JSON.parse(pricing),
        nightFee: userInfo.nightServiceFee != null ? String(userInfo.nightServiceFee) : '',
        holidayFee: userInfo.holidayServiceFee != null ? String(userInfo.holidayServiceFee) : '',
        minOrderAmount: userInfo.minOrderAmount != null ? String(userInfo.minOrderAmount) : '',
        loading: false
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  toggleEnabled(e) {
    this.setData({ enabled: e.detail.value });
  },

  onRadiusInput(e) { this.setData({ radius: e.detail.value }); },
  onNightFeeInput(e) { this.setData({ nightFee: e.detail.value }); },
  onHolidayFeeInput(e) { this.setData({ holidayFee: e.detail.value }); },
  onMinAmountInput(e) { this.setData({ minOrderAmount: e.detail.value }); },

  // 阶梯报价相关
  onPricingMinKmInput(e) {
    const idx = e.currentTarget.dataset.idx;
    const pricing = [...this.data.pricing];
    pricing[idx].minKm = parseFloat(e.detail.value) || 0;
    this.setData({ pricing });
  },

  onPricingMaxKmInput(e) {
    const idx = e.currentTarget.dataset.idx;
    const pricing = [...this.data.pricing];
    pricing[idx].maxKm = parseFloat(e.detail.value) || 0;
    this.setData({ pricing });
  },

  onPricingPriceInput(e) {
    const idx = e.currentTarget.dataset.idx;
    const pricing = [...this.data.pricing];
    pricing[idx].price = parseFloat(e.detail.value) || 0;
    this.setData({ pricing });
  },

  addPricingTier() {
    const pricing = [...this.data.pricing];
    const last = pricing[pricing.length - 1];
    pricing.push({ minKm: last.maxKm, maxKm: last.maxKm + 5, price: last.price + 10 });
    this.setData({ pricing });
  },

  removePricingTier(e) {
    const idx = e.currentTarget.dataset.idx;
    if (this.data.pricing.length <= 1) return;
    const pricing = this.data.pricing.filter((_, i) => i !== idx);
    this.setData({ pricing });
  },

  async save() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      await api.technician.auth.updateServiceType({
        homeService: this.data.enabled,
        homeServiceRadius: this.data.radius ? parseFloat(this.data.radius) : null,
        homeServicePricing: JSON.stringify(this.data.pricing),
        nightServiceFee: this.data.nightFee ? parseFloat(this.data.nightFee) : null,
        holidayServiceFee: this.data.holidayFee ? parseFloat(this.data.holidayFee) : null,
        minOrderAmount: this.data.minOrderAmount ? parseFloat(this.data.minOrderAmount) : null
      });

      // 更新本地缓存
      const res = await api.technician.auth.getUserInfo();
      const userInfo = wx.getStorageSync('userInfo') || {};
      Object.assign(userInfo, res);
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('technician_userInfo', userInfo);

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });

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
