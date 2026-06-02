const api = require('../../../services/api');

Page({
  data: {
    currentPlan: null,
    plans: [],
    loading: true
  },

  async onLoad() {
    try {
      const [sub, plans] = await Promise.all([
        api.technician.subscription.get().catch(() => null),
        api.technician.subscription.plans().catch(() => [])
      ]);
      this.setData({
        currentPlan: sub,
        plans: plans.list || plans.data || plans || [],
        loading: false
      });
    } catch {
      this.setData({ loading: false });
    }
  },

  contactSupport() {
    wx.showToast({ title: '请联系平台客服升级套餐', icon: 'none', duration: 3000 });
  }
});
