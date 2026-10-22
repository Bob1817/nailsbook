const api = require('../../../services/api');

function local(d) {
  if (!Number.isFinite(d.getTime())) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function photosByStage(record, stage) {
  return ((record && record.photos) || []).filter(item => item.stage === stage).map(item => item.url);
}

Page({
  data: {
    actualStartTime: '', actualEndTime: '', startDate: '', startTime: '', endDate: '', endTime: '',
    actualAmount: '', materialCost: '0', materials: '', tools: '', techniques: '', nailCondition: '',
    customerFeedback: '', clientReaction: '', discomfortNotes: '', preferenceNotes: '', nextServiceNotes: '', careAdvice: '',
    beforePhotos: [], duringPhotos: [], afterPhotos: [],
    photoStages: [
      { key: 'before', label: '服务前' },
      { key: 'during', label: '服务中' },
      { key: 'after', label: '完成后' }
    ],
    factAllergy: '', factContraindication: '', factPreference: '', factCommunication: '', factReminder: '',
    orderStatus: '', submitting: false, uploading: false, loading: false, loaded: false, loadError: '',
    openingWork: false, saved: false, customerName: '', recordStatus: 'draft'
  },

  async onLoad(options) { this.id = Number(options.id); return this.loadOrder(); },

  async loadOrder() {
    if (this.data.loading) return;
    this.setData({ loading: true, loaded: false, loadError: '' });
    try {
      const order = await api.technician.orders.detail(this.id);
      const record = order.serviceRecord || {};
      const actualStartTime = local(new Date(record.actualStartTime || order.confirmedStartTime || order.startTime));
      const actualEndTime = local(new Date(record.actualEndTime || new Date()));
      this.setData({
        actualStartTime, actualEndTime,
        startDate: actualStartTime.slice(0, 10), startTime: actualStartTime.slice(11),
        endDate: actualEndTime.slice(0, 10), endTime: actualEndTime.slice(11),
        actualAmount: String(record.actualAmount ?? order.actualAmount ?? order.quotePrice ?? order.price ?? order.paidAmount ?? 0),
        materialCost: String(record.materialCost ?? order.materialCost ?? 0),
        materials: record.materials || '', tools: record.tools || '', techniques: record.techniques || '',
        nailCondition: record.nailCondition || '', customerFeedback: record.customerFeedback || '',
        clientReaction: record.clientReaction || '', discomfortNotes: record.discomfortNotes || '',
        preferenceNotes: record.preferenceNotes || '', nextServiceNotes: record.nextServiceNotes || '', careAdvice: record.careAdvice || '',
        beforePhotos: photosByStage(record, 'before'), duringPhotos: photosByStage(record, 'during'), afterPhotos: photosByStage(record, 'after'),
        orderStatus: order.status, recordStatus: record.status || 'draft',
        customerName: (order.customer && order.customer.name) || order.customerName || '', loaded: true
      });
    } catch (e) { this.setData({ loadError: e.message || '预约信息加载失败，请重试' }); }
    finally { this.setData({ loading: false }); }
  },

  input(e) {
    if (!this.data.loaded || this.data.submitting) return;
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  changeTime(e) {
    if (!this.data.loaded || this.data.submitting) return;
    const { field } = e.currentTarget.dataset;
    const values = { ...this.data, [field]: e.detail.value };
    this.setData({
      [field]: e.detail.value,
      actualStartTime: values.startDate && values.startTime ? `${values.startDate}T${values.startTime}` : '',
      actualEndTime: values.endDate && values.endTime ? `${values.endDate}T${values.endTime}` : ''
    });
  },

  choosePhotos(e) {
    const stage = e.currentTarget.dataset.stage;
    const key = `${stage}Photos`;
    const remaining = 9 - (this.data[key] || []).length;
    if (remaining < 1 || this.data.uploading) return;
    const selected = async files => {
      this.setData({ uploading: true });
      try {
        const urls = [];
        for (const file of files.slice(0, remaining)) {
          const result = await api.upload.image(file.tempFilePath || file.path, 'technician');
          if (result.url) urls.push(result.url);
        }
        this.setData({ [key]: [...this.data[key], ...urls] });
      } catch (err) { wx.showToast({ title: err.message || '照片上传失败', icon: 'none' }); }
      finally { this.setData({ uploading: false }); }
    };
    if (typeof wx.chooseMedia === 'function') {
      wx.chooseMedia({ count: remaining, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'], success: res => selected(res.tempFiles || []) });
    } else {
      wx.chooseImage({ count: remaining, sourceType: ['album', 'camera'], sizeType: ['compressed'], success: res => selected((res.tempFilePaths || []).map(tempFilePath => ({ tempFilePath }))) });
    }
  },

  removePhoto(e) {
    const { stage, index } = e.currentTarget.dataset;
    const key = `${stage}Photos`;
    this.setData({ [key]: this.data[key].filter((_, i) => i !== Number(index)) });
  },
  previewPhoto(e) {
    const key = `${e.currentTarget.dataset.stage}Photos`;
    wx.previewImage({ current: e.currentTarget.dataset.url, urls: this.data[key] });
  },

  recordPayload(complete) {
    const d = this.data;
    const profileFacts = [
      ['allergy', d.factAllergy], ['contraindication', d.factContraindication], ['preference', d.factPreference],
      ['communication', d.factCommunication], ['reminder', d.factReminder]
    ].filter(([, content]) => String(content || '').trim()).map(([category, content]) => ({ category, content: content.trim() }));
    return {
      materials: d.materials, tools: d.tools, techniques: d.techniques, nailCondition: d.nailCondition,
      customerFeedback: d.customerFeedback, clientReaction: d.clientReaction, discomfortNotes: d.discomfortNotes,
      preferenceNotes: d.preferenceNotes, nextServiceNotes: d.nextServiceNotes, careAdvice: d.careAdvice,
      beforePhotos: d.beforePhotos, duringPhotos: d.duringPhotos, afterPhotos: d.afterPhotos,
      profileFacts, complete
    };
  },

  async saveDraft() {
    if (this.data.submitting || this.data.uploading) return;
    this.setData({ submitting: true });
    try {
      await api.technician.orders.saveServiceRecord(this.id, this.recordPayload(false));
      this.setData({ recordStatus: 'draft' });
      wx.showToast({ title: '草稿已保存', icon: 'success' });
    } catch (e) { wx.showToast({ title: e.message || '保存失败', icon: 'none' }); }
    finally { this.setData({ submitting: false }); }
  },

  async submit() {
    const d = this.data;
    if (!d.loaded || d.submitting || d.uploading || d.saved) return;
    const completeRecord = Boolean(d.nailCondition.trim() && d.afterPhotos.length);
    if (d.orderStatus === 'completed') {
      this.setData({ submitting: true });
      try {
        await api.technician.orders.saveServiceRecord(this.id, this.recordPayload(completeRecord));
        this.setData({ submitting: false, saved: true, recordStatus: completeRecord ? 'complete' : 'draft' });
      } catch (e) { this.setData({ submitting: false }); wx.showToast({ title: e.message || '保存失败', icon: 'none' }); }
      return;
    }
    if (!String(d.actualAmount).trim() || !String(d.materialCost).trim()) return wx.showToast({ title: '请填写实际支付金额和材料成本', icon: 'none' });
    const amount = Number(d.actualAmount), cost = Number(d.materialCost);
    const start = new Date(d.actualStartTime), end = new Date(d.actualEndTime);
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(cost) || cost < 0 || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return wx.showToast({ title: '请检查金额和服务时间', icon: 'none' });
    this.setData({ submitting: true });
    try {
      const recordPayload = this.recordPayload(completeRecord);
      delete recordPayload.complete;
      await api.technician.orders.complete(this.id, {
        actualStartTime: start.toISOString(), actualEndTime: end.toISOString(), actualAmount: amount, materialCost: cost,
        ...recordPayload, recordComplete: completeRecord
      });
      this.setData({ submitting: false, saved: true, recordStatus: completeRecord ? 'complete' : 'draft' });
    } catch (e) { this.setData({ submitting: false }); wx.showToast({ title: e.message || '完成失败', icon: 'none' }); }
  },

  async goPublishWork() {
    if (!this.id || !this.data.saved || this._openingWork) return;
    this._openingWork = true; this.setData({ openingWork: true });
    try { const work = await api.technician.works.createFromOrder(this.id); wx.redirectTo({ url: `/pages/technician/work-edit/index?id=${work.id}` }); }
    catch (e) { wx.showToast({ title: e.message || '创建作品草稿失败', icon: 'none' }); }
    finally { this._openingWork = false; this.setData({ openingWork: false }); }
  },
  finishAndBack() { if (!this.data.openingWork) wx.navigateBack({ delta: 1 }); }
});
