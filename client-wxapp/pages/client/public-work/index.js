const api = require('../../../services/api');

Page({
  data: {
    work: null,
    loading: true,
    error: false,
    imageIndex: 0
  },

  onLoad(options) {
    if (options.id) {
      this.workId = options.id;
      this.loadWork();
    } else {
      this.setData({ loading: false, error: true });
    }
  },

  async loadWork() {
    try {
      const work = await api.client.works.detail(this.workId);
      this.setData({
        work: {
          ...work,
          dateStr: this.formatDate(work.createdAt)
        },
        loading: false
      });
    } catch (err) {
      console.error('Failed to load work:', err);
      this.setData({ loading: false, error: true });
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  onSwiperChange(e) {
    this.setData({ imageIndex: e.detail.current });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.work.imageUrls
    });
  },

  goBack() {
    wx.navigateBack();
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/client/login/index' });
  },

  goToArtist() {
    if (this.data.work && this.data.work.technician) {
      wx.navigateTo({
        url: `/pages/client/public-artist/index?id=${this.data.work.technician.id}`
      });
    }
  },

  onShareAppMessage() {
    const work = this.data.work;
    return {
      title: work.title || '美甲作品',
      path: `/pages/client/public-work/index?id=${this.workId}`,
      imageUrl: work.imageUrls && work.imageUrls[0]
    };
  }
});
