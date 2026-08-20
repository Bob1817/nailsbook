const api = require('../../../services/api');
const PAGE_SIZE = 10;

var ASPECTS_LEFT = ['aspect-4-5', 'aspect-3-4', 'aspect-5-6', 'aspect-3-4'];
var ASPECTS_RIGHT = ['aspect-3-4', 'aspect-5-6', 'aspect-4-5', 'aspect-3-4'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  return (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

function mapWork(work) {
  var name = work.technicianName || (work.technician && work.technician.name) || '';
  var rawTags = work.tags || [];
  var tags = Array.isArray(rawTags)
    ? rawTags
    : (typeof rawTags === 'string' ? rawTags.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : []);
  return {
    id: work.id,
    title: work.title || '美甲作品',
    coverUrl: work.coverUrl || (work.imageUrls && work.imageUrls[0]) || '',
    technicianId: work.technicianId || (work.technician && work.technician.id) || '',
    technicianName: name,
    technicianAvatarUrl: work.technicianAvatarUrl || (work.technician && work.technician.avatarUrl) || '',
    techInitial: name.charAt(0) || '美',
    tags: tags,
    likeCount: work.likeCount || 0,
    isLiked: !!work.isLiked,
    favoriteCount: work.favoriteCount || 0,
    isFavorited: true,
    commentCount: work.commentCount || 0,
    dateStr: formatDate(work.createdAt)
  };
}

Page({
  data: {
    works: [],
    leftCol: [],
    rightCol: [],
    loading: true,
    loadFailed: false,
    hasMore: false
  },

  onShow() {
    this.loadFavorites();
  },

  async loadFavorites() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const res = await api.client.favorites.list();
      const works = (res.list || res.data || res || []).map(mapWork);
      this._allWorks = works;
      const visible = works.slice(0, PAGE_SIZE);
      this.setData({ works: visible, loading: false, hasMore: visible.length < works.length });
      this.applyWaterfall(visible);
    } catch (err) {
      console.error('Load favorites error:', err);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  onReachBottom() {
    if (this.data.loading || !this.data.hasMore) return;
    const visible = (this._allWorks || []).slice(0, this.data.works.length + PAGE_SIZE);
    this.setData({ works: visible, hasMore: visible.length < this._allWorks.length });
    this.applyWaterfall(visible);
  },

  applyWaterfall(list) {
    var left = [], right = [];
    list.forEach(function (w) {
      var item = Object.assign({}, w);
      if (left.length <= right.length) {
        item.aspect = ASPECTS_LEFT[left.length % ASPECTS_LEFT.length];
        left.push(item);
      } else {
        item.aspect = ASPECTS_RIGHT[right.length % ASPECTS_RIGHT.length];
        right.push(item);
      }
    });
    this.setData({ leftCol: left, rightCol: right });
  },

  viewWork(e) {
    const id = e.detail && e.detail.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/client/work-detail/index?id=${id}` });
  },

  viewArtist(e) {
    const id = e.detail && e.detail.id;
    if (id) wx.navigateTo({ url: `/pages/client/artist-home/index?id=${id}` });
  },

  async toggleFavorite(e) {
    const id = e.detail && e.detail.id;
    if (!id) return;
    await api.client.works.favorite(id).catch(() => wx.showToast({ title: '操作失败', icon: 'none' }));
    this.loadFavorites();
  },

  goWorks() {
    wx.navigateTo({ url: '/pages/client/works/index' });
  },

  onPullDownRefresh() {
    this.loadFavorites().finally(() => wx.stopPullDownRefresh());
  }
});
