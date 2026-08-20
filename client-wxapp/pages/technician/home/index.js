const api = require('../../../services/api');
const { isTouristTechnician } = require('../../../utils/permission');
const {
  parseDate,
  formatClock,
  formatBookingDate,
  formatToday,
  formatMoney,
  formatDepartureCountdown
} = require('../../../utils/format');
const {
  normalizeOrder,
  getOrderStateMeta,
  resolveOrderPresentation,
  estimateSingleTravelMinutes,
  estimateRouteDistance,
  hasAddressIssue,
  buildDashboardSummary
} = require('../../../utils/order');

Page({
  data: {
    loading: true,
    isTourist: false,
    nextOrder: null,
    todayOrders: [],
    todayLabel: '',

    todoItems: [],
    todoTotal: 0,
    todayFollowUps: [],
    businessOverview: null,

    featuredWorks: [],
    featuredLead: null,
    worksLeft: [],
    worksRight: [],
    unreadMessageCount: 0
  },

  // ---------- 生命周期 ----------
  onLoad() {
    const role = wx.getStorageSync('role');
    if (role !== 'technician') {
      wx.reLaunch({ url: '/pages/login/index' });
      return;
    }
    this.setData({ todayLabel: formatToday() });
  },

  onShow() {
    if (wx.getStorageSync('role') !== 'technician') return;
    this.setData({ isTourist: isTouristTechnician() });
    this.loadDashboard();
  },

  onPullDownRefresh() {
    this.loadDashboard().finally(() => wx.stopPullDownRefresh());
  },

  goActivate() {
    wx.navigateTo({ url: '/pages/technician/set-password/index' });
  },

  // ---------- 主数据加载 ----------
  async loadDashboard() {
    if (this._dashboardLoading) return;
    this._dashboardLoading = true;
    this.setData({ loading: true });

    try {
      const [tripsResult, convResult, worksResult, followUpsResult, insights, incomeCalendar] = await Promise.all([
        api.technician.orders.trips().catch(() => []),
        api.chat.technician.conversations().catch(() => []),
        api.technician.works.list().catch(() => []),
        api.technician.customers.todayFollowUps().catch(() => []),
        api.technician.insights.overview().catch(() => null),
        api.technician.orders.incomeCalendar().catch(() => null)
      ]);

      const tripsRaw = Array.isArray(tripsResult) ? tripsResult : (tripsResult.data || []);
      const convs = Array.isArray(convResult) ? convResult : (convResult.data || []);
      const worksRaw = Array.isArray(worksResult) ? worksResult : (worksResult.data || []);
      const followUpsRaw = Array.isArray(followUpsResult)
        ? followUpsResult
        : (followUpsResult.data || []);
      const todayFollowUps = followUpsRaw.map(item => ({
        ...item,
        _clock: formatClock(item.plannedAt),
        _customerName: (item.customer && item.customer.name) || '客户'
      }));

      const orders = tripsRaw.map(normalizeOrder).filter(Boolean);
      const summary = buildDashboardSummary(orders, new Date());

      const unread = convs.reduce((s, c) => s + (c.unreadCount || 0), 0);
      const technicianProfile = wx.getStorageSync('userInfo') || wx.getStorageSync('technician_userInfo') || {};

      // 装饰每个预约（添加 _ 前缀的展示字段）
      const decorate = (o) => {
        const pres = resolveOrderPresentation(o);
        const stateMeta = getOrderStateMeta(o.status);
        return {
          ...o,
          _clock: formatClock(o.startTime),
          _dateLabel: formatBookingDate(o.startTime),
          _typeLabel: pres.typeLabel,
          _typeClass: pres.typeClass,
          _fullAddress: pres.fullAddress,
          _stateLabel: stateMeta.label,
          _stateTone: stateMeta.tone,
          _priceText: formatMoney(o.price)
        };
      };

      // 下一单加额外字段
      let nextOrder = null;
      if (summary.nextOrder) {
        const o = decorate(summary.nextOrder);
        const travelMin = estimateSingleTravelMinutes(o);
        const distKm = estimateRouteDistance(o);
        const startDate = parseDate(o.startTime);
        const departureDate = startDate ? new Date(startDate.getTime() - travelMin * 60 * 1000) : null;
        const countdownMin = departureDate
          ? Math.floor((departureDate.getTime() - Date.now()) / 60000)
          : 0;

        nextOrder = {
          ...o,
          _distanceText: `${distKm}km · ${travelMin}分钟`,
          _departureClock: departureDate ? formatClock(departureDate.toISOString()) : o._clock,
          _countdownText: countdownMin >= travelMin + 10 ? formatDepartureCountdown(countdownMin) : ''
        };
      }

      // 待处理项
      const unpaidDepositCount = orders.filter((o) => !o.depositPaid && o.status !== 'completed' && o.status !== 'cancelled').length;
      const addressPendingCount = orders.filter((o) => hasAddressIssue(o) && o.status !== 'completed' && o.status !== 'cancelled').length;

      const todoItemsRaw = [
        { key: 'pending',  count: summary.pendingCount,    label: '个预约待确认',     tone: 'tone-pink'   },
        { key: 'deposit',  count: unpaidDepositCount,      label: '个客户未支付定金', tone: 'tone-amber'  },
        { key: 'address',  count: addressPendingCount,     label: '个客户未确认地址', tone: 'tone-orange' },
        { key: 'messages', count: unread,                  label: '条未读消息',       tone: 'tone-blue'   }
      ];
      const todoItems = todoItemsRaw.filter((t) => t.count > 0);
      const todoTotal = todoItems.reduce((s, t) => s + t.count, 0);

      // 热门作品 top 6（照片墙，按热度排序）
      const featuredWorks = [...worksRaw]
        .sort((a, b) => {
          const ha = (b.favoriteCount || 0) + (b.likeCount || 0) - (a.favoriteCount || 0) - (a.likeCount || 0);
          if (ha !== 0) return ha;
          const ta = parseDate(a.createdAt)?.getTime() || 0;
          const tb = parseDate(b.createdAt)?.getTime() || 0;
          return tb - ta;
        })
        .slice(0, 6)
        .map((w) => ({
          id: w.id,
          likeCount: w.likeCount || 0,
          favoriteCount: w.favoriteCount || 0,
          commentCount: w.commentCount || 0,
          isLiked: !!w.isLiked,
          isFavorited: !!w.isFavorited,
          isVisible: w.isVisible !== false,
          isPinned: !!w.isPinned,
          isFeatured: !!w.isFeatured,
          coverUrl: w.coverUrl || '',
          title: w.title || '',
          tags: Array.isArray(w.tags) ? w.tags : [],
          technicianId: technicianProfile.id || '',
          technicianName: technicianProfile.name || '我的作品',
          technicianAvatarUrl: technicianProfile.avatarUrl || '',
          techInitial: (technicianProfile.name || '我').charAt(0),
          expertiseText: technicianProfile.specialty || '',
          _fav: w.favoriteCount || w.likeCount || 0
        }));

      // 双列瀑布流分列（奇偶分配）
      const worksLeft = featuredWorks.filter((_, i) => i % 2 === 0);
      const worksRight = featuredWorks.filter((_, i) => i % 2 === 1);

      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const monthBookings = ((incomeCalendar && incomeCalendar.orders) || []).filter((order) => {
        const startTime = parseDate(order.startTime);
        if (!startTime || ['cancelled', 'expired'].includes(order.status)) return false;
        const month = `${startTime.getFullYear()}-${String(startTime.getMonth() + 1).padStart(2, '0')}`;
        return month === currentMonth;
      });

      const businessOverview = insights ? {
        revenue: formatMoney(insights.revenue.monthConfirmed || 0),
        estimatedRevenue: formatMoney(monthBookings.reduce((sum, order) => sum + (Number(order.quotePrice) || 0), 0)),
        monthCompleted: insights.bookings.monthCompleted || 0,
        monthBookings: monthBookings.length,
        newCustomers: insights.customers.newThisMonth || 0
      } : null;

      this.setData({
        loading: false,
        nextOrder,
        todayOrders: summary.todayOrders.map(decorate),
        todoItems,
        todoTotal,
        todayFollowUps,
        businessOverview,
        featuredWorks,
        featuredLead: null,
        worksLeft,
        worksRight,
        unreadMessageCount: unread
      });
    } catch (e) {
      this.setData({ loading: false });
    } finally {
      this._dashboardLoading = false;
    }
  },

  // ---------- 导航 ----------
  navigateToAddress(e) {
    const orderId = e.currentTarget.dataset.orderId;
    const o = this.findOrderById(orderId);
    if (!o) return;

    if (o.latitude && o.longitude) {
      wx.openLocation({
        latitude: Number(o.latitude),
        longitude: Number(o.longitude),
        name: o.shopName || '预约地点',
        address: o.address || '',
        scale: 16
      });
      return;
    }

    // 没有经纬度时，复制地址到剪贴板
    if (!o.address) {
      wx.showToast({ title: '当前预约暂无地址', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: o.address,
      success: () => wx.showToast({ title: '地址已复制，请在地图中粘贴', icon: 'none' })
    });
  },

  findOrderById(id) {
    if (!id) return null;
    if (this.data.nextOrder && this.data.nextOrder.id === id) return this.data.nextOrder;
    return this.data.todayOrders.find((o) => o.id === id);
  },

  // ---------- 联系客户 ----------
  contactCustomer(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) {
      wx.showToast({ title: '客户暂无联系电话', icon: 'none' });
      return;
    }
    wx.makePhoneCall({ phoneNumber: String(phone) });
  },

  // ---------- 跳转 ----------
  openOrderDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  },

  navigateToMessages() {
    wx.reLaunch({ url: '/pages/technician/chat/index' });
  },

  navigateToOrders() {
    wx.reLaunch({ url: '/pages/technician/orders/index' });
  },

  navigateToWorks() {
    wx.navigateTo({ url: '/pages/technician/works/index' });
  },

  openBusinessDetail() {
    wx.navigateTo({ url: '/pages/technician/business-data/index' });
  },

  navigateToWorkDetail(e) {
    const id = (e.detail && e.detail.id) || e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/technician/work-detail/index?id=${id}` });
  },

  showWorkActions(e) {
    if (isTouristTechnician()) {
      wx.showToast({ title: '请先激活美甲师账号', icon: 'none' });
      return;
    }
    const source = e.detail || {};
    const { id, visible, pinned, featured } = source;
    if (!id) return;
    wx.showActionSheet({
      itemList: [
        visible ? '隐藏作品' : '显示作品',
        pinned ? '取消置顶' : '置顶作品',
        featured ? '取消推荐' : '推荐作品',
        '编辑作品'
      ],
      success: async (res) => {
        try {
          if (res.tapIndex === 0) await api.technician.works.toggleVisible(id);
          if (res.tapIndex === 1) await api.technician.works.togglePinned(id);
          if (res.tapIndex === 2) await api.technician.works.toggleFeatured(id);
          if (res.tapIndex === 3) {
            wx.navigateTo({ url: `/pages/technician/work-edit/index?id=${id}` });
            return;
          }
          const messages = [visible ? '已隐藏' : '已显示', pinned ? '已取消置顶' : '已置顶', featured ? '已取消推荐' : '已推荐'];
          wx.showToast({ title: messages[res.tapIndex], icon: 'success' });
          this.loadDashboard();
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' });
        }
      }
    });
  },

  onTodoTap(e) {
    const key = e.currentTarget.dataset.key;
    const map = {
      pending:  '/pages/technician/orders/index?filter=pending',
      deposit:  '/pages/technician/orders/index?filter=deposit',
      address:  '/pages/technician/customers/index',
      messages: '/pages/technician/chat/index'
    };
    const url = map[key];
    if (!url) return;
    if (key === 'messages') {
      wx.reLaunch({ url });
    } else {
      wx.navigateTo({ url });
    }
  },

  openFollowUpCustomer(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/technician/customer-detail/index?id=${id}` });
  }
});
