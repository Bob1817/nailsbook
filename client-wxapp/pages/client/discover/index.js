var api = require('../../../services/api');
var { normalizeWork } = require('../../../utils/normalize-work');

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

function formatPrice(work) {
  var cents = work.referencePriceCents || work.priceCents;
  var price = cents ? Math.round(cents / 100) : Number(work.price || 0);
  if (!price) return '';
  if (work.priceDisplayType === 'range' && work.maxPriceCents) {
    return '¥' + price + '-' + Math.round(work.maxPriceCents / 100);
  }
  return '¥' + price + (work.priceDisplayType === 'fixed' ? '' : ' 起');
}

function getExpertise(work, tags) {
  var years = work.technician && work.technician.experienceYears;
  var specialty = work.technician && (work.technician.specialty || work.technician.positioning);
  return [years ? years + '年经验' : '', specialty || tags.slice(0, 2).join(' · ')].filter(Boolean).join(' · ');
}

function getCachedTechnicians() {
  var bindings = wx.getStorageSync('client_bindings') || [];
  return bindings.map(function (binding) { return binding.technician || binding; }).filter(function (tech) { return tech && tech.id; });
}

function mergeByWorkId(primary, secondary) {
  var seen = {};
  return primary.concat(secondary).filter(function (work) {
    if (!work || !work.id || seen[work.id]) return false;
    seen[work.id] = true;
    return true;
  });
}

Page({
  data: {
    works: [],
    filteredWorks: [],
    featuredWork: null,
    featuredWorks: [],
    featuredIndex: 0,
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
      loggedIn ? api.client.likes.list().catch(function () { return []; }) : Promise.resolve([]),
      loggedIn ? api.auth.getUserInfo('client').catch(function () { return null; }) : Promise.resolve(null)
    ]).then(function (results) {
      var res = results[0];
      var likedList = results[1] || [];
      var profile = results[2] || {};
      var technicians = (profile.technicians || []).concat(getCachedTechnicians());
      var technicianById = {};
      technicians.forEach(function (tech) { if (tech && tech.id) technicianById[String(tech.id)] = tech; });
      var boundIds = Object.keys(technicianById);

      var likedIds = {};
      likedList.forEach(function (item) {
        var wid = item.workId || (item.work && item.work.id) || item.id;
        if (wid) likedIds[wid] = true;
      });

      var list = res.list || res.data || (Array.isArray(res) ? res : []);
      return Promise.all(boundIds.map(function (id) {
        return api.public.works.list({ techId: id, limit: 50 }).catch(function () { return []; });
      })).then(function (workLists) {
        var boundWorks = [];
        workLists.forEach(function (workList) {
          var items = workList && (workList.list || workList.data || workList);
          (Array.isArray(items) ? items : []).forEach(function (work) {
            boundWorks.push(Object.assign({}, work, { isMyTechnician: true }));
          });
        });
        return mergeByWorkId(boundWorks, list);
      }).then(function (mergedList) {
      var works = mergedList.map(function (w, index) {
        var rawTags = w.tags || [];
        var tags = Array.isArray(rawTags)
          ? rawTags
          : (typeof rawTags === 'string' ? rawTags.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : []);
        // 只要作品的 technicianId 命中绑定的美甲师（哪怕作品自带 technicianName），就强制用绑定的美甲师快照覆盖
        // 这样作品卡显示的从业年限/城市/擅长风格永远和美甲师详情页一致，不会被作品创建时的旧快照污染
        var workTechId = String(w.technicianId || (w.technician && (w.technician.id || w.technician.technicianId)) || '');
        var boundTechSnapshot = workTechId ? technicianById[workTechId] : null;
        var techLite = null;
        if (boundTechSnapshot) {
          techLite = {
            id: String(boundTechSnapshot.id || boundTechSnapshot.technicianId || workTechId),
            name: boundTechSnapshot.name || w.technicianName || '',
            avatarUrl: boundTechSnapshot.avatarUrl || w.technicianAvatarUrl || '',
            city: boundTechSnapshot.city || '',
            experienceYears: Number(boundTechSnapshot.experienceYears || 0) || 0,
            specialtiesText: boundTechSnapshot.specialtiesText || '',
            specialties: Array.isArray(boundTechSnapshot.styleTags) ? boundTechSnapshot.styleTags : (Array.isArray(boundTechSnapshot.specialties) ? boundTechSnapshot.specialties : []),
            styleTags: Array.isArray(boundTechSnapshot.styleTags) ? boundTechSnapshot.styleTags : []
          };
        }
        var normalized = normalizeWork(Object.assign({}, w, { tags: tags }), techLite, {
          index: index,
          isBound: !!techLite
        });
        normalized.isLiked = !!w.isLiked || !!likedIds[w.id];
        normalized.isFavorited = !!w.isFavorited;
        normalized.isMyTechnician = !!techLite || !!w.isMyTechnician || boundIds.indexOf(String(normalized.technicianId)) !== -1;
        normalized.dateStr = normalized.dateStr || formatDate(w.createdAt);
        normalized.tagsText = normalized.tags.slice(0, 3).join(' · ');
        normalized.priceText = formatPrice(normalized) || formatPrice(w);
        return normalized;
      });

      self.setData({ works: works, loading: false, loadedCount: PAGE_SIZE });
      self.applyFilter();
      });
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

    var featuredWorks = visible.slice(0, 3).map(function (work) {
      return Object.assign({}, work, { aspect: 'aspect-featured' });
    });
    var featuredWork = featuredWorks[0] || null;
    var leftCol = [], rightCol = [];
    visible.slice(featuredWorks.length).forEach(function (w, i) {
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
      featuredWork: featuredWork,
      featuredWorks: featuredWorks,
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

  onFeaturedChange: function (e) {
    this.setData({ featuredIndex: e.detail.current || 0 });
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

  onFavoriteTap: function (e) {
    var id = e.detail && e.detail.id;
    if (!id) return;
    if (!(getApp().globalData.token || wx.getStorageSync('client_token'))) {
      wx.navigateTo({ url: '/pages/login/index?redirect=' + encodeURIComponent('/pages/client/discover/index') });
      return;
    }
    var self = this;
    var toggle = function (w) {
      if (String(w.id) !== String(id)) return w;
      return Object.assign({}, w, {
        isFavorited: !w.isFavorited,
        favoriteCount: w.isFavorited ? Math.max(0, w.favoriteCount - 1) : w.favoriteCount + 1
      });
    };
    self.setData({ works: self.data.works.map(toggle) });
    self.applyFilter();
    api.client.works.favorite(id).catch(function () {
      self.setData({ works: self.data.works.map(toggle) });
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
