const api = require('../../../services/api');

Page({
  data: { artistId: '', artist: {}, works: [], leftCol: [], rightCol: [], serviceCount: 0, loading: true, loadFailed: false },

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
    } catch (err) {
      console.error('load artist home error:', err);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  viewWork(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/client/work-detail/index?id=' + id });
  },

  bookArtist() {
    wx.navigateTo({ url: '/pages/client/create-order/index?techId=' + this.data.artistId });
  }
});
