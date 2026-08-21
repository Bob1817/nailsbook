const api = require('../../../services/api');

function local(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

Page({
  data: {
    actualStartTime: '',
    actualEndTime: '',
    actualAmount: '',
    materialCost: '0',
    materials: '',
    techniques: '',
    nailCondition: '',
    customerFeedback: '',
    careAdvice: '',
    submitting: false,
    saved: false,
    customerName: ''
  },

  async onLoad(o) {
    this.id = Number(o.id);
    const order = await api.technician.orders.detail(this.id);
    this.customerId = order.customerId;
    this.setData({
      actualStartTime: local(new Date(order.confirmedStartTime || order.startTime)),
      actualEndTime: local(new Date()),
      actualAmount: String(order.paidAmount || order.price || 0),
      customerName: order.customerName || ''
    });
  },

  input(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  async submit() {
    const d = this.data;
    if (d.submitting || d.saved) return;
    const amount = Number(d.actualAmount), cost = Number(d.materialCost);
    if (!d.actualStartTime || !d.actualEndTime) return wx.showToast({ title: '请填写实际服务时间', icon: 'none' });
    if (Number.isNaN(amount) || amount < 0 || Number.isNaN(cost) || cost < 0) return wx.showToast({ title: '金额或材料成本不正确', icon: 'none' });
    this.setData({ submitting: true });
    try {
      await api.technician.orders.complete(this.id, {
        actualStartTime: new Date(d.actualStartTime).toISOString(),
        actualEndTime: new Date(d.actualEndTime).toISOString(),
        actualAmount: amount,
        materialCost: cost,
        materials: d.materials || undefined,
        techniques: d.techniques || undefined,
        nailCondition: d.nailCondition || undefined,
        customerFeedback: d.customerFeedback || undefined,
        careAdvice: d.careAdvice || undefined
      });
      this.setData({ submitting: false, saved: true });
    } catch (e) {
      this.setData({ submitting: false });
      wx.showToast({ title: e.message || '完成失败', icon: 'none' });
    }
  },

  // 保存成功后的后续行动：发布关联作品（预填订单与授权信息）
  goPublishWork() {
    if (!this.id) return;
    wx.redirectTo({
      url: `/pages/technician/work-edit/index?orderId=${this.id}`
    });
  },

  finishAndBack() {
    wx.showToast({ title: '服务记录已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack({ delta: 2 }), 700);
  }
});
