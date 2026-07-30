const api = require('../../../services/api');

Page({
  data: {
    work: null,
    loading: true,
    error: false,
    errorMessage: '',
    canRetry: false,
    imageIndex: 0
  },

  onLoad(options) {
    if (options.shareToken) {
      this.shareToken = options.shareToken;
      this.loadWork();
    } else if (options.id) {
      this.workId = options.id;
      this.loadWork();
    } else {
      this.setData({ loading: false, error: true, errorMessage: '分享链接无效', canRetry: false });
    }
  },

  async loadWork() {
    this.setData({ loading: true, error: false, errorMessage: '', canRetry: false });
    try {
      const work = this.shareToken
        ? await api.public.works.shared(this.shareToken)
        : await api.public.works.detail(this.workId);
      this.setData({
        work: {
          ...work,
          dateStr: this.formatDate(work.createdAt)
        },
        loading: false,
        error: false
      });
    } catch (err) {
      console.error('Failed to load work:', err);
      this.setData({ loading: false, error: true, errorMessage: '作品暂时无法加载', canRetry: true });
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

  bookSameStyle() {
    const work = this.data.work;
    if (!work || !work.id) return;
    const target = `/pages/client/create-order/index?workId=${work.id}`;
    const app = getApp();
    const token = app.globalData.token || wx.getStorageSync('client_token');
    const role = app.globalData.role || wx.getStorageSync('role');
    if (token && role === 'client') {
      wx.navigateTo({ url: target });
      return;
    }
    wx.navigateTo({
      url: `/pages/client/login/index?redirect=${encodeURIComponent(target)}`
    });
  },

  goToArtist() {
    if (this.data.work && this.data.work.technician) {
      const target = `/pages/client/works/index?techId=${this.data.work.technician.id}`;
      const app = getApp();
      const token = app.globalData.token || wx.getStorageSync('client_token');
      const role = app.globalData.role || wx.getStorageSync('role');
      if (token && role === 'client') {
        wx.navigateTo({ url: target });
      } else {
        wx.navigateTo({ url: `/pages/client/login/index?redirect=${encodeURIComponent(target)}` });
      }
    }
  },

  onShareAppMessage() {
    const work = this.data.work;
    return {
      title: work.title || '美甲作品',
      path: this.shareToken
        ? `/pages/client/public-work/index?shareToken=${this.shareToken}`
        : `/pages/client/public-work/index?id=${this.workId}`,
      imageUrl: work.imageUrls && work.imageUrls[0]
    };
  }
});
