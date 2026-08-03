const api = require('../../../services/api');
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
    avatar: '',
    name: '',
    status: 'active',
    homeService: false,
    shopService: false,

    loading: true,

    summary: { todayCount: 0, expectedIncomeText: '¥0' },
    nextOrder: null,
    todayOrders: [],
    todayLabel: '',

    todoItems: [],
    todoTotal: 0,
    todayFollowUps: [],
    businessOverview: null,

    featuredWorks: [],
    worksLeft: [],
    worksRight: [],
    unreadMessageCount: 0
  },

  // ---------- 生命周期 ----------
  onLoad() {
    const role = wx.getStorageSync('role');
    if (role !== 'technician') {
      wx.reLaunch({ url: '/pages/role-select/index' });
      return;
    }
    this.setData({ todayLabel: formatToday() });
    this.applyUserInfo();
  },

  onShow() {
    if (wx.getStorageSync('role') !== 'technician') return;
    this.applyUserInfo();
    this.loadDashboard();
  },

  onPullDownRefresh() {
    this.loadDashboard().finally(() => wx.stopPullDownRefresh());
  },

  // ---------- 用户信息回填 ----------
  applyUserInfo() {
    const u = wx.getStorageSync('userInfo') || {};
    this.setData({
      avatar: u.avatarUrl || '',
      name: u.name || '美甲师',
      status: u.status || 'active',
      homeService: !!u.homeService,
      shopService: !!u.shopService
    });
  },

  // ---------- 主数据加载 ----------
  async loadDashboard() {
    if (this._dashboardLoading) return;
    this._dashboardLoading = true;
    this.setData({ loading: true });

    try {
      const [tripsResult, convResult, worksResult, followUpsResult, insights] = await Promise.all([
        api.technician.orders.trips().catch(() => []),
        api.chat.conversations('technician').catch(() => []),
        api.technician.works.list().catch(() => []),
        api.technician.customers.todayFollowUps().catch(() => []),
        api.technician.insights.overview().catch(() => null)
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
          isPinned: !!w.isPinned,
          isFeatured: !!w.isFeatured,
          coverUrl: w.coverUrl || '',
          title: w.title || '',
          _fav: w.favoriteCount || w.likeCount || 0
        }));

      // 双列瀑布流分列（奇偶分配）
      const worksLeft = featuredWorks.filter((_, i) => i % 2 === 0);
      const worksRight = featuredWorks.filter((_, i) => i % 2 === 1);

      // 副标题预估收入
      const todayCount = summary.todayOrders.length;
      const expectedIncomeText = formatMoney(summary.expectedIncome);
      const businessOverview = insights ? {
        revenue: formatMoney(insights.revenue.monthConfirmed || 0),
        averageTicket: insights.revenue.averageTicket == null
          ? '暂无'
          : formatMoney(insights.revenue.averageTicket),
        totalCustomers: insights.customers.total || 0,
        newCustomers: insights.customers.newThisMonth || 0,
        completedCustomers: insights.customers.completed || 0,
        repeatRate: insights.customers.repeatRate == null
          ? '暂无'
          : `${Math.round(insights.customers.repeatRate * 100)}%`,
        dueCustomers: insights.customers.dueForRepurchase || 0,
        referrals: insights.referrals.total || 0,
        qualifiedReferrals: insights.referrals.qualified || 0,
        referralRevenue: formatMoney(insights.referrals.qualifiedRevenue || 0),
        fundsIssued: formatMoney(insights.funds.issued || 0),
        fundsRedeemed: formatMoney(insights.funds.redeemed || 0),
        dailyTrend: (insights.trends.daily || []).slice(-7).map(item => ({
          ...item,
          label: item.period.slice(5),
          revenueText: formatMoney(item.revenue)
        })),
        weeklyTrend: (insights.trends.weekly || []).slice(-4).map(item => ({
          ...item,
          label: `${item.period.slice(5)} 周`,
          revenueText: formatMoney(item.revenue)
        })),
        performanceReady: !!insights.performance.sufficientData,
        performanceMinimum: insights.performance.minimumSampleSize || 5,
        topService: insights.performance.services && insights.performance.services[0]
          ? { ...insights.performance.services[0], revenueText: formatMoney(insights.performance.services[0].revenue) }
          : null,
        topTimeSlot: insights.performance.timeSlots && insights.performance.timeSlots[0]
          ? { ...insights.performance.timeSlots[0], revenueText: formatMoney(insights.performance.timeSlots[0].revenue) }
          : null,
        reminders: (insights.reminders || []).map(item => ({
          ...item,
          typeText: { due: '待复购', dormant: '沉睡', high_value: '高价值' }[item.type] || '经营提醒'
        }))
      } : null;

      this.setData({
        loading: false,
        summary: { todayCount, expectedIncomeText },
        nextOrder,
        todayOrders: summary.todayOrders.map(decorate),
        todoItems,
        todoTotal,
        todayFollowUps,
        businessOverview,
        featuredWorks,
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

  openBusinessDetail(e) {
    const target = e.currentTarget.dataset.target;
    const routes = {
      orders: '/pages/technician/orders/index?filter=completed',
      customers: '/pages/technician/customers/index',
      due: '/pages/technician/customers/index?lifecycle=due',
      referrals: '/pages/technician/referral-campaign/index'
    };
    if (routes[target]) wx.navigateTo({ url: routes[target] });
  },

  navigateToWorkDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/technician/work-detail/index?id=${id}` });
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
  },

  openInsightCustomer(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/technician/customer-detail/index?id=${id}` });
  },

  // ---------- 分享 ----------
  onShareAppMessage() {
    const u = wx.getStorageSync('userInfo') || {};
    const inviteCode = u.invitationCode || '';
    return {
      title: `美甲师 ${u.name || '小美'} 的名片`,
      path: u.id
        ? `/pages/client/works/index?techId=${u.id}&source=card`
        : inviteCode
          ? `/pages/client/login/index?invite=${inviteCode}`
        : '/pages/role-select/index',
      imageUrl: u.avatarUrl || ''
    };
  }
});
