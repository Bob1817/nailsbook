var api = require('../../../services/api');

var SORT_TABS = [
  { key: 'latest', label: '最新' },
  { key: 'likes', label: '点赞' },
  { key: 'comments', label: '评论' },
  { key: 'favorites', label: '收藏' }
];

var ASPECT_PATTERNS = ['aspect-3-4', 'aspect-4-5', 'aspect-5-6', 'aspect-3-4'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return m + '月' + day + '日';
}

function formatAddress(address) {
  return [address.province, address.city, address.district, address.detailAddress]
    .filter(Boolean).join(' ');
}

function formatSchedule(schedule) {
  if (!schedule) return '预约后确认具体时间';
  var schemes = schedule.schemes || [];
  var active = schemes.find(function (item) { return item.id === schedule.activeSchemeId; });
  if (!active || !active.days || active.days.length === 0) return '时间灵活，预约后确认';
  var dayLabels = { mon: '一', tue: '二', wed: '三', thu: '四', fri: '五', sat: '六', sun: '日' };
  var days = active.days.map(function (day) { return dayLabels[day]; }).filter(Boolean).join('、');
  return '周' + days + ' ' + (active.startTime || '') + '-' + (active.endTime || '');
}

Page({
  data: {
    works: [],
    filteredWorks: [],
    leftCol: [],
    rightCol: [],
    loading: true,
    loadFailed: false,
    sortBy: 'latest',
    sortDirs: { latest: 'desc', likes: 'desc', comments: 'desc', favorites: 'desc' },
    sortTabs: SORT_TABS,
    selectedTech: '全部',
    techFilters: ['全部'],
    totalCount: 0,
    keyword: '',
    targetTechId: '',
    businessPage: false,
    artist: null,
    serviceItems: [],
    shopAddresses: [],
    availabilityText: ''
  },

  onLoad: function (options) {
    this.setData({
      keyword: options.keyword ? decodeURIComponent(options.keyword) : '',
      targetTechId: options.techId ? String(options.techId) : ''
    });
    if (this.data.targetTechId) {
      this.loadBusinessPage();
    } else {
      this.loadWorks();
    }
  },

  loadBusinessPage: function () {
    var self = this;
    self.setData({ loading: true, loadFailed: false, businessPage: true });
    api.public.artists.detail(self.data.targetTechId).then(function (res) {
      var artist = res.artist || {};
      artist.initial = (artist.name || '美').charAt(0);
      var works = (res.works || []).map(function (work) {
        return {
          id: work.id,
          coverUrl: work.coverUrl || (work.imageUrls && work.imageUrls[0]) || '',
          title: work.title || '美甲作品',
          tags: [],
          technicianName: artist.name || '美甲师',
          technicianId: artist.id,
          technicianAvatarUrl: artist.avatarUrl || '',
          techInitial: (artist.name || '美').charAt(0),
          likeCount: 0,
          createdAt: '',
          dateStr: ''
        };
      });
      self.setData({
        artist: artist,
        serviceItems: (artist.serviceItems || []).slice(0, 6),
        shopAddresses: (artist.shopAddresses || []).map(function (address) {
          return Object.assign({}, address, { displayAddress: formatAddress(address) });
        }),
        availabilityText: formatSchedule(artist.serviceSchedule),
        works: works,
        totalCount: works.length,
        loading: false,
        loadFailed: false
      });
      self.applyFilter();
    }).catch(function (err) {
      console.error('loadBusinessPage error:', err);
      self.setData({ loading: false, loadFailed: true });
    });
  },

  retryLoad: function () {
    if (this.data.businessPage) this.loadBusinessPage(); else this.loadWorks();
  },

  loadWorks: function () {
    var self = this;
    self.setData({ loading: true, loadFailed: false });
    Promise.all([
      api.client.works.list({ sortBy: self.data.sortBy, sortDir: self.data.sortDirs[self.data.sortBy] }),
      api.client.likes.list().catch(function () { return []; })
    ]).then(function (results) {
        var res = results[0];
        var likedList = results[1] || [];
        var likedIds = {};
        likedList.forEach(function (item) {
          var wid = item.workId || (item.work && item.work.id) || item.id;
          if (wid) likedIds[wid] = true;
        });
        var list = res.list || res.data || res || [];
        var sortBy = self.data.sortBy;
        var dir = self.data.sortDirs[sortBy] === 'asc' ? 1 : -1;
        var works = list.map(function (w) {
          var name = w.technicianName || (w.technician ? w.technician.name : '') || '';
          return {
            id: w.id,
            coverUrl: w.coverUrl || (w.imageUrls && w.imageUrls[0]) || '',
            title: w.title || '未命名作品',
            tags: w.tags || [],
            technicianName: name,
            technicianId: w.technicianId || (w.technician && w.technician.id) || '',
            technicianAvatarUrl: w.technicianAvatarUrl || (w.technician ? w.technician.avatarUrl : '') || '',
            techInitial: name.charAt(0) || '美',
            likeCount: w.likeCount || 0,
            isLiked: !!w.isLiked || !!likedIds[w.id],
            commentCount: w.commentCount || 0,
            favoriteCount: w.favoriteCount || 0,
            createdAt: w.createdAt || '',
            dateStr: formatDate(w.createdAt),
            aspect: ''
          };
        });

        // 客户端排序（保证排序生效，不依赖后端部署）
        works.sort(function (a, b) {
          if (sortBy === 'likes') return (b.likeCount - a.likeCount) * dir;
          if (sortBy === 'comments') return (b.commentCount - a.commentCount) * dir;
          if (sortBy === 'favorites') return (b.favoriteCount - a.favoriteCount) * dir;
          return (new Date(b.createdAt) - new Date(a.createdAt)) * dir;
        });

        var techSet = {};
        works.forEach(function (w) { if (w.technicianName) techSet[w.technicianName] = true; });
        var techFilters = ['全部'].concat(Object.keys(techSet));

        var targetWork = self.data.targetTechId
          ? works.find(function (w) { return String(w.technicianId) === self.data.targetTechId; })
          : null;
        self.setData({ works: works, techFilters: techFilters, totalCount: works.length, loading: false, loadFailed: false, selectedTech: targetWork ? targetWork.technicianName : self.data.selectedTech });
        self.applyFilter();
      })
      .catch(function (err) {
        console.error('loadWorks error:', err);
        self.setData({ loading: false, loadFailed: true, works: [], filteredWorks: [], leftCol: [], rightCol: [] });
      });
  },

  applyFilter: function () {
    var selected = this.data.selectedTech;
    var keyword = this.data.keyword;
    var targetTechId = this.data.targetTechId;
    var filtered = targetTechId
      ? this.data.works.filter(function (w) { return String(w.technicianId) === targetTechId; })
      : (selected === '全部'
        ? this.data.works
        : this.data.works.filter(function (w) { return w.technicianName === selected; }));
    if (keyword) {
      filtered = filtered.filter(function (w) {
        return w.title.indexOf(keyword) >= 0 || (w.tags || []).some(function (tag) { return String(tag).indexOf(keyword) >= 0; });
      });
    }

    var leftCol = [], rightCol = [];
    filtered.forEach(function (w, i) {
      var colIdx = i % 2;
      var rowIdx = Math.floor(i / 2);
      w.aspect = ASPECT_PATTERNS[(rowIdx + colIdx) % ASPECT_PATTERNS.length];
      if (colIdx === 0) leftCol.push(w); else rightCol.push(w);
    });

    this.setData({ filteredWorks: filtered, leftCol: leftCol, rightCol: rightCol });
  },

  switchSort: function (e) {
    var key = e.currentTarget.dataset.key;
    var dirs = this.data.sortDirs;
    if (key === this.data.sortBy) {
      dirs[key] = dirs[key] === 'desc' ? 'asc' : 'desc';
    } else {
      dirs[key] = 'desc';
    }
    this.setData({ sortBy: key, sortDirs: dirs });
    // 先用已有数据立即排序，再从后端刷新
    this.sortWorks();
    this.loadWorks();
  },

  sortWorks: function () {
    var sortBy = this.data.sortBy;
    var dir = this.data.sortDirs[sortBy] === 'asc' ? 1 : -1;
    var works = this.data.works.slice();
    works.sort(function (a, b) {
      if (sortBy === 'likes') return (b.likeCount - a.likeCount) * dir;
      if (sortBy === 'comments') return (b.commentCount - a.commentCount) * dir;
      if (sortBy === 'favorites') return (b.favoriteCount - a.favoriteCount) * dir;
      return (new Date(b.createdAt) - new Date(a.createdAt)) * dir;
    });
    this.setData({ works: works });
    this.applyFilter();
  },

  switchTech: function (e) {
    var name = e.currentTarget.dataset.name;
    this.setData({ selectedTech: name, targetTechId: '' });
    this.applyFilter();
  },

  onAvatarError: function (e) {
    var id = e.currentTarget.dataset.id;
    var works = this.data.works.map(function (w) {
      if (String(w.id) === String(id)) {
        w.technicianAvatarUrl = '';
      }
      return w;
    });
    this.setData({ works: works });
    this.applyFilter();
  },

  viewWork: function (e) {
    var id = e.currentTarget.dataset.id;
    var path = this.data.businessPage ? '/pages/client/public-work/index?id=' : '/pages/client/work-detail/index?id=';
    wx.navigateTo({ url: path + id });
  },

  bookArtist: function () {
    var artist = this.data.artist;
    if (!artist) return;
    var app = getApp();
    var target = '/pages/client/works/index?techId=' + artist.id + '&source=card';
    if (!app.globalData.token || wx.getStorageSync('role') !== 'client') {
      var invite = artist.invitationCode ? '&invite=' + encodeURIComponent(artist.invitationCode) : '';
      wx.navigateTo({ url: '/pages/client/login/index?redirect=' + encodeURIComponent(target) + invite + '&source=card' });
      return;
    }
    var bindings = wx.getStorageSync('client_bindings') || [];
    var bound = bindings.some(function (binding) {
      return String((binding.technician && binding.technician.id) || binding.id) === String(artist.id);
    });
    if (bound) {
      wx.navigateTo({ url: '/pages/client/create-order/index?techId=' + artist.id });
      return;
    }
    if (!artist.invitationCode) {
      wx.showToast({ title: '该美甲师暂未开放预约', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '绑定后预约',
      content: '绑定 ' + (artist.name || '该美甲师') + ' 后即可查看可约时段并提交预约。',
      confirmText: '绑定并预约',
      success: function (result) {
        if (!result.confirm) return;
        api.client.profile.bindTechnician(artist.id, artist.invitationCode, '来自经营名片', 'card').then(function () {
          wx.showModal({
            title: '绑定申请已提交',
            content: '美甲师通过后，即可从此主页查看可约时间并预约。',
            showCancel: false,
            confirmText: '知道了'
          });
        }).catch(function (err) {
          wx.showToast({ title: err.message || '绑定失败，请稍后重试', icon: 'none' });
        });
      }
    });
  },

  onShareAppMessage: function () {
    var artist = this.data.artist;
    if (!artist) return { title: '美甲作品', path: '/pages/client/works/index' };
    return {
      title: (artist.name || '美甲师') + '的美甲服务与作品',
      path: '/pages/client/works/index?techId=' + artist.id + '&source=card',
      imageUrl: artist.avatarUrl || (this.data.works[0] && this.data.works[0].coverUrl) || ''
    };
  },

  onPullDownRefresh: function () {
    var self = this;
    if (this.data.businessPage) this.loadBusinessPage(); else this.loadWorks();
    setTimeout(function () { wx.stopPullDownRefresh(); }, 1000);
  }
});
