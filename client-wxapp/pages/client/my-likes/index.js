const api = require('../../../services/api');

Page({
  data: {
    works: [],
    loading: true
  },

  onLoad() {
    this.loadLikes();
  },

  onShow() {
    this.loadLikes();
  },

  async loadLikes() {
    this.setData({ loading: true });
    try {
      const res = await api.client.likes.list();
      const works = (res.list || res.data || res || []).map(work => ({
        id: work.id,
        title: work.title || '未命名作品',
        coverUrl: work.coverUrl || '',
        technicianName: work.technicianName || work.technician?.name || '',
        likeCount: work.likeCount || 0
      }));
      this.setData({ works, loading: false });
    } catch (err) {
      console.error('Load likes error:', err);
      this.setData({ loading: false });
    }
  },

  viewWork(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/client/work-detail/index?id=${id}` });
  },

  goWorks() {
    wx.navigateTo({ url: '/pages/client/works/index' });
  },

  onPullDownRefresh() {
    this.loadLikes().finally(() => wx.stopPullDownRefresh());
  }
});
