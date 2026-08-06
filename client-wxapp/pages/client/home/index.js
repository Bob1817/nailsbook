const api = require('../../../services/api');
const { formatTime } = require('../../../utils/util');

const STATUS_LABELS = {
  pending_quote: '待报价',
  pending_agree: '待同意',
  pending_confirm: '待确认',
  pending_home: '待上门',
  pending_shop: '待到店',
  in_progress: '服务中'
};

const UPCOMING_STATUSES = new Set(['pending_quote', 'pending_agree', 'pending_confirm', 'pending_home', 'pending_shop', 'in_progress']);

const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const WEEKDAYS = ['周日','周一','周二','周三','周四','周五','周六'];

Page({
  data: {
    userInfo: {},
    technician: null,
    upcomingOrder: null,
    recentWorks: [],
    featuredWorks: [],
    featuredLeftCol: [],
    featuredRightCol: [],
    loading: true,
    swiperIndex: 0,
    technicianCount: 1,
    orderMonth: '',
    orderDay: '',
    orderWeekday: '',
    orderAddress: '',
    worksPage: 1,
    worksHasMore: true,
    worksLoading: false,
    popularStyles: ['法式', '极简', '新中式', '婚礼', '职场', '艺术风']
  },

  onLoad() {
    this.loadData();
  },

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
      var ordersData = await api.client.orders.list({ limit: 10 }).catch(function () { return null; });
      var likedList = await api.client.likes.list().catch(function () { return []; });
      var likedIds = {};
      (likedList || []).forEach(function (item) {
        var wid = item.workId || (item.work && item.work.id) || item.id;
        if (wid) likedIds[wid] = true;
      });
      this._likedIds = likedIds;

      if (homeData) {
        var techFromHome = homeData.technician;
        if (techFromHome) {
          this.setData({ technician: techFromHome });
        }

        var boundTech = techFromHome || tech;
        var works = (homeData.works || []).slice(0, 5).map(function (w) {
          var name = w.technicianName || (boundTech ? boundTech.name : '') || '';
          return {
            id: w.id,
            title: w.title || '未命名作品',
            coverUrl: w.coverUrl || (w.imageUrls && w.imageUrls[0]) || '',
            technicianName: name,
            technicianAvatarUrl: w.technicianAvatarUrl || (boundTech ? boundTech.avatarUrl : '') || '',
            techInitial: name.charAt(0) || '美',
            likeCount: w.likeCount || 0,
            isLiked: !!w.isLiked || !!likedIds[w.id],
            commentCount: w.commentCount || 0,
            tags: w.tags || []
          };
        });

        var uniqueTechs = {};
        works.forEach(function (w) { if (w.technicianName) uniqueTechs[w.technicianName] = true; });
        var techCount = Object.keys(uniqueTechs).length;
        if (techCount === 0 && boundTech) techCount = 1;

        this.setData({ recentWorks: works, technicianCount: techCount });
      }

      if (ordersData) {
        var orders = ordersData.list || ordersData.data || ordersData || [];
        var upcoming = orders
          .filter(function (o) { return UPCOMING_STATUSES.has(o.status) && o.startTime; })
          .sort(function (a, b) { return new Date(a.startTime) - new Date(b.startTime); })[0];

        if (upcoming) {
          var startDate = new Date(upcoming.startTime);
          var endStr = upcoming.endTime ? formatTimeShort(upcoming.endTime) : '';
          var timeRange = formatTime(upcoming.startTime) + (endStr ? ' - ' + endStr : '');

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
            orderAddress: upcoming.address || ''
          });
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
      var res = await api.client.works.list({ page: page, limit: 10 });
      var list = res.list || res.data || res || [];
      var boundTech = this.data.technician;
      var likedIds = this._likedIds || {};
      var newWorks = list.map(function (w) {
        var name = w.technicianName || (boundTech ? boundTech.name : '') || '';
        return {
          id: w.id,
          title: w.title || '未命名作品',
          coverUrl: w.coverUrl || (w.imageUrls && w.imageUrls[0]) || '',
          technicianName: name,
          technicianAvatarUrl: w.technicianAvatarUrl || (boundTech ? boundTech.avatarUrl : '') || '',
          techInitial: name.charAt(0) || '美',
          likeCount: w.likeCount || 0,
          isLiked: !!w.isLiked || !!likedIds[w.id],
          commentCount: w.commentCount || 0,
          tags: w.tags || [],
          createdAt: formatShortDate(w.createdAt)
        };
      });

      this.setData({
        featuredWorks: reset ? newWorks : this.data.featuredWorks.concat(newWorks),
        worksPage: page + 1,
        worksHasMore: newWorks.length >= 10,
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

  onDotTap(e) {
    var index = e.currentTarget.dataset.index;
    this.setData({ swiperIndex: index });
  },

  navigateToWorks() { wx.navigateTo({ url: '/pages/client/works/index' }); },
  navigateToArchive() { wx.navigateTo({ url: '/pages/client/beauty-archive/index' }); },
  navigateToAiPhoto() { wx.navigateTo({ url: '/pages/client/ai-photo/index' }); },
  viewStyle(e) {
    var style = e.currentTarget.dataset.style;
    wx.navigateTo({ url: '/pages/client/works/index?keyword=' + encodeURIComponent(style) });
  },
  navigateToBooking() { wx.navigateTo({ url: '/pages/client/create-order/index' }); },
  navigateToOrders() { wx.navigateTo({ url: '/pages/client/orders/index' }); },
  navigateToChat() { wx.navigateTo({ url: '/pages/client/chat/index' }); },

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
    api.client.works.like(id).catch(function () { self.loadFeaturedWorks(true); });
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
    this.setData({ featuredLeftCol: left, featuredRightCol: right });
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
