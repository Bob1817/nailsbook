const api = require('../../../services/api');

Page({
  data: {
    works: [],
    loading: true
  },

  onLoad() {
    this.loadFavorites();
  },

  onShow() {
    this.loadFavorites();
  },

  async loadFavorites() {
    this.setData({ loading: true });
    try {
      const res = await api.client.favorites.list();
      const works = (res.list || res.data || res || []).map(work => ({
        id: work.id,
        title: work.title || '未命名作品',
        coverUrl: work.coverUrl || '',
        technicianName: work.technicianName || work.technician?.name || ''
      }));
      this.setData({ works, loading: false });
    } catch (err) {
      console.error('Load favorites error:', err);
      this.setData({ loading: false });
    }
  },

  viewWork(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/client/work-detail/index?id=${id}` });
  },

  goHome() {
    wx.navigateTo({ url: '/pages/client/home/index' });
  },

  onPullDownRefresh() {
    this.loadFavorites().finally(() => wx.stopPullDownRefresh());
  }
});
