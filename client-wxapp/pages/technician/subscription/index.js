const api = require('../../../services/api');

Page({
  data: {
    currentPlan: null,
    plans: [],
    loading: true,
    loadFailed: false
  },

  onLoad() {
    this.loadSubscription();
  },

  async loadSubscription() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const [sub, plans] = await Promise.all([
        api.technician.subscription.current().catch(() => null),
        api.technician.subscription.plans()
      ]);
      this.setData({
        currentPlan: sub,
        plans: plans.list || plans.data || plans || [],
        loading: false,
        loadFailed: false
      });
    } catch {
      this.setData({ loading: false, loadFailed: true });
    }
  }
});
