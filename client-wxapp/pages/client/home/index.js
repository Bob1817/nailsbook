const api = require('../../../services/api');
const { normalizeWork } = require('../../../utils/normalize-work');

const STATUS_LABELS = {
  pending_quote: '待报价',
  pending_agree: '待同意',
  pending_confirm: '待确认',
  pending_shop: '待到店',
  in_progress: '服务中'
};

const UPCOMING_STATUSES = new Set(['pending_quote', 'pending_agree', 'pending_confirm', 'pending_shop', 'in_progress']);

const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const WEEKDAYS = ['周日','周一','周二','周三','周四','周五','周六'];

Page({
  data: {
    userInfo: {},
    technician: null,
    upcomingOrder: null,
    recentWorks: [],
    featuredWorks: [],
    featuredLead: null,
    featuredLeftCol: [],
    featuredRightCol: [],
    loading: true,
    swiperIndex: 0,
    technicianCount: 0,
    heroLoadFailed: false,
    clientLoggedIn: false,
    orderMonth: '',
    orderDay: '',
    orderWeekday: '',
    orderAddress: '',
    orderLatitude: 0,
    orderLongitude: 0,
    orderShopGuidance: false,
    orderShopName: '',
    worksPage: 1,
    worksHasMore: true,
    worksLoading: false,
    popularStyles: ['法式', '极简', '新中式', '婚礼', '职场', '艺术风']
  },

  onLoad() {},

  onShow() {
    this.loadData();
  },

  async loadData() {
    const userInfo = wx.getStorageSync('userInfo') || wx.getStorageSync('client_userInfo') || {};
    const bindings = wx.getStorageSync('client_bindings') || [];
    const tech = bindings[0] && bindings[0].technician ? bindings[0].technician : null;

    this.setData({ userInfo: userInfo, technician: tech, loading: false });

    try {
      var homeData = await api.client.home().catch(function () { return null; });
      this.setData({ heroLoadFailed: !homeData, recentWorks: [], swiperIndex: 0 });
      var app = getApp();
      var currentRole = app.globalData.role || wx.getStorageSync('role');
      var loggedIn = currentRole === 'client' && !!(app.globalData.token || wx.getStorageSync('client_token'));
      this._clientLoggedIn = loggedIn;
      this.setData({ clientLoggedIn: loggedIn });
      var ordersData = loggedIn
        ? await api.client.orders.list({ limit: 10 }).catch(function () { return null; })
        : null;
      var likedList = loggedIn
        ? await api.client.likes.list().catch(function () { return []; })
        : [];
      var likedIds = {};
      (likedList || []).forEach(function (item) {
        var wid = item.workId || (item.work && item.work.id) || item.id;
        if (wid) likedIds[wid] = true;
      });
      this._likedIds = likedIds;

      if (homeData) {
        var techFromHome = homeData.technician;
        this.setData({ technician: techFromHome || null });

        var boundTech = techFromHome || tech;
        var works = (homeData.works || []).slice(0, 5).map(function (w, index) {
          var workTechId = String(w.technicianId || (w.technician && (w.technician.id || w.technician.technicianId)) || '');
          var boundId = String(boundTech ? (boundTech.id || boundTech.technicianId || '') : '');
          var techLite = null;
          // 只要 boundTech 存在且该作品 technicianId 命中（或作品本身没 technicianId，默认用绑定的）就强制覆盖
          // 保证作品卡从业年限/城市与技师主页顶部完全一致
          if (boundTech && (!workTechId || workTechId === boundId)) {
            techLite = {
              id: String(boundTech.id || boundTech.technicianId || workTechId),
              name: boundTech.name || w.technicianName || '',
              avatarUrl: boundTech.avatarUrl || w.technicianAvatarUrl || '',
              city: boundTech.city || '',
              experienceYears: Number(boundTech.experienceYears || 0) || 0,
              specialtiesText: boundTech.specialtiesText || '',
              specialties: Array.isArray(boundTech.styleTags) ? boundTech.styleTags : (Array.isArray(boundTech.specialties) ? boundTech.specialties : []),
              styleTags: Array.isArray(boundTech.styleTags) ? boundTech.styleTags : []
            };
          }
          var normalized = normalizeWork(w, techLite, { index: index });
          normalized.isLiked = !!w.isLiked || !!likedIds[normalized.id];
          return normalized;
        });

        this.setData({ recentWorks: works, technicianCount: homeData.technicianCount || 0 });
      }

      if (ordersData) {
        var orders = ordersData.list || ordersData.data || ordersData || [];
        var upcoming = orders
          .filter(function (o) { return UPCOMING_STATUSES.has(o.status) && o.startTime; })
          .sort(function (a, b) { return new Date(a.startTime) - new Date(b.startTime); })[0];

        if (upcoming) {
          var startDate = new Date(upcoming.startTime);
          var endStr = upcoming.endTime ? formatTimeShort(upcoming.endTime) : '';
          var timeRange = formatTimeShort(upcoming.startTime) + (endStr ? '–' + endStr : '');

          this.setData({
            upcomingOrder: {
              id: upcoming.id,
              status: upcoming.status,
              statusText: STATUS_LABELS[upcoming.status] || upcoming.status,
              serviceType: upcoming.serviceType || '美甲服务',
              timeStr: timeRange,
              countdown: calcCountdown(upcoming.startTime),
              technician: upcoming.technician || null,
              address: upcoming.address || ''
            },
            orderMonth: MONTHS[startDate.getMonth()],
            orderDay: String(startDate.getDate()),
            orderWeekday: WEEKDAYS[startDate.getDay()],
            orderAddress: upcoming.address || '',
            orderLatitude: 0,
            orderLongitude: 0,
            orderShopGuidance: false,
            orderShopName: upcoming.shopName || ''
          });

          // 异步获取坐标用于导航（公开接口，不阻塞渲染）
          var techId = (upcoming.technician && (upcoming.technician.id || upcoming.technician.technicianId)) || upcoming.technicianId;
          if (techId) {
            var self = this;
            api.public.artists.detail(techId).then(function (result) {
              var artist = result.artist || result;
              var shops = (artist.shopAddresses || []).filter(function (s) { return s.enabled !== false; });
              // 优先按地址匹配，匹配不到则取第一个有坐标的店铺
              var normAddr = (upcoming.address || '').replace(/\s+/g, '');
              var matched = normAddr ? shops.find(function (s) {
                var full = ((s.province || '') + (s.city || '') + (s.district || '') + (s.detailAddress || '')).replace(/\s+/g, '');
                return full === normAddr || normAddr.indexOf((s.detailAddress || '').replace(/\s+/g, '')) >= 0;
              }) : null;
              if (!matched) matched = shops.find(function (s) { return s.latitude && s.longitude; }) || null;
              if (matched && matched.latitude && matched.longitude) {
                self.setData({
                  orderLatitude: parseFloat(matched.latitude),
                  orderLongitude: parseFloat(matched.longitude)
                });
              }
              if (matched) {
                self.setData({
                  orderShopName: matched.name || self.data.orderShopName,
                  orderShopGuidance: !!(matched.guidance && matched.guidance.enabled)
                });
              }
            }).catch(function () {});
          }
        } else {
          this.setData({ upcomingOrder: null });
        }
      }

      this.loadMoreWorks(true);
    } catch (err) {
      console.error('loadData error:', err);
    }
  },

  async loadMoreWorks(reset) {
    if (this.data.worksLoading) return;
    if (!reset && !this.data.worksHasMore) return;

    var page = reset ? 1 : this.data.worksPage;
    this.setData({ worksLoading: true });

    try {
      // 首页只展示精选作品。登录时保留绑定美甲师口径，游客则匿名读取公开精选。
      var res = await api.client.featuredWorks(
        { page: page, limit: 10 },
        { needAuth: !!this._clientLoggedIn, silent: true }
      );
      var list = res.works || res.list || res.data || (Array.isArray(res) ? res : []);
      var boundTech = this.data.technician;
      var likedIds = this._likedIds || {};
      var newWorks = list.map(function (w, index) {
        var workTechId = String(w.technicianId || (w.technician && (w.technician.id || w.technician.technicianId)) || '');
        var boundId = String(boundTech ? (boundTech.id || boundTech.technicianId || '') : '');
        var techLite = null;
        // 只要 technicianId 命中绑定技师就强制覆盖（即使作品自带 technician 快照），保证与美甲师详情页同步
        if (boundTech && (!workTechId || workTechId === boundId)) {
          techLite = {
            id: String(boundTech.id || boundTech.technicianId || workTechId),
            name: boundTech.name || w.technicianName || '',
            avatarUrl: boundTech.avatarUrl || w.technicianAvatarUrl || '',
            city: boundTech.city || '',
            experienceYears: Number(boundTech.experienceYears || 0) || 0,
            specialtiesText: boundTech.specialtiesText || '',
            specialties: Array.isArray(boundTech.styleTags) ? boundTech.styleTags : (Array.isArray(boundTech.specialties) ? boundTech.specialties : []),
            styleTags: Array.isArray(boundTech.styleTags) ? boundTech.styleTags : []
          };
        }
        var normalized = normalizeWork(w, techLite, { index: index });
        normalized.isLiked = !!w.isLiked || !!likedIds[normalized.id];
        normalized.isFavorited = !!w.isFavorited;
        normalized.tagsText = normalizeTags(normalized.tags).slice(0, 3).join(' · ');
        normalized.priceText = formatWorkPrice(normalized) || formatWorkPrice(w);
        normalized.createdAt = normalized.createdAt || formatShortDate(w.createdAt);
        return normalized;
      });

      this.setData({
        featuredWorks: reset ? newWorks : this._dedupWorks(this.data.featuredWorks, newWorks),
        worksPage: page + 1,
        worksHasMore: typeof res.hasMore === 'boolean' ? res.hasMore : newWorks.length >= 10,
        worksLoading: false
      });
      this.splitFeaturedWorks();
    } catch (err) {
      console.error('loadMoreWorks error:', err);
      this.setData({ worksLoading: false, worksHasMore: false });
    }
  },

  onReachBottom() {
    this.loadMoreWorks(false);
  },

  onSwiperChange(e) {
    this.setData({ swiperIndex: e.detail.current });
  },

  viewWork(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/client/work-detail/index?id=' + id });
  },

  onDotTap(e) {
    var index = e.currentTarget.dataset.index;
    this.setData({ swiperIndex: index });
  },

  navigateToWorks() { wx.navigateTo({ url: '/pages/client/works/index' }); },
  viewStyle(e) {
    var style = e.currentTarget.dataset.style;
    wx.navigateTo({ url: '/pages/client/works/index?keyword=' + encodeURIComponent(style) });
  },
  navigateToBooking() { wx.navigateTo({ url: '/pages/client/create-order/index' }); },
  navigateToOrders() { wx.navigateTo({ url: '/pages/client/orders/index' }); },
  navigateToChat() { wx.navigateTo({ url: '/pages/client/chat/index' }); },

  navigateToShop() {
    var lat = this.data.orderLatitude;
    var lng = this.data.orderLongitude;
    if (!lat && !lng) {
      // 无坐标时复制地址
      var addr = this.data.orderAddress;
      if (addr) wx.setClipboardData({ data: addr, success: function () { wx.showToast({ title: '地址已复制，请手动导航', icon: 'none' }); } });
      return;
    }
    var order = this.data.upcomingOrder || {};
    wx.openLocation({
      latitude: lat,
      longitude: lng,
      name: (order.technician && order.technician.name) || '店铺位置',
      address: this.data.orderAddress || '',
      scale: 18
    });
  },

  openUpcomingGuidance() {
    var order = this.data.upcomingOrder;
    var techId = order && order.technician && (order.technician.id || order.technician.technicianId);
    if (!techId) return;
    wx.navigateTo({ url: `/pages/client/shop-guidance/index?techId=${techId}&shopName=${encodeURIComponent(this.data.orderShopName || '')}&address=${encodeURIComponent(this.data.orderAddress || '')}` });
  },

  // === work-card 组件事件 ===
  onWorkCardTap(e) {
    var id = e.detail && e.detail.id;
    if (id) wx.navigateTo({ url: '/pages/client/work-detail/index?id=' + id });
  },

  onArtistTap(e) {
    var id = e.detail && e.detail.id;
    if (id) wx.navigateTo({ url: '/pages/client/artist-home/index?id=' + id });
  },

  onLikeTap(e) {
    var id = e.detail && e.detail.id;
    if (!id) return;
    var self = this;
    var featuredWorks = self.data.featuredWorks.map(function (w) {
      if (String(w.id) === String(id)) {
        return Object.assign({}, w, {
          isLiked: !w.isLiked,
          likeCount: w.isLiked ? Math.max(0, w.likeCount - 1) : w.likeCount + 1
        });
      }
      return w;
    });
    self.setData({ featuredWorks: featuredWorks });
    self.splitFeaturedWorks();
    api.client.works.like(id).catch(function () { self.loadMoreWorks(true); });
  },

  onFavoriteTap(e) {
    var id = e.detail && e.detail.id;
    if (!id) return;
    var self = this;
    var featuredWorks = self.data.featuredWorks.map(function (w) {
      if (String(w.id) !== String(id)) return w;
      return Object.assign({}, w, {
        isFavorited: !w.isFavorited,
        favoriteCount: w.isFavorited ? Math.max(0, w.favoriteCount - 1) : w.favoriteCount + 1
      });
    });
    self.setData({ featuredWorks: featuredWorks });
    self.splitFeaturedWorks();
    api.client.works.favorite(id).catch(function () { self.loadMoreWorks(true); });
  },

  /** 按 id 去重合并作品数组 */
  _dedupWorks(existing, incoming) {
    var seen = {};
    var result = [];
    existing.forEach(function (w) { if (!seen[w.id]) { seen[w.id] = true; result.push(w); } });
    incoming.forEach(function (w) { if (!seen[w.id]) { seen[w.id] = true; result.push(w); } });
    return result;
  },

  /** 将 featuredWorks 拆分为左右两列，并分配宽高比 */
  splitFeaturedWorks() {
    var works = this.data.featuredWorks;
    var left = [], right = [];
    works.forEach(function (w, i) {
      var isLeft = i % 2 === 0;
      // 交错分配宽高比
      if (isLeft) {
        w.aspectClass = i % 4 === 0 ? 'aspect-4-5' : 'aspect-3-4';
        left.push(w);
      } else {
        w.aspectClass = i % 4 === 1 ? 'aspect-3-4' : 'aspect-5-6';
        right.push(w);
      }
    });
    this.setData({ featuredLead: null, featuredLeftCol: left, featuredRightCol: right });
  },

  viewUpcomingOrder() {
    if (this.data.upcomingOrder) {
      wx.navigateTo({ url: '/pages/client/order-detail/index?id=' + this.data.upcomingOrder.id });
    }
  },

  callTech() {
    var phone = null;
    if (this.data.upcomingOrder && this.data.upcomingOrder.technician) {
      phone = this.data.upcomingOrder.technician.phone;
    }
    if (!phone && this.data.technician) {
      phone = this.data.technician.phone;
    }
    if (phone) wx.makePhoneCall({ phoneNumber: phone });
  },

  onPullDownRefresh() {
    var self = this;
    this.loadData().finally(function () { wx.stopPullDownRefresh(); });
  }
});

