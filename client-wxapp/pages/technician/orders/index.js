const api = require('../../../services/api');
const {
  parseDate,
  formatClock,
  isSameDay
} = require('../../../utils/format');
const {
  normalizeOrder,
  resolveOrderPresentation,
  getStatusLabel,
  getStatusTone
} = require('../../../utils/order');

// 行程状态：已确认排期 / 进行中（完成预约但未做完美甲）
const TRIP_STATUSES = ['pending_shop', 'in_progress'];
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const INVALID_INCOME_STATUSES = ['cancelled', 'expired', 'rejected'];

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}
function compactMoney(amount) {
  const value = Number(amount) || 0;
  return `¥${Number.isInteger(value) ? value : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`;
}
function periodTotals(relation, totals) {
  const showActual = relation <= 0 && totals.actual > 0;
  const showEstimated = relation >= 0 && totals.estimated > 0;
  return {
    actualText: showActual ? compactMoney(totals.actual) : '',
    estimatedText: showEstimated ? compactMoney(totals.estimated) : ''
  };
}

Page({
  data: {
    scheduleTab: 'trips',           // trips | all
    showMoreMenu: false,

    todayKey: '',
    todayDay: 0,
    todayIncome: {},
    activeKey: '',                  // 选中日期 key
    activeIsToday: true,
    activeLabel: '',                // "6月3日 周二"
    dateStrip: [],                  // 未来日期条
    markedKeys: {},                 // 有预约的日期 { key: true }

    listOrders: [],
    summary: { conflicts: 0 },

    loading: true,
    taskFilter: '',

    // 日历弹窗
    showCalendar: false,
    weekdays: WEEKDAYS,
    calendarYears: [],
    calendarScrollTarget: ''
  },

  onLoad(options) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this._today = today;
    const saved = wx.getStorageSync('technician_schedule_view') || {};
    const savedDate = saved.activeKey ? new Date(`${saved.activeKey}T00:00:00`) : null;
    this._activeDate = savedDate && !isNaN(savedDate.getTime()) ? savedDate : today;

    // 支持 tab 参数：all → 当日预约，trips → 今日行程
    const taskFilter = options && options.task === 'pending' ? 'pending' : '';
    const scheduleTab = taskFilter ? 'all' : (options && options.tab
      ? (options.tab === 'all' ? 'all' : 'trips')
      : (saved.scheduleTab === 'all' ? 'all' : 'trips'));

    this.setData({
      scheduleTab,
      taskFilter,
      todayKey: dateKey(today),
      todayDay: today.getDate(),
      activeKey: dateKey(this._activeDate),
      dateStrip: this._buildDateStrip(today)
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
      const [res, calendarResult] = await Promise.all([
        api.technician.orders.list({}),
        api.technician.orders.incomeCalendar().catch(() => null)
      ]);
      const raw = Array.isArray(res) ? res : (res.list || res.data || []);
      this._allOrders = raw.map(normalizeOrder).filter(Boolean).map(this._decorate);

      // 标记有效预约并按日期聚合预计 / 实际收入
      const marked = {};
      this._incomeByDate = {};
      const incomeOrders = calendarResult && Array.isArray(calendarResult.orders)
        ? calendarResult.orders.map(order => ({
          startTime: order.startTime,
          status: order.status,
          price: order.quotePrice || 0
        }))
        : this._allOrders;
      const registeredAt = parseDate(calendarResult && calendarResult.registeredAt);
      const earliestOrder = incomeOrders
        .map(order => parseDate(order.startTime))
        .filter(Boolean)
        .sort((a, b) => a - b)[0];
      this._registeredAt = registeredAt || earliestOrder || this._today;
      this._calendarEndDate = this._today;

      incomeOrders.forEach((o) => {
        const t = parseDate(o.startTime);
        if (t && t > this._calendarEndDate) this._calendarEndDate = t;
        if (!t || INVALID_INCOME_STATUSES.includes(o.status)) return;
        const key = dateKey(t);
        const income = this._incomeByDate[key] || { estimated: 0, actual: 0 };
        income.estimated += Number(o.price) || 0;
        if (o.status === 'completed') income.actual += Number(o.price) || 0;
        this._incomeByDate[key] = income;
        marked[key] = true;
      });
      this._markedKeys = marked;

      this.setData({
        markedKeys: marked,
        dateStrip: this._buildDateStrip(this._today),
        todayIncome: this._incomeMeta(this.data.todayKey),
        calendarYears: this._buildIncomeTimeline(),
        loading: false
      });
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
      _priceText: Number(o.price) > 0 ? compactMoney(o.price) : '',
      _avatarChar: (o.customerName && o.customerName[0]) || '客'
    };
  },

  _buildDateStrip(today) {
    const strip = Array.from({ length: 20 }, (_, i) => {
      const d = addDays(today, i + 1);
      const key = dateKey(d);
      return { key, day: d.getDate(), week: WEEK[d.getDay()], income: this._incomeMeta(key) };
    });
    const active = this._activeDate;
    const activeKey = active && dateKey(active);
    if (activeKey && activeKey !== dateKey(today) && !strip.some(item => item.key === activeKey)) {
      strip.unshift({
        key: activeKey,
        day: active.getDate(),
        week: WEEK[active.getDay()],
        income: this._incomeMeta(activeKey)
      });
      strip.pop();
    }
    return strip;
  },

  _incomeMeta(key) {
    const income = (this._incomeByDate && this._incomeByDate[key]) || { estimated: 0, actual: 0 };
    const isPast = key < dateKey(this._today || new Date());
    const amount = isPast ? income.actual : income.estimated;
    return amount > 0
      ? { type: isPast ? 'actual' : 'estimated', text: compactMoney(amount) }
      : { type: isPast ? 'actual' : 'estimated', text: '' };
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

    const decoratedDayOrders = markScheduleConflicts(dayOrders);
    const decoratedTripOrders = decoratedDayOrders.filter((o) => TRIP_STATUSES.indexOf(o.status) >= 0);
    const pendingOrders = all
      .filter((o) => o.status === 'pending_quote' || o.status === 'pending_confirm')
      .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
    const listOrders = this.data.taskFilter === 'pending'
      ? pendingOrders
      : (this.data.scheduleTab === 'trips' ? decoratedTripOrders : decoratedDayOrders);

    const m = active.getMonth() + 1;
    const d = active.getDate();
    const label = `${m}月${d}日 周${WEEK[active.getDay()]}`;

    this.setData({
      listOrders,
      summary: {
        conflicts: decoratedDayOrders.filter(order => order._hasConflict).length
      },
      activeKey: dateKey(active),
      activeIsToday: isSameDay(active, this._today),
      activeLabel: label,
      dateStrip: this._buildDateStrip(this._today)
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
    const currentMonthId = `month-${this._today.getFullYear()}-${String(this._today.getMonth() + 1).padStart(2, '0')}`;
    this.setData({
      showCalendar: true,
      calendarYears: this._buildIncomeTimeline(),
      calendarScrollTarget: currentMonthId
    });
  },

  closeCalendar() {
    this.setData({ showCalendar: false });
  },

  noop() {},

  _buildIncomeTimeline() {
    const start = new Date(this._registeredAt || this._today);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(this._calendarEndDate || this._today);
    end.setDate(1);
    end.setHours(0, 0, 0, 0);
    const years = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const year = cursor.getFullYear();
      let yearItem = years[years.length - 1];
      if (!yearItem || yearItem.year !== year) {
        yearItem = { year, months: [], expanded: year === this._activeDate.getFullYear() };
        years.push(yearItem);
      }
      yearItem.months.push(this._buildTimelineMonth(year, cursor.getMonth()));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    years.forEach(yearItem => {
      const totals = yearItem.months.reduce((sum, month) => ({
        actual: sum.actual + month.rawActual,
        estimated: sum.estimated + month.rawEstimated
      }), { actual: 0, estimated: 0 });
      yearItem.totals = periodTotals(yearItem.year - this._today.getFullYear(), totals);
    });
    return years;
  },

  _buildTimelineMonth(year, month) {
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: first.getDay() }, (_, index) => ({ empty: true, key: `empty-${index}` }));
    let rawActual = 0;
    let rawEstimated = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const key = dateKey(date);
      const income = this._incomeByDate[key] || { actual: 0, estimated: 0 };
      rawActual += income.actual;
      rawEstimated += income.estimated;
      days.push({
        key,
        date: key,
        day,
        isToday: key === this.data.todayKey,
        isSelected: key === this.data.activeKey,
        isBeforeRegistration: date < new Date(this._registeredAt.getFullYear(), this._registeredAt.getMonth(), this._registeredAt.getDate()),
        hasOrder: !!this._markedKeys[key],
        income: this._incomeMeta(key)
      });
    }

    const currentMonthIndex = this._today.getFullYear() * 12 + this._today.getMonth();
    const monthIndex = year * 12 + month;
    return {
      id: `month-${year}-${String(month + 1).padStart(2, '0')}`,
      month: month + 1,
      days,
      rawActual,
      rawEstimated,
      expanded: year === this._activeDate.getFullYear() && month === this._activeDate.getMonth(),
      totals: periodTotals(monthIndex - currentMonthIndex, { actual: rawActual, estimated: rawEstimated })
    };
  },

  toggleCalendarYear(e) {
    const yearIndex = Number(e.currentTarget.dataset.yearIndex);
    const year = this.data.calendarYears[yearIndex];
    if (!year) return;
    this.setData({ [`calendarYears[${yearIndex}].expanded`]: !year.expanded });
  },

  toggleCalendarMonth(e) {
    const yearIndex = Number(e.currentTarget.dataset.yearIndex);
    const monthIndex = Number(e.currentTarget.dataset.monthIndex);
    const year = this.data.calendarYears[yearIndex];
    const month = year && year.months[monthIndex];
    if (!month) return;
    this.setData({ [`calendarYears[${yearIndex}].months[${monthIndex}].expanded`]: !month.expanded });
  },

  onCalendarDayTap(e) {
    const dateStr = e.currentTarget.dataset.date;
    if (!dateStr) return;
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
  },

  onBookingCardOpen(e) {
    const id = e.detail && e.detail.id;
    if (id) wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  },

  onBookingCardNavigate(e) {
    this.navigateToAddress({ currentTarget: { dataset: { id: e.detail && e.detail.id } } });
  },

  onBookingCardContact(e) {
    this.contactCustomer({ currentTarget: { dataset: { phone: e.detail && e.detail.phone } } });
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
