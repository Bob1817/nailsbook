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

Page({
  data: {
    userInfo: {},
    technician: null,
    upcomingOrder: null,
    recentWorks: [],
    loading: true,
    swiperIndex: 0
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
    const tech = bindings[0]?.technician || null;

    this.setData({ userInfo, technician: tech, loading: false });

    // 后台加载最新数据
    try {
      const [homeData, ordersData] = await Promise.all([
        api.client.home().catch(() => null),
        api.client.orders.list({ limit: 10 }).catch(() => null)
      ]);

      if (homeData) {
        const works = (homeData.works || []).slice(0, 6).map(w => ({
          id: w.id,
          title: w.title || '未命名作品',
          coverUrl: w.coverUrl || (w.imageUrls && w.imageUrls[0]) || '',
          technicianName: w.technicianName || tech?.name || '',
          likeCount: w.likeCount || 0,
          tags: w.tags || []
        }));

        const techFromHome = homeData.technician;
        if (techFromHome) {
          this.setData({ technician: techFromHome });
        }
        this.setData({ recentWorks: works });
      }

      if (ordersData) {
        const orders = ordersData.list || ordersData.data || ordersData || [];
        const upcoming = orders
          .filter(o => UPCOMING_STATUSES.has(o.status) && o.startTime)
          .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];

        if (upcoming) {
          const startDate = new Date(upcoming.startTime);
          this.setData({
            upcomingOrder: {
              ...upcoming,
              statusText: STATUS_LABELS[upcoming.status] || upcoming.status,
              dateStr: formatDateStr(startDate),
              timeStr: formatTime(upcoming.startTime),
              countdown: calcCountdown(upcoming.startTime)
            }
          });
        }
      }
    } catch (err) {
      console.error('loadData error:', err);
    }
  },

  onSwiperChange(e) {
    this.setData({ swiperIndex: e.detail.current });
  },

  navigateToWorks() { wx.navigateTo({ url: '/pages/client/works/index' }); },
  navigateToBooking() { wx.navigateTo({ url: '/pages/client/create-order/index' }); },
  navigateToOrders() { wx.navigateTo({ url: '/pages/client/orders/index' }); },
  navigateToChat() { wx.navigateTo({ url: '/pages/client/chat/index' }); },
  navigateToProfile() { wx.navigateTo({ url: '/pages/client/profile/index' }); },

  viewWork(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/client/work-detail/index?id=${id}` });
  },

  viewUpcomingOrder() {
    if (this.data.upcomingOrder) {
      wx.navigateTo({ url: `/pages/client/order-detail/index?id=${this.data.upcomingOrder.id}` });
    }
  },

  callTech() {
    const phone = this.data.upcomingOrder?.technician?.phone || this.data.technician?.phone;
    if (phone) wx.makePhoneCall({ phoneNumber: phone });
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  }
});

function formatDateStr(date) {
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${months[date.getMonth()]} ${date.getDate()}日 ${days[date.getDay()]}`;
}

function calcCountdown(startTime) {
  const diff = Math.floor((new Date(startTime) - new Date()) / 60000);
  if (diff <= 0) return '已开始';
  const days = Math.floor(diff / (60 * 24));
  const hours = Math.floor((diff % (60 * 24)) / 60);
  const minutes = diff % 60;
  if (days >= 1) return `${days}天${hours}小时`;
  if (hours >= 1) return `${hours}小时${minutes}分`;
  return `${minutes}分钟`;
}
