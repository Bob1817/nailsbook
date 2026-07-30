const api = require('../../../services/api');
const {
  parseDate,
  formatClock,
  formatMoney,
  isSameDay
} = require('../../../utils/format');
const {
  normalizeOrder,
  resolveOrderPresentation,
  getStatusLabel,
  getStatusTone,
  estimateRouteDistance
} = require('../../../utils/order');

// 行程状态：已确认排期 / 进行中（完成预约但未做完美甲）
const TRIP_STATUSES = ['pending_home', 'pending_shop', 'in_progress'];
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

Page({
  data: {
    scheduleTab: 'trips',           // trips | all
    showMoreMenu: false,

    todayKey: '',
    activeKey: '',                  // 选中日期 key
    activeIsToday: true,
    activeLabel: '',                // "6月3日 周二"
    dateStrip: [],                  // 未来日期条
    markedKeys: {},                 // 有预约的日期 { key: true }

    listOrders: [],
    summary: { count: 0, distance: 0, amount: 0, completed: 0 },

    loading: true,

    // 日历弹窗
    showCalendar: false,
    weekdays: WEEKDAYS,
    calendarYear: 0,
    calendarMonth: 0,
    calendarDays: []
  },

  onLoad(options) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this._today = today;
    const saved = wx.getStorageSync('technician_schedule_view') || {};
    const savedDate = saved.activeKey ? new Date(`${saved.activeKey}T00:00:00`) : null;
    this._activeDate = savedDate && !isNaN(savedDate.getTime()) ? savedDate : today;

    // 支持 tab 参数：all → 当日预约，trips → 今日行程
    const scheduleTab = options && options.tab
      ? (options.tab === 'all' ? 'all' : 'trips')
      : (saved.scheduleTab === 'all' ? 'all' : 'trips');

    // 未来 20 天日期条
    const strip = Array.from({ length: 20 }, (_, i) => {
      const d = addDays(today, i + 1);
      return { key: dateKey(d), day: d.getDate(), week: WEEK[d.getDay()] };
    });

    this.setData({
      scheduleTab,
      todayKey: dateKey(today),
      activeKey: dateKey(this._activeDate),
      dateStrip: strip
    });
    this.loadOrders();
  },

  onShow() {
    if (wx.getStorageSync('role') !== 'technician') return;
    if (!this.data.loading) this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders().finally(() => wx.stopPullDownRefresh());
  },

  // ---------- 数据加载 ----------
  async loadOrders() {
    this.setData({ loading: true });
    try {
      const res = await api.technician.orders.list({});
      const raw = Array.isArray(res) ? res : (res.list || res.data || []);
      this._allOrders = raw.map(normalizeOrder).filter(Boolean).map(this._decorate);

      // 标记有预约的日期
      const marked = {};
      this._allOrders.forEach((o) => {
        const t = parseDate(o.startTime);
        if (t) marked[dateKey(t)] = true;
      });

      this.setData({ markedKeys: marked, loading: false });
      this._recompute();
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  _decorate(o) {
    const pres = resolveOrderPresentation(o);
    return {
      ...o,
      _clock: formatClock(o.startTime),
      _typeLabel: pres.typeLabel,
      _typeClass: pres.typeClass,
      _statusLabel: getStatusLabel(o.status),
      _statusTone: getStatusTone(o.status),
      _avatarChar: (o.customerName && o.customerName[0]) || '客'
    };
  },

  // ---------- 重算当前视图 ----------
  _recompute() {
    const active = this._activeDate;
    const all = this._allOrders || [];

    const dayOrders = all
      .filter((o) => {
        const t = parseDate(o.startTime);
        return t && isSameDay(t, active);
      })
      .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

    const tripOrders = dayOrders.filter((o) => TRIP_STATUSES.indexOf(o.status) >= 0);

    const decoratedDayOrders = markScheduleConflicts(dayOrders);
    const decoratedTripOrders = decoratedDayOrders.filter((o) => TRIP_STATUSES.indexOf(o.status) >= 0);
    const listOrders = this.data.scheduleTab === 'trips' ? decoratedTripOrders : decoratedDayOrders;

    // 汇总（基于行程单）
    const distance = tripOrders.reduce((s, o) => s + estimateRouteDistance(o), 0);
    const amount = tripOrders.reduce((s, o) => s + (Number(o.price) || 0), 0);
    const completed = tripOrders.filter((o) => o.status === 'in_progress').length;

    const m = active.getMonth() + 1;
    const d = active.getDate();
    const label = `${m}月${d}日 周${WEEK[active.getDay()]}`;

    this.setData({
      listOrders,
      summary: {
        count: tripOrders.length,
        distance: Math.round(distance * 10) / 10,
        amount,
        completed,
        conflicts: decoratedDayOrders.filter(order => order._hasConflict).length
      },
      activeKey: dateKey(active),
      activeIsToday: isSameDay(active, this._today),
      activeLabel: label
    });
  },

  // ---------- 交互 ----------
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.scheduleTab) return;
    this.setData({ scheduleTab: tab });
    this._recompute();
    this.saveViewState();
  },

  toggleMoreMenu() {
    this.setData({ showMoreMenu: !this.data.showMoreMenu });
  },

  goAllItineraries() {
    this.setData({ showMoreMenu: false });
    wx.navigateTo({ url: '/pages/technician/all-itineraries/index' });
  },

  goAllBookings() {
    this.setData({ showMoreMenu: false });
    wx.navigateTo({ url: '/pages/technician/all-bookings/index' });
  },

  onPickDate(e) {
    const key = e.currentTarget.dataset.key;
    const [y, m, d] = key.split('-').map(Number);
    this._activeDate = new Date(y, m - 1, d);
    this._recompute();
    this.saveViewState();
  },

  resetToday() {
    this._activeDate = this._today;
    this._recompute();
    this.saveViewState();
  },

  // 日历选择（原生 date picker）
  onCalendarChange(e) {
    const [y, m, d] = e.detail.value.split('-').map(Number);
    this._activeDate = new Date(y, m - 1, d);
    this._recompute();
    this.saveViewState();
  },

  // 日历弹窗
  openCalendar() {
    const active = this._activeDate;
    this.setData({
      showCalendar: true,
      calendarYear: active.getFullYear(),
      calendarMonth: active.getMonth()
    });
    this._buildCalendarDays();
  },

  closeCalendar() {
    this.setData({ showCalendar: false });
  },

  noop() {},

  prevMonth() {
    let { calendarYear, calendarMonth } = this.data;
    calendarMonth--;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear--;
    }
    this.setData({ calendarYear, calendarMonth });
    this._buildCalendarDays();
  },

  nextMonth() {
    let { calendarYear, calendarMonth } = this.data;
    calendarMonth++;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear++;
    }
    this.setData({ calendarYear, calendarMonth });
    this._buildCalendarDays();
  },

  _buildCalendarDays() {
    const { calendarYear, calendarMonth, markedKeys, activeKey, todayKey } = this.data;
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];

    // 上个月的日期
    const prevMonthLastDay = new Date(calendarYear, calendarMonth, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const date = new Date(calendarYear, calendarMonth - 1, d);
      const key = dateKey(date);
      days.push({
        date: key,
        day: d,
        isCurrentMonth: false,
        isToday: key === todayKey,
        isSelected: key === activeKey,
        hasOrder: !!markedKeys[key]
      });
    }

    // 本月的日期
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(calendarYear, calendarMonth, d);
      const key = dateKey(date);
      days.push({
        date: key,
        day: d,
        isCurrentMonth: true,
        isToday: key === todayKey,
        isSelected: key === activeKey,
        hasOrder: !!markedKeys[key]
      });
    }

    // 下个月的日期（补齐到 42 个）
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(calendarYear, calendarMonth + 1, d);
      const key = dateKey(date);
      days.push({
        date: key,
        day: d,
        isCurrentMonth: false,
        isToday: key === todayKey,
        isSelected: key === activeKey,
        hasOrder: !!markedKeys[key]
      });
    }

    this.setData({ calendarDays: days });
  },

  onCalendarDayTap(e) {
    const dateStr = e.currentTarget.dataset.date;
    const [y, m, d] = dateStr.split('-').map(Number);
    this._activeDate = new Date(y, m - 1, d);
    this.setData({ showCalendar: false });
    this._recompute();
    this.saveViewState();
  },

  saveViewState() {
    wx.setStorageSync('technician_schedule_view', {
      scheduleTab: this.data.scheduleTab,
      activeKey: dateKey(this._activeDate)
    });
  },

  viewOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  },

  navigateToAddress(e) {
    const id = e.currentTarget.dataset.id;
    const o = (this._allOrders || []).find((x) => x.id === id);
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
    if (!o.address) return wx.showToast({ title: '暂无地址', icon: 'none' });
    wx.setClipboardData({
      data: o.address,
      success: () => wx.showToast({ title: '地址已复制，请在地图中粘贴', icon: 'none' })
    });
  },

  contactCustomer(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) return wx.showToast({ title: '客户暂无电话', icon: 'none' });
    wx.makePhoneCall({ phoneNumber: String(phone) });
  }
});

function markScheduleConflicts(orders) {
  const active = orders.filter(order => order.status !== 'cancelled' && order.status !== 'completed');
  const conflictIds = new Set();
  active.forEach((order, index) => {
    const start = parseDate(order.startTime);
    const end = parseDate(order.endTime);
    if (!start || !end) return;
    active.slice(index + 1).forEach(other => {
      const otherStart = parseDate(other.startTime);
      const otherEnd = parseDate(other.endTime);
      if (otherStart && otherEnd && start < otherEnd && otherStart < end) {
        conflictIds.add(order.id);
        conflictIds.add(other.id);
      }
    });
  });
  return orders.map(order => ({ ...order, _hasConflict: conflictIds.has(order.id) }));
}
