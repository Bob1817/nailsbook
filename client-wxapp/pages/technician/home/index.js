const api = require('../../../services/api');
const { isTouristTechnician } = require('../../../utils/permission');
const {
  parseDate,
  formatClock,
  formatBookingDate,
  formatMoney
} = require('../../../utils/format');
const {
  normalizeOrder,
  getOrderStateMeta,
  getStatusLabel,
  getStatusTone,
  resolveOrderPresentation,
  hasAddressIssue,
  buildDashboardSummary
} = require('../../../utils/order');

Page({
  data: {
    loading: true,
    isTourist: false,
    nextOrder: null,

    todoItems: [],
    confirmationTodos: [],
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
      const [tripsResult, ordersResult, convResult, worksResult, followUpsResult, insights, incomeCalendar] = await Promise.all([
        api.technician.orders.trips().catch(() => []),
        api.technician.orders.list().catch(() => []),
        api.chat.technician.conversations().catch(() => []),
        api.technician.works.list().catch(() => []),
        api.technician.customers.todayFollowUps().catch(() => []),
        api.technician.insights.overview().catch(() => null),
        api.technician.orders.incomeCalendar().catch(() => null)
      ]);

      const tripsRaw = Array.isArray(tripsResult) ? tripsResult : (tripsResult.data || []);
      const allOrdersRaw = Array.isArray(ordersResult) ? ordersResult : (ordersResult.data || []);
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
      const allOrders = allOrdersRaw.map(normalizeOrder).filter(Boolean);
      const summary = buildDashboardSummary(orders, new Date());

      const unread = convs.reduce((s, c) => s + (c.unreadCount || 0), 0);
      const technicianProfile = wx.getStorageSync('userInfo') || wx.getStorageSync('technician_userInfo') || {};
      const configuredShops = Array.isArray(technicianProfile.shopAddresses) ? technicianProfile.shopAddresses : [];
      const configuredShop = configuredShops.find((shop) => shop && shop.enabled !== false);

      // 装饰每个预约（添加 _ 前缀的展示字段）
      const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
      const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const calcCountdown = (startTime) => {
        const start = parseDate(startTime);
        if (!start) return '';
        const diff = Math.floor((start - new Date()) / 60000);
        if (diff <= 0) return '已开始';
        const days = Math.floor(diff / (60 * 24));
        const hours = Math.floor((diff % (60 * 24)) / 60);
        const minutes = diff % 60;
        if (days >= 1) return `还有 ${days}天${hours}小时`;
        if (hours >= 1) return `还有 ${hours}小时${minutes}分`;
        return `还有 ${minutes}分钟`;
      };
      const decorate = (o) => {
        const pres = resolveOrderPresentation(o);
        const stateMeta = getOrderStateMeta(o.status);
        const startDate = parseDate(o.startTime);
        const hoursUntilStart = startDate ? (startDate.getTime() - Date.now()) / 3600000 : Infinity;
        const depositAmount = Number(o.depositAmount || 0);
        return {
          ...o,
          _clock: formatClock(o.startTime),
          _dateLabel: formatBookingDate(o.startTime),
          _dateMain: startDate ? `${startDate.getMonth() + 1}月${startDate.getDate()}日` : '',
          _dateMonth: startDate ? MONTHS[startDate.getMonth()] : '',
          _dateDay: startDate ? String(startDate.getDate()) : '',
          _dateWeekday: startDate ? WEEKDAYS[startDate.getDay()] : '',
          _weekday: startDate ? WEEKDAYS[startDate.getDay()] : '',
          _periodLabel: startDate && startDate.getHours() >= 12 ? 'PM' : 'AM',
          _typeLabel: pres.typeLabel,
          _typeClass: pres.typeClass,
          _fullAddress: pres.fullAddress,
          _stateLabel: stateMeta.label,
          _stateTone: stateMeta.tone,
          _statusLabel: getStatusLabel(o.status),
          _statusTone: getStatusTone(o.status),
          _priceText: formatMoney(o.price),
          _shopName: o.shopName || (configuredShop && configuredShop.name) || '',
          _urgencyLabel: hoursUntilStart > 0 && hoursUntilStart <= 24 ? '24小时内' : '',
          _priceAmount: formatMoney(o.price).replace('¥', ''),
          _serviceTypeLabel: formatClock(o.startTime) + ' - ' + formatClock(o.endTime),
          _customerId: o.customerId || (o.customer && o.customer.id) || '',
          _countdown: o.status === 'in_progress' ? '' : calcCountdown(o.startTime),
          _depositText: depositAmount <= 0
            ? '无需定金'
            : (o.depositPaid
              ? `已支付 ${formatMoney(depositAmount)}`
              : `待支付 ${formatMoney(depositAmount)}`)
        };
      };

      // 下一单加额外字段
      let nextOrder = null;
      if (summary.nextOrder) {
        const order = decorate(summary.nextOrder);
        nextOrder = {
          ...order,
          shopName: order.shopName || (configuredShop && configuredShop.name) || '',
          _heroStatusLabel: order.status === 'in_progress' ? '进行中' : '待到店',
          _heroStatusTone: order.status === 'in_progress' ? 'tone-sky' : 'tone-teal'
        };
      }

      // 待处理项
      const confirmationTodos = allOrders
        .filter((o) => o.status === 'pending_confirm')
        .map(decorate)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      const pendingActionCount = allOrders.filter((o) => o.status === 'pending_quote').length;
      const unpaidDepositCount = allOrders.filter((o) => !o.depositPaid && !['completed', 'cancelled', 'expired'].includes(o.status)).length;
      const addressPendingCount = allOrders.filter((o) => hasAddressIssue(o) && !['completed', 'cancelled', 'expired'].includes(o.status)).length;

      const todoItemsRaw = [
        { key: 'pending',  count: pendingActionCount,      label: '个预约待处理',     tone: 'tone-pink'   },
        { key: 'deposit',  count: unpaidDepositCount,      label: '个预约待支付定金', tone: 'tone-amber'  },
        { key: 'address',  count: addressPendingCount,     label: '个客户未确认地址', tone: 'tone-orange' },
        { key: 'messages', count: unread,                  label: '条未读消息',       tone: 'tone-blue'   }
      ];
      const todoItems = todoItemsRaw.filter((t) => t.count > 0);
      const todoTotal = confirmationTodos.length + todoItems.reduce((s, t) => s + t.count, 0);

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
          ...w,
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
        todoItems,
        confirmationTodos,
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
    return null;
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

  findConfirmationById(id) {
    return this.data.confirmationTodos.find((item) => String(item.id) === String(id));
  },

  confirmationSummary(order) {
    if (!order) return '';
    return `${order._dateLabel} ${order._clock}\n${order.customerName || '客户'} · ${order._shopName || '店铺待确认'}`;
  },

  async confirmConfirmation(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const order = this.findConfirmationById(id);
    const result = await wx.showModal({ title: '确认排期', content: `${this.confirmationSummary(order)}\n\n确认接受该预约排期？`, confirmText: '确认排期' });
    if (!result.confirm) return;
    try {
      wx.showLoading({ title: '处理中...' });
      await api.technician.orders.confirm(id);
      wx.hideLoading();
      wx.showToast({ title: '已确认排期', icon: 'success' });
      this.loadDashboard();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '确认失败', icon: 'none' });
    }
  },

  async refuseConfirmation(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const order = this.findConfirmationById(id);
    const result = await wx.showModal({ title: '拒绝排期', content: `${this.confirmationSummary(order)}\n\n拒绝后该预约将被取消，是否继续？`, confirmText: '拒绝排期', confirmColor: '#c94f65' });
    if (!result.confirm) return;
    try {
      wx.showLoading({ title: '处理中...' });
      await api.technician.orders.cancel(id, '美甲师拒绝排期');
      wx.hideLoading();
      wx.showToast({ title: '已拒绝排期', icon: 'success' });
      this.loadDashboard();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  onBookingCardOpen(e) {
    const id = e.detail && e.detail.id;
    if (id) wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  },

  onBookingCardNavigate(e) {
    this.navigateToAddress({ currentTarget: { dataset: { orderId: e.detail && e.detail.id } } });
  },

  onBookingCardContact(e) {
    this.contactCustomer({ currentTarget: { dataset: { phone: e.detail && e.detail.phone } } });
  },

  onBookingCardMessage(e) {
    const customerId = e.detail && e.detail.customerId;
    const url = customerId
      ? `/pages/technician/chat-detail/index?clientId=${customerId}`
      : '/pages/technician/chat/index';
    wx.navigateTo({ url });
  },

  navigateToMessages() {
    wx.reLaunch({ url: '/pages/technician/chat/index' });
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
        '编辑作品',
        '删除作品'
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
          if (res.tapIndex === 4) {
            this.confirmDeleteWork(id);
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

  confirmDeleteWork(id) {
    wx.showModal({
      title: '删除作品',
      content: '确定删除这个作品吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) this.deleteWork(id);
      }
    });
  },

  async deleteWork(id) {
    wx.showLoading({ title: '删除中...' });
    try {
      await api.technician.works.delete(id);
      wx.hideLoading();
      wx.showToast({ title: '已删除', icon: 'success' });
      this.loadDashboard();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  onTodoTap(e) {
    const key = e.currentTarget.dataset.key;
    const map = {
      pending:  '/pages/technician/orders/index?task=pending',
      deposit:  '/pages/technician/trade-orders/index?filter=pending',
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
