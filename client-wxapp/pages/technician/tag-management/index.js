const uiColors = require('../../../utils/colors');
const api = require('../../../services/api');

Page({
  data: { activeType: 'customer', customerTags: [], workTags: [], currentTags: [], newTag: '', canAddTag: false, loading: true, loadFailed: false, adding: false, organizing: false },
  onLoad(options) { if (options && options.type === 'work') this.setData({ activeType: 'work' }); this.loadTags(); },
  async loadTags() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const [customerResult, workResult] = await Promise.all([api.technician.tagTemplates.list('customer'), api.technician.tagTemplates.list('work')]);
      const customerTags = customerResult.list || customerResult.data || customerResult || [];
      const workTags = workResult.list || workResult.data || workResult || [];
      this.setData({ customerTags, workTags, loading: false, loadFailed: false }); this.syncCurrentTags();
    } catch (e) { this.setData({ loading: false, loadFailed: true }); }
  },
  syncCurrentTags() { this.setData({ currentTags: this.data.activeType === 'work' ? this.data.workTags : this.data.customerTags }); },
  switchType(e) { const activeType = e.currentTarget.dataset.type; if (!activeType || activeType === this.data.activeType) return; this.setData({ activeType, newTag: '', canAddTag: false, organizing: false }); this.syncCurrentTags(); },
  toggleOrganizing() { this.setData({ organizing: !this.data.organizing }); },
  onNewTagInput(e) { const newTag = e.detail.value; this.setData({ newTag, canAddTag: !!newTag.trim() }); },
  async addTag() {
    if (this.data.adding) return;
    const name = this.data.newTag.trim();
    const type = this.data.activeType;
    if (!name) return wx.showToast({ title: '请输入标签名', icon: 'none' });
    if (this.data.currentTags.some((item) => item.name === name)) return wx.showToast({ title: '该分类中已有此标签', icon: 'none' });
    this.setData({ adding: true });
    try {
      await api.technician.tagTemplates.create({ name, type });
      if (this.data.activeType === type && this.data.newTag.trim() === name) {
        this.setData({ newTag: '', canAddTag: false });
      }
      await this.loadTags();
    }
    catch (err) { wx.showToast({ title: err.message || '添加失败', icon: 'none' }); }
    finally { this.setData({ adding: false }); }
  },
  deleteTag(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({ title: '删除标签', content: `确定删除“${name}”吗？`, confirmColor: uiColors.danger, success: async (res) => {
      if (!res.confirm) return;
      try { await api.technician.tagTemplates.delete(id); await this.loadTags(); }
      catch (err) { wx.showToast({ title: err.message || '删除失败', icon: 'none' }); }
    } });
  }
});
