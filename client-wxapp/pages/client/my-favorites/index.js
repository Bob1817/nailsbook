const api = require('../../../services/api');

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
    dateStr: formatDate(work.createdAt)
  };
}

Page({
  data: {
    works: [],
    leftCol: [],
    rightCol: [],
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
      const works = (res.list || res.data || res || []).map(mapWork);
      this.setData({ works, loading: false });
      this.applyWaterfall(works);
    } catch (err) {
      console.error('Load favorites error:', err);
      this.setData({ loading: false });
    }
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
