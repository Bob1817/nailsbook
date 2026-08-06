const api = require('../../../services/api');
const {
  normalizeCurrentSubscription,
  normalizePlans
} = require('../../../utils/subscription');

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
        currentPlan: normalizeCurrentSubscription(sub),
        plans: normalizePlans(plans),
        loading: false,
        loadFailed: false
      });
    } catch {
      this.setData({ loading: false, loadFailed: true });
    }
  },

  async previewPlanChange(e) {
    const planId = e.currentTarget.dataset.id;
    if (!planId) return;
    try {
      const preview = await api.technician.subscription.changePreview(planId);
      const readOnlyCount = (preview.affected || []).filter(item => item.willBeReadOnly).length;
      const effectiveText = preview.direction === 'downgrade'
        ? `降级将在当前周期结束时生效${readOnlyCount ? `，届时有 ${readOnlyCount} 项资源超出新额度并转为只读` : ''}`
        : '升级确认后立即生效';
      wx.showModal({
        title: `${preview.targetPlan.name}变更影响`,
        content: `${effectiveText}。历史客户、预约、作品和经营数据不会删除。`,
        showCancel: false,
        confirmText: '我知道了'
      });
    } catch {
      wx.showToast({ title: '变更影响加载失败', icon: 'none' });
    }
  }
});