function formatTimeShort(dateStr) {
  var d = new Date(dateStr);
  var h = String(d.getHours()).padStart(2, '0');
  var m = String(d.getMinutes()).padStart(2, '0');
  return h + ':' + m;
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  return (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

function calcCountdown(startTime) {
  var diff = Math.floor((new Date(startTime) - new Date()) / 60000);
  if (diff <= 0) return '已开始';
  var days = Math.floor(diff / (60 * 24));
  var hours = Math.floor((diff % (60 * 24)) / 60);
  var minutes = diff % 60;
  if (days >= 1) return days + '天' + hours + '小时';
  if (hours >= 1) return hours + '小时' + minutes + '分';
  return minutes + '分钟';
}

function normalizeTags(tags) {
  return Array.isArray(tags) ? tags : String(tags || '').split(',').map(function (tag) { return tag.trim(); }).filter(Boolean);
}

function formatWorkPrice(work) {
  var cents = work.referencePriceCents || work.priceCents;
  var price = cents ? Math.round(cents / 100) : Number(work.price || 0);
  return price ? '¥' + price + (work.priceDisplayType === 'fixed' ? '' : ' 起') : '';
}

function getWorkExpertise(work, fallbackTech) {
  var tech = work.technician || fallbackTech || {};
  return [tech.experienceYears ? tech.experienceYears + '年经验' : '', tech.specialty || tech.positioning || ''].filter(Boolean).join(' · ');
}
