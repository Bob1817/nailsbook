const api = require('../../../services/api');

Page({
  data: {
    works: [],
    leftCol: [],
    rightCol: [],
    loading: false,
    selectedWorkId: null
  },

  onLoad() { this.loadWorks(); },
  onShow() { this.loadWorks(); },
  onPullDownRefresh() { this.loadWorks().finally(() => wx.stopPullDownRefresh()); },

  async loadWorks() {
    this.setData({ loading: true });
    try {
      const res = await api.technician.works.list({});
      const works = Array.isArray(res) ? res : (res.data || []);
      this.setData({ works });
      this.splitIntoColumns(works);
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  splitIntoColumns(works) {
    const leftCol = [];
    const rightCol = [];
    works.forEach((work, index) => {
      if (index % 2 === 0) leftCol.push(work);
      else rightCol.push(work);
    });
    this.setData({ leftCol, rightCol });
  },

  /* ===== 操作菜单 ===== */
  showActions(e) {
    const { id, visible, pinned, featured } = e.currentTarget.dataset;
    this.setData({ selectedWorkId: id });

    const itemList = [
      visible ? '隐藏作品' : '显示作品',
      pinned ? '取消置顶' : '置顶作品',
      featured ? '取消推荐' : '推荐作品',
      '编辑作品',
      '删除作品'
    ];

    wx.showActionSheet({
      itemList,
      success: (res) => {
        switch (res.tapIndex) {
          case 0: this.toggleVisible(id); break;
          case 1: this.togglePinned(id); break;
          case 2: this.toggleFeatured(id); break;
          case 3: this.goEditById(id); break;
          case 4: this.confirmDelete(id); break;
        }
      }
    });
  },

  goCreate() { wx.navigateTo({ url: '/pages/technician/work-edit/index' }); },
  goDetail(e) { wx.navigateTo({ url: '/pages/technician/work-detail/index?id=' + e.currentTarget.dataset.id }); },
  goEditById(id) { wx.navigateTo({ url: '/pages/technician/work-edit/index?id=' + id }); },

  async toggleVisible(id) {
    try {
      await api.technician.works.toggleVisible(id);
      const works = this.data.works.map(w => w.id === id ? { ...w, isVisible: !w.isVisible } : w );
      this.setData({ works });
      this.splitIntoColumns(works);
      wx.showToast({ title: works.find(w => w.id === id)?.isVisible ? '已显示' : '已隐藏', icon: 'success' });
    } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }); }
  },

  async togglePinned(id) {
    try {
      await api.technician.works.togglePinned(id);
      const works = this.data.works.map(w => w.id === id ? { ...w, isPinned: !w.isPinned } : w );
      this.setData({ works });
      this.splitIntoColumns(works);
      wx.showToast({ title: works.find(w => w.id === id)?.isPinned ? '已置顶' : '已取消置顶', icon: 'success' });
    } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }); }
  },

  async toggleFeatured(id) {
    try {
      await api.technician.works.toggleFeatured(id);
      const works = this.data.works.map(w => w.id === id ? { ...w, isFeatured: !w.isFeatured } : w );
      this.setData({ works });
      this.splitIntoColumns(works);
      wx.showToast({ title: works.find(w => w.id === id)?.isFeatured ? '已推荐' : '已取消推荐', icon: 'success' });
    } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }); }
  },

  confirmDelete(id) {
    wx.showModal({
      title: '删除作品',
      content: '确定删除这个作品吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: (res) => { if (res.confirm) this.deleteWork(id); }
    });
  },

  async deleteWork(id) {
    wx.showLoading({ title: '删除中...' });
    try {
      await api.technician.works.delete(id);
      wx.hideLoading();
      wx.showToast({ title: '已删除', icon: 'success' });
      const works = this.data.works.filter(w => w.id !== id);
      this.setData({ works });
      this.splitIntoColumns(works);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  }
});
