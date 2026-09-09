/**
 * booking-time-picker — 预约时间选择组件
 *
 * 统一预约时间引擎：美甲师排班 + 店铺营业时间 + 已占用时段 → 可选时间网格
 *
 * Properties:
 *   techId         Number   美甲师ID（必填）
 *   serviceDate    String   初始日期 "YYYY-MM-DD"（可选）
 *   startTime      String   初始时间 "HH:mm"（可选）
 *   serviceType    String   'shop' | 'home'（可选，默认 'shop'）
 *   shopName       String   店铺名称（多店铺时精确匹配，可选）
 *   excludeOrderId Number   排除的订单ID（编辑时排除自身，可选）
 *   minDate        String   最小可选日期（可选，默认今天）
 *
 * Events:
 *   change  { serviceDate, startTime, available }
 */
var api = require('../../services/api');
var bookingEngine = require('../../utils/booking-time-engine');

var TIME_SLOTS = Array.from({ length: 48 }, function (_, index) {
  return pad2(Math.floor(index / 2)) + ':' + (index % 2 ? '30' : '00');
});

function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function dateStr(y, m, d) { return y + '-' + pad2(m + 1) + '-' + pad2(d); }
function buildCalendar(year, month, selectedDate) {
  var firstDay = new Date(year, month, 1).getDay();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var today = new Date();
  var todayStr = dateStr(today.getFullYear(), today.getMonth(), today.getDate());
  var days = [];
  for (var i = 0; i < firstDay; i++) days.push({ empty: true });
  for (var d = 1; d <= daysInMonth; d++) {
    var ds = dateStr(year, month, d);
    days.push({
      day: d, dateStr: ds,
      shortDate: (month + 1) + '/' + d,
      weekday: ds === todayStr ? '今天' : '周' + ['日','一','二','三','四','五','六'][new Date(year, month, d).getDay()],
      isPast: ds < todayStr,
      isToday: ds === todayStr,
      isSelected: ds === selectedDate
    });
  }
  return days;
}

