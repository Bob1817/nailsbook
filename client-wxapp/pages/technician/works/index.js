const api = require('../../../services/api');

Page({
  data: {
    works: [],
    loading: false
  },

  onLoad() {
    this.loadWorks();
  },

  onShow() {
    this.loadWorks();
  },

  async loadWorks() {
    this.setData({ loading: true });
    try {
      const res = await api.technician.works.list({});
      this.setData({ works: Array.isArray(res) ? res : (res.data || []) });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/technician/work-edit/index' });
  },

  goEdit(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/technician/work-edit/index?id=${id}` });
  },

  async toggleVisible(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await api.technician.works.toggleVisible(id);
      const works = this.data.works.map(w =>
        w.id === id ? { ...w, isVisible: !w.isVisible } : w
      );
      this.setData({ works });
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  confirmDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除作品',
      content: '确定删除这个作品吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) this.deleteWork(id);
      }
    });
  },

  async deleteWork(id) {
    wx.showLoading({ title: '删除中...' });
    try {
      await api.technician.works.delete(id);
      wx.hideLoading();
      wx.showToast({ title: '已删除', icon: 'success' });
      this.setData({ works: this.data.works.filter(w => w.id !== id) });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  }
});
