const api = require('../../../services/api');
const { formatTime } = require('../../../utils/util');

Page({
  data: {
    works: [],
    loading: false,
    currentTab: 'all'
  },

  onLoad() {
    this.loadWorks();
  },

  onShow() {
    this.loadWorks();
  },

  loadWorks() {
    this.setData({ loading: true });

    api.client.works.list()
      .then(res => {
        const works = (res.list || res.data || []).map(work => ({
          id: work.id,
          coverUrl: work.coverUrl,
          title: work.title,
          technicianAvatar: work.technician?.avatarUrl || '',
          technicianName: work.technician?.name || '',
          likes: work.likes || 0
        }));

        this.setData({ works, loading: false });
      })
      .catch(err => {
        console.error('Load works error:', err);
        this.setData({ loading: false });
      });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    this.loadWorks();
  },

  viewWork(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/client/work-detail/index?id=${id}` });
  },

  onSearch(e) {
    const keyword = e.detail.value;
    this.loadWorks({ keyword });
  },

  onPullDownRefresh() {
    this.loadWorks().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});