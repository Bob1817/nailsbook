const api = require('../../../services/api');

Page({
  data: { artistId: '', artist: {}, works: [], leftCol: [], rightCol: [], serviceCount: 0, loading: true, loadFailed: false, followed: false, followLoading: false },

  onLoad(options) {
    this.setData({ artistId: options.id || options.techId || '' });
    this.loadHome();
  },

  async loadHome() {
    if (!this.data.artistId) return this.setData({ loading: false, loadFailed: true });
    this.setData({ loading: true, loadFailed: false });
    try {
      const res = await api.public.artists.detail(this.data.artistId);
      const artist = res.artist || res.technician || res || {};
      artist.initial = (artist.name || '美').charAt(0);
      const works = (res.works || []).map((item, index) => ({
        id: item.id,
        title: item.title || '美甲作品',
        coverUrl: item.coverUrl || (item.imageUrls && item.imageUrls[0]) || '',
        tagsText: (Array.isArray(item.tags) ? item.tags : String(item.tags || '').split(',').filter(Boolean)).slice(0, 2).map((tag) => '#' + tag).join(' '),
        aspect: ['work-tall', 'work-standard', 'work-wide'][index % 3]
      })).filter((item) => item.coverUrl);
      this.setData({
        artist,
        works,
        leftCol: works.filter((_, index) => index % 2 === 0),
        rightCol: works.filter((_, index) => index % 2 === 1),
        serviceCount: (artist.serviceItems || []).length,
        loading: false
      });
      if (getApp().globalData.token && (getApp().globalData.role || wx.getStorageSync('role')) === 'client') {
        api.client.artists.followStatus(this.data.artistId).then((state) => this.setData({ followed: !!state.followed })).catch(() => {});
      }
    } catch (err) {
      console.error('load artist home error:', err);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  viewWork(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/client/public-work/index?id=' + id });
  },

  async toggleFollow() {
    if (this.data.followLoading) return;
    const app = getApp();
    if (!app.globalData.token || (app.globalData.role || wx.getStorageSync('role')) !== 'client') {
      const target = '/pages/client/artist-home/index?id=' + this.data.artistId;
      wx.navigateTo({ url: '/pages/login/index?redirect=' + encodeURIComponent(target) });
      return;
    }
    this.setData({ followLoading: true });
    try {
      const result = this.data.followed
        ? await api.client.artists.unfollow(this.data.artistId)
        : await api.client.artists.follow(this.data.artistId);
      const delta = result.followed ? 1 : -1;
      this.setData({ followed: !!result.followed, 'artist.followerCount': Math.max(0, (this.data.artist.followerCount || 0) + delta) });
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败，请重试', icon: 'none' });
    } finally { this.setData({ followLoading: false }); }
  },

  bookArtist() {
    const target = '/pages/client/create-order/index?techId=' + this.data.artistId;
    if (getApp().globalData.token && (getApp().globalData.role || wx.getStorageSync('role')) === 'client') {
      wx.navigateTo({ url: target });
    } else {
      wx.navigateTo({ url: '/pages/login/index?redirect=' + encodeURIComponent(target) });
    }
  }
});
