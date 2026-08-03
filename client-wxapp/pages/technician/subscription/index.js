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
        currentPlan: sub ? {
          ...sub,
          displayName: sub.plan ? sub.plan.name : '免费版',
          featureText: sub.plan && sub.plan.features ? sub.plan.features.map(code => ({
            customer_management: '客户管理', booking: '预约管理', works: '作品管理',
            referral_5_percent: '客户邀请与5%美甲基金', insights: '经营分析', branding: '高级主页展示'
          }[code] || code)).join('、') : '基础经营功能'
        } : null,
        plans: plans.list || plans.data || plans || [],
        loading: false,
        loadFailed: false
      });
    } catch {
      this.setData({ loading: false, loadFailed: true });
    }
  }
});
