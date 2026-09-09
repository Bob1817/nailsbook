const api = require('../../../services/api');

function local(d) {
  if (!Number.isFinite(d.getTime())) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

Page({
  data: {
    actualStartTime: '',
    actualEndTime: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    actualAmount: '',
    materialCost: '0',
    materials: '',
    techniques: '',
    nailCondition: '',
    customerFeedback: '',
    careAdvice: '',
    submitting: false,
    loading: false,
    loaded: false,
    loadError: '',
    openingWork: false,
    saved: false,
    customerName: ''
  },

  async onLoad(o) {
    this.id = Number(o.id);
    return this.loadOrder();
  },

  async loadOrder() {
    if (this.data.loading) return;
    this.setData({ loading: true, loaded: false, loadError: '' });
    try {
      const order = await api.technician.orders.detail(this.id);
      this.customerId = order.customerId;
      const actualStartTime = local(new Date(order.confirmedStartTime || order.startTime));
      const actualEndTime = local(new Date());
      this.setData({
        actualStartTime,
        actualEndTime,
        startDate: actualStartTime.slice(0, 10),
        startTime: actualStartTime.slice(11),
        endDate: actualEndTime.slice(0, 10),
        endTime: actualEndTime.slice(11),
        actualAmount: String(order.actualAmount ?? order.quotePrice ?? order.price ?? order.paidAmount ?? 0),
        customerName: order.customerName || '',
        loaded: true
      });
    } catch (e) {
      this.setData({ loadError: e.message || '预约信息加载失败，请重试' });
    } finally {
      this.setData({ loading: false });
    }
  },

  input(e) {
    if (!this.data.loaded || this.data.submitting || this.data.saved) return;
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  changeTime(e) {
    if (!this.data.loaded || this.data.submitting || this.data.saved) return;
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const values = { ...this.data, [field]: value };
    this.setData({
      [field]: value,
      actualStartTime: values.startDate && values.startTime ? `${values.startDate}T${values.startTime}` : '',
      actualEndTime: values.endDate && values.endTime ? `${values.endDate}T${values.endTime}` : ''
    });
  },

  async submit() {
    const d = this.data;
    if (!d.loaded || d.submitting || d.saved) return;
    if (!String(d.actualAmount).trim() || !String(d.materialCost).trim()) return wx.showToast({ title: '请填写实际支付金额和材料成本', icon: 'none' });
    const amount = Number(d.actualAmount), cost = Number(d.materialCost);
    if (!d.actualStartTime || !d.actualEndTime) return wx.showToast({ title: '请填写实际服务时间', icon: 'none' });
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(cost) || cost < 0) return wx.showToast({ title: '金额或材料成本不正确', icon: 'none' });
    const start = new Date(d.actualStartTime), end = new Date(d.actualEndTime);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return wx.showToast({ title: '结束时间须晚于开始时间', icon: 'none' });
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
  async goPublishWork() {
    if (!this.id || !this.data.saved || this._openingWork) return;
    this._openingWork = true;
    this.setData({ openingWork: true });
    try {
      const work = await api.technician.works.createFromOrder(this.id);
      wx.redirectTo({ url: `/pages/technician/work-edit/index?id=${work.id}` });
    } catch (e) {
      wx.showToast({ title: e.message || '创建作品草稿失败', icon: 'none' });
    } finally {
      this._openingWork = false;
      this.setData({ openingWork: false });
    }
  },

  finishAndBack() {
    if (!this.data.saved || this.data.openingWork) return;
    wx.showToast({ title: '服务记录已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack({ delta: 1 }), 700);
  }
});
