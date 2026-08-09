var api = require('../../../services/api');

var CATEGORIES = ['全部', '法式', '渐变', '日系', 'ins风', '简约', '可爱', '水晶', '炫彩'];
var PAGE_SIZE = 10;

// 宽高比循环分配，左右列各自错开
var ASPECTS_LEFT  = ['aspect-4-5', 'aspect-3-4', 'aspect-5-6', 'aspect-2-3'];
var ASPECTS_RIGHT = ['aspect-3-4', 'aspect-5-6', 'aspect-4-5', 'aspect-3-4'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return m + '月' + day + '日';
}

Page({
  data: {
    works: [],
    filteredWorks: [],
    leftCol: [],
    rightCol: [],
    loading: true,
    loadingMore: false,
    hasMore: false,
    keyword: '',
    loadedCount: PAGE_SIZE,
    resultCount: 0,
    categories: CATEGORIES,
    activeCategory: '全部',
    navBarHeight: 88  // 默认值，onLoad 里用实际计算值覆盖
  },

  onLoad: function () {
    // 计算导航栏高度，供 discover-head sticky top 使用
    try {
      var si = wx.getSystemInfoSync();
      var mb = wx.getMenuButtonBoundingClientRect();
      var navH = mb.top + mb.height + (mb.top - si.statusBarHeight);
      this.setData({ navBarHeight: navH });
    } catch (e) {
      // 保持默认 88px
    }
    this.loadWorks();
  },

  onShow: function () {
    // 从详情页返回时刷新点赞状态
    if (this.data.works.length > 0) {
      this.refreshLikes();
    }
  },

  loadWorks: function () {
    var self = this;
    self.setData({ loading: true });

    var loggedIn = !!(getApp().globalData.token || wx.getStorageSync('client_token'));
    return Promise.all([
      api.public.works.list({ limit: 50 }),
      loggedIn ? api.client.likes.list().catch(function () { return []; }) : Promise.resolve([])
    ]).then(function (results) {
      var res = results[0];
      var likedList = results[1] || [];

      var likedIds = {};
      likedList.forEach(function (item) {
        var wid = item.workId || (item.work && item.work.id) || item.id;
        if (wid) likedIds[wid] = true;
      });

      var list = res.list || res.data || (Array.isArray(res) ? res : []);
      var works = list.map(function (w) {
        var name = w.technicianName || (w.technician ? w.technician.name : '') || '';
        var rawTags = w.tags || [];
        var tags = Array.isArray(rawTags)
          ? rawTags
          : (typeof rawTags === 'string' ? rawTags.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : []);
        return {
          id: w.id,
          coverUrl: w.coverUrl || (w.imageUrls && w.imageUrls[0]) || '',
          title: w.title || '美甲作品',
          tags: tags,
          technicianId: w.technicianId || (w.technician ? w.technician.id : ''),
          technicianName: name,
          technicianAvatarUrl: w.technicianAvatarUrl || (w.technician ? w.technician.avatarUrl : '') || '',
          techInitial: name.charAt(0) || '美',
          likeCount: w.likeCount || 0,
          isLiked: !!w.isLiked || !!likedIds[w.id],
          commentCount: w.commentCount || 0,
          createdAt: w.createdAt || '',
          dateStr: formatDate(w.createdAt)
        };
      });

      self.setData({ works: works, loading: false, loadedCount: PAGE_SIZE });
      self.applyFilter();
    }).catch(function (err) {
      console.error('discover loadWorks error:', err);
      self.setData({ loading: false });
    });
  },

  refreshLikes: function () {
    if (!(getApp().globalData.token || wx.getStorageSync('client_token'))) return;
    var self = this;
    api.client.likes.list().catch(function () { return []; }).then(function (likedList) {
      var likedIds = {};
      likedList.forEach(function (item) {
        var wid = item.workId || (item.work && item.work.id) || item.id;
        if (wid) likedIds[wid] = true;
      });
      var works = self.data.works.map(function (w) {
        return Object.assign({}, w, { isLiked: !!likedIds[w.id] });
      });
      self.setData({ works: works });
      self.applyFilter();
    });
  },

  applyFilter: function () {
    var cat = this.data.activeCategory;
    var keyword = this.data.keyword.trim().toLowerCase();
    var all = this.data.works;

    var filtered = all.filter(function (w) {
      var categoryMatched = cat === '全部' || w.tags.some(function (t) {
        return t.indexOf(cat) !== -1 || cat.indexOf(t) !== -1;
      });
      if (!categoryMatched) return false;
      if (!keyword) return true;
      var searchable = [w.title, w.technicianName].concat(w.tags).join(' ').toLowerCase();
      return searchable.indexOf(keyword) !== -1;
    });

    var visible = filtered.slice(0, this.data.loadedCount);

    var leftCol = [], rightCol = [];
    visible.forEach(function (w, i) {
      var isLeft = i % 2 === 0;
      var rowIdx = Math.floor(i / 2);
      if (isLeft) {
        w.aspect = ASPECTS_LEFT[rowIdx % ASPECTS_LEFT.length];
        leftCol.push(w);
      } else {
        w.aspect = ASPECTS_RIGHT[rowIdx % ASPECTS_RIGHT.length];
        rightCol.push(w);
      }
    });

    this.setData({
      filteredWorks: filtered,
      leftCol: leftCol,
      rightCol: rightCol,
      resultCount: filtered.length,
      hasMore: visible.length < filtered.length,
      loadingMore: false
    });
  },

  switchCategory: function (e) {
    var cat = e.currentTarget.dataset.cat;
    if (cat === this.data.activeCategory) return;
    this.setData({ activeCategory: cat, loadedCount: PAGE_SIZE });
    this.applyFilter();
  },

  onSearchInput: function (e) {
    this.setData({ keyword: e.detail.value, loadedCount: PAGE_SIZE });
    this.applyFilter();
  },

  onSearchConfirm: function () {
    this.applyFilter();
  },

  clearSearch: function () {
    this.setData({ keyword: '', loadedCount: PAGE_SIZE });
    this.applyFilter();
  },

  // === work-card 组件事件 ===
  onWorkCardTap: function (e) {
    var id = e.detail && e.detail.id;
    if (id) wx.navigateTo({ url: '/pages/client/public-work/index?id=' + id });
  },

  onArtistTap: function (e) {
    var id = e.detail && e.detail.id;
    if (id) wx.navigateTo({ url: '/pages/client/artist-home/index?id=' + id });
  },

  onLikeTap: function (e) {
    var id = e.detail && e.detail.id;
    if (!id) return;
    if (!(getApp().globalData.token || wx.getStorageSync('client_token'))) {
      wx.navigateTo({ url: '/pages/login/index?redirect=' + encodeURIComponent('/pages/client/discover/index') });
      return;
    }
    var self = this;
    var works = self.data.works.map(function (w) {
      if (String(w.id) === String(id)) {
        return Object.assign({}, w, {
          isLiked: !w.isLiked,
          likeCount: w.isLiked ? Math.max(0, w.likeCount - 1) : w.likeCount + 1
        });
      }
      return w;
    });
    self.setData({ works: works });
    self.applyFilter();

    api.client.works.like(id).catch(function () {
      var reverted = self.data.works.map(function (w) {
        if (String(w.id) === String(id)) {
          return Object.assign({}, w, {
            isLiked: !w.isLiked,
            likeCount: w.isLiked ? Math.max(0, w.likeCount - 1) : w.likeCount + 1
          });
        }
        return w;
      });
      self.setData({ works: reverted });
      self.applyFilter();
    });
  },

  goBindTech: function () {
    wx.reLaunch({ url: '/pages/client/profile/index' });
  },

  onReachBottom: function () {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.setData({ loadingMore: true });
    setTimeout(function () {
      this.setData({ loadedCount: this.data.loadedCount + PAGE_SIZE });
      this.applyFilter();
    }.bind(this), 120);
  },

  onPullDownRefresh: function () {
    this.loadWorks().finally(function () { wx.stopPullDownRefresh(); });
  }
});