Component({
  properties: {
    horizontal:    { type: Boolean, value: false },
    techId:         { type: Number, value: 0 },
    serviceDate:    { type: String, value: '' },
    startTime:      { type: String, value: '' },
    serviceType:    { type: String, value: 'shop' },
    shopName:       { type: String, value: '' },
    excludeOrderId: { type: Number, value: 0 },
    durationMinutes:{ type: Number, value: 120 },
    durationPending: { type: Boolean, value: false },
    minDate:        { type: String, value: '' }
  },

  data: {
    calendarYear: 0,
    calendarMonth: 0,
    calendarMonthLabel: '',
    calendarDays: [],
    futureDays: [],
    todayOption: null,
    visibleDayCount: 30,
    timeSlotStatuses: [],
    blockedSlots: [],
    closedDates: [],
    techInfo: null,
    shopAddresses: [],
    paused: false,
    loadFailed: false,
    _ready: false
  },

  observers: {
    'techId': function (id) {
      if (id) this._loadTech(id);
    },
    'serviceType, shopName, durationMinutes, durationPending, excludeOrderId, minDate': function () {
      if (this.data._ready) {
        this._updateCalendar();
        this._refreshTimeSlots();
      }
    }
  },

  lifetimes: {
    detached: function () {
      this._detached = true;
      this._requestId = (this._requestId || 0) + 1;
      clearTimeout(this._eventTimer);
    },
    attached: function () {
      var now = new Date();
      var y = now.getFullYear(), m = now.getMonth();
      // 如果有初始日期，用初始日期的年月
      if (this.data.serviceDate) {
        var parts = this.data.serviceDate.split('-');
        y = parseInt(parts[0]);
        m = parseInt(parts[1]) - 1;
      }
      this.setData({
        calendarYear: y,
        calendarMonth: m,
        calendarMonthLabel: y + '年' + (m + 1) + '月',
        calendarDays: buildCalendar(y, m, this.data.serviceDate)
      });
      if (this.data.techId) this._loadTech(this.data.techId);
    }
  },

  pageLifetimes: {
    show: function () { if (this.data.techId) this._loadTech(this.data.techId); }
  },

  methods: {
    retryLoad: function () { this._loadTech(this.data.techId); },
    contactArtist: function () { this.triggerEvent('contact'); },
    _queueEvent: function (name, detail) {
      if (this._detached) return;
      this._pendingEvents = this._pendingEvents || {};
      this._pendingEvents[name] = detail;
      if (this._eventTimer) return;
      var self = this;
      this._eventTimer = setTimeout(function () {
        self._eventTimer = null;
        var events = self._pendingEvents;
        self._pendingEvents = {};
        if (self._detached) return;
        Object.keys(events).forEach(function (key) { self.triggerEvent(key, events[key]); });
      }, 0);
    },
    // ── 加载美甲师数据 ──────────────────────
    _loadTech: function (techId) {
      var self = this;
      var tasks = [];
      var bookingSettings = null;
      var requestId = this._requestId = (this._requestId || 0) + 1;
      this.setData({ _ready: false, paused: false, loadFailed: false, timeSlotStatuses: [] });
      this._queueEvent('availability', { ready: false, paused: false });
      this._updateCalendar();

      // 根据角色选择不同 API 获取美甲师信息
      var app = getApp();
      var role = app && app.globalData && app.globalData.role;
      if (role === 'technician') {
        tasks.push(api.technician.auth.getUserInfo());
      } else {
        tasks.push(api.public.artists.detail(techId));
      }
      tasks.push(
        (role === 'technician'
          ? api.technician.orders.blockedSlots()
          : api.public.bookingSettings(techId).then(function (settings) {
              bookingSettings = settings;
              return settings.blockedSlots;
            }).catch(function (err) {
              if (err.statusCode === 404 || err.code === 404) { bookingSettings = null; return api.client.orders.blockedSlots(techId); }
              throw err;
            })
        )
      );

      return Promise.all(tasks).then(function (results) {
        if (requestId !== self._requestId) return;
        var tech = results[0] && (results[0].artist || results[0]);
        if (!tech || !Array.isArray(results[1])) throw new Error('预约数据不可用');
        var blocked = results[1] || [];

        var shopAddrs = tech ? (tech.shopAddresses || []).filter(function (s) { return s.enabled !== false; }) : [];

        self.setData({
          techInfo: tech,
          paused: role !== 'technician' && (tech.acceptingBookings === false || (tech.status && tech.status !== 'active') || false),
          blockedSlots: blocked,
          closedDates: role === 'technician' ? [] : ((bookingSettings && bookingSettings.days) || []).filter(function (day) { return !day.accepting; }).map(function (day) { return day.serviceDate; }),
          shopAddresses: shopAddrs,
          _ready: true
        });

        self._queueEvent('availability', { ready: true, paused: self.data.paused });
        self._updateCalendar();
        self._refreshTimeSlots();
      }).catch(function () {
        if (requestId !== self._requestId) return;
        self.setData({ _ready: false, loadFailed: true, timeSlotStatuses: [], startTime: '' });
        self._updateCalendar();
        self._emitChange(self.data.serviceDate, '', false);
      });
    },

    // ── 日历 ──────────────────────────────
    _updateCalendar: function () {
      var self = this;
      var days = buildCalendar(this.data.calendarYear, this.data.calendarMonth, this.data.serviceDate);
      if (this.data.horizontal) {
        var today = new Date();
        days = Array.from({ length: this.data.visibleDayCount }, function (_, offset) {
          var date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
          var ds = dateStr(date.getFullYear(), date.getMonth(), date.getDate());
          return { day: date.getDate(), dateStr: ds, shortDate: (date.getMonth() + 1) + '/' + date.getDate(), weekday: offset === 0 ? '今天' : '周' + ['日','一','二','三','四','五','六'][date.getDay()], isToday: offset === 0, isPast: false, isSelected: ds === self.data.serviceDate };
        });
      }
      days.forEach(function (day) {
        if (day.empty) return;
        var slots = self.data._ready && !self.data.paused ? self._slotsForDate(day.dateStr) : [];
        day.disabled = !self.data._ready || self.data.paused || day.isPast ||
          Boolean(self.data.minDate && day.dateStr < self.data.minDate) || !slots.some(function (slot) { return !slot.occupied; });
        day.label = day.disabled && !day.isPast && self.data._ready && !self.data.paused
          ? (self.data.closedDates.indexOf(day.dateStr) >= 0 ? '已停单' : (slots.some(function (slot) { return slot.reason === 'occupied'; }) ? '已约满' : '不可约')) : '';
        if (self.data.horizontal && day.disabled && self.data._ready && !self.data.paused) {
          var tech = self.data.techInfo;
          var shop = self._selectedShop();
          var isShop = self.data.serviceType === 'shop' || self.data.serviceType === '到店美甲';
          var rest = self.data.closedDates.indexOf(day.dateStr) >= 0 || !bookingEngine.activeScheduleForDate(tech && tech.serviceSchedule, day.dateStr) || (isShop && shop && !bookingEngine.shopHoursForDate(shop, day.dateStr));
          day.label = rest ? '休息日' : (isShop && !shop ? '先选门店' : '已约满');
        }
        if (day.disabled) day.isSelected = false;
      });
      this.setData({ calendarDays: days, todayOption: this.data.horizontal ? days[0] : null, futureDays: this.data.horizontal ? days.slice(1) : [] });
      var selectedDay = days.find(function (day) { return day.dateStr === self.data.serviceDate; });
      if (this.data.horizontal && this.data._ready && selectedDay && selectedDay.disabled) {
        this.setData({ serviceDate: '', startTime: '', timeSlotStatuses: [] });
        this._emitChange('', '', false);
      }
    },

    loadMoreDates: function () {
      this.setData({ visibleDayCount: this.data.visibleDayCount + 30 });
      this._updateCalendar();
    },

    onPrevMonth: function () {
      var today = new Date();
      if (this.data.horizontal && this.data.calendarYear * 12 + this.data.calendarMonth <= today.getFullYear() * 12 + today.getMonth()) return;
      var y = this.data.calendarYear, m = this.data.calendarMonth - 1;
      if (m < 0) { m = 11; y--; }
      this.setData({ calendarYear: y, calendarMonth: m, calendarMonthLabel: y + '年' + (m + 1) + '月' });
      this._updateCalendar();
    },

    onNextMonth: function () {
      var y = this.data.calendarYear, m = this.data.calendarMonth + 1;
      if (m > 11) { m = 0; y++; }
      this.setData({ calendarYear: y, calendarMonth: m, calendarMonthLabel: y + '年' + (m + 1) + '月' });
      this._updateCalendar();
    },

    onSelectDate: function (e) {
      var ds = e.currentTarget.dataset.date;
      if (!ds) return;
      var day = this.data.calendarDays.find(function (d) { return d.dateStr === ds; });
      if (!day || day.disabled) return;
      this.setData({
        serviceDate: ds,
        startTime: '',
        calendarDays: buildCalendar(this.data.calendarYear, this.data.calendarMonth, ds)
      });
      this._updateCalendar();
      this._refreshTimeSlots();
      this._emitChange(ds, '', false);
    },

    // ── 时间段 ──────────────────────────────
    _selectedShop: function () {
      var shopName = this.data.shopName;
      var shops = this.data.shopAddresses || [];
      return shops.find(function (item) { return item.name === shopName; }) || null;
    },

    _refreshTimeSlots: function () {
      var serviceDate = this.data.serviceDate;
      if (!serviceDate) { this.setData({ timeSlotStatuses: [] }); return; }

      var statuses = this.data._ready && !this.data.paused ? this._slotsForDate(serviceDate) : [];
      if (serviceDate < dateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) ||
          (this.data.minDate && serviceDate < this.data.minDate)) statuses = [];
      var available = statuses.some(function (slot) { return !slot.occupied; });
      var selected = statuses.find(function (slot) { return slot.time === this.data.startTime && !slot.occupied; }, this);
      this.setData({ timeSlotStatuses: available ? statuses : [] });
      if (!selected) {
        this.setData({ startTime: '' });
        this._emitChange(serviceDate, '', false);
      }
    },

    _slotsForDate: function (serviceDate) {
      if (this.data.closedDates.indexOf(serviceDate) >= 0 && !this.data.excludeOrderId) return [];
      var tech = this.data.techInfo;
      return bookingEngine.buildSlotStatuses({
        blockedSlots: this.data.blockedSlots,
        durationMinutes: this.data.durationMinutes,
        durationPending: this.data.durationPending,
        excludeOrderId: this.data.excludeOrderId,
        serviceDate: serviceDate,
        serviceSchedule: tech && tech.serviceSchedule,
        shop: this._selectedShop(),
        shopMode: this.data.serviceType === 'shop' || this.data.serviceType === '到店美甲',
        slots: TIME_SLOTS
      });
    },

    selectTime: function (e) {
      var time = e.currentTarget.dataset.time;
      var status = this.data.timeSlotStatuses.find(function (s) { return s.time === time; });
      if (!this.data._ready || this.data.paused || !status || status.occupied) return;
      this.setData({ startTime: time });
      this._emitChange(this.data.serviceDate, time, true);
    },

    // ── 事件通知 ──────────────────────────────
    _emitChange: function (date, time, available) {
      this._queueEvent('change', {
        serviceDate: date || this.data.serviceDate,
        startTime: time,
        available: available
      });
    }
  }
});
