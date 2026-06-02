const api = require('../../../services/api');

Page({
  data: {
    tags: [],
    newTag: '',
    loading: true,
    adding: false
  },

  async onLoad() {
    await this.loadTags();
  },

  async loadTags() {
    this.setData({ loading: true });
    try {
      const res = await api.technician.tagTemplates.list();
      this.setData({ tags: res.list || res.data || res || [], loading: false });
    } catch {
      this.setData({ loading: false });
    }
  },

  onNewTagInput(e) { this.setData({ newTag: e.detail.value }); },

  async addTag() {
    const tag = this.data.newTag.trim();
    if (!tag) { wx.showToast({ title: '请输入标签名', icon: 'none' }); return; }
    if (this.data.adding) return;

    this.setData({ adding: true });
    try {
      await api.technician.tagTemplates.create({ name: tag });
      this.setData({ newTag: '' });
      await this.loadTags();
    } catch (err) {
      wx.showToast({ title: err.message || '添加失败', icon: 'none' });
    } finally {
      this.setData({ adding: false });
    }
  },

  deleteTag(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除标签',
      content: `确定删除标签"${name}"吗？`,
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.technician.tagTemplates.delete(id);
          await this.loadTags();
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      }
    });
  }
});
