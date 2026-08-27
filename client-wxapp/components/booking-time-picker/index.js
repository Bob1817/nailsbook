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

var DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'];
var WEEKDAY_NAMES = ['日','一','二','三','四','五','六'];

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
      isPast: ds < todayStr,
      isToday: ds === todayStr,
      isSelected: ds === selectedDate
    });
  }
  return days;
}

function getRestDays(tech) {
  if (!tech || !tech.serviceSchedule) return [];
  var sched = tech.serviceSchedule;
  if (sched.restDays && sched.restDays.length > 0) return sched.restDays;
  return [];
}

Component({
  properties: {
    techId:         { type: Number, value: 0 },
    serviceDate:    { type: String, value: '' },
    startTime:      { type: String, value: '' },
    serviceType:    { type: String, value: 'shop' },
    shopName:       { type: String, value: '' },
    excludeOrderId: { type: Number, value: 0 },
    durationMinutes:{ type: Number, value: 120 },
    minDate:        { type: String, value: '' }
  },

  data: {
    calendarYear: 0,
    calendarMonth: 0,
    calendarMonthLabel: '',
    calendarDays: [],
    timeSlotStatuses: [],
    blockedSlots: [],
    techInfo: null,
    shopAddresses: [],
    _ready: false
  },

  observers: {
    'techId': function (id) {
      if (id) this._loadTech(id);
    },
    'serviceType, shopName, durationMinutes, excludeOrderId': function () {
      if (this.data._ready) {
        this._updateCalendar();
        this._refreshTimeSlots();
      }
    }
  },

  lifetimes: {
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

  methods: {
    // ── 加载美甲师数据 ──────────────────────
    _loadTech: function (techId) {
      var self = this;
      var tasks = [];

      // 根据角色选择不同 API 获取美甲师信息
      var app = getApp();
      var role = app && app.globalData && app.globalData.role;
      if (role === 'technician') {
        tasks.push(api.technician.auth.getUserInfo().catch(function () { return null; }));
      } else {
        tasks.push(api.public.artists.detail(techId).catch(function () { return null; }));
      }
      tasks.push(
        (role === 'technician'
          ? api.technician.orders.blockedSlots()
          : api.client.orders.blockedSlots(techId)
        ).catch(function () { return []; })
      );

      Promise.all(tasks).then(function (results) {
        var tech = results[0];
        var blocked = results[1] || [];

        var shopAddrs = tech ? (tech.shopAddresses || []).filter(function (s) { return s.enabled !== false; }) : [];

        self.setData({
          techInfo: tech,
          blockedSlots: blocked,
          shopAddresses: shopAddrs,
          _ready: true
        });

        self._updateCalendar();
        self._refreshTimeSlots();
      });
    },

    // ── 日历 ──────────────────────────────
    _updateCalendar: function () {
      var tech = this.data.techInfo;
      var restDays = getRestDays(tech);
      var schedule = tech ? tech.serviceSchedule : null;
      var shop = this._selectedShop();
      var shopMode = this.data.serviceType === 'shop' || this.data.serviceType === '到店美甲';
      var days = buildCalendar(this.data.calendarYear, this.data.calendarMonth, this.data.serviceDate);

      if (days.length > 0 && (restDays.length > 0 || (schedule && schedule.schemes))) {
        days.forEach(function (d) {
          if (d.empty) return;
          if (restDays.indexOf(d.dateStr) >= 0) { d.isRest = true; return; }
          if (schedule && schedule.schemes) {
            var active = schedule.schemes.find(function (s) { return s.id === schedule.activeSchemeId; });
            if (active && active.days && active.days.length > 0) {
              var wd = new Date(d.dateStr + 'T00:00:00').getDay();
              if (active.days.indexOf(DAY_KEYS[wd]) < 0) d.isRest = true;
            }
          }
          if (!d.isRest && shopMode && !bookingEngine.shopHoursForDate(shop, d.dateStr)) d.isRest = true;
        });
      }
      this.setData({ calendarDays: days });
    },

    onPrevMonth: function () {
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
      if (!day || day.isPast || day.isRest) return;
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

      var blockedSlots = this.data.blockedSlots || [];
      var tech = this.data.techInfo;
      var statuses = bookingEngine.buildSlotStatuses({
        blockedSlots: blockedSlots,
        durationMinutes: this.data.durationMinutes,
        excludeOrderId: this.data.excludeOrderId,
        serviceDate: serviceDate,
        serviceSchedule: tech && tech.serviceSchedule,
        shop: this._selectedShop(),
        shopMode: this.data.serviceType === 'shop' || this.data.serviceType === '到店美甲',
        slots: TIME_SLOTS
      });

      this.setData({ timeSlotStatuses: statuses });
    },

    selectTime: function (e) {
      var time = e.currentTarget.dataset.time;
      var status = this.data.timeSlotStatuses.find(function (s) { return s.time === time; });
      if (status && status.occupied) return;
      this.setData({ startTime: time });
      this._emitChange(this.data.serviceDate, time, true);
    },

    // ── 事件通知 ──────────────────────────────
    _emitChange: function (date, time, available) {
      this.triggerEvent('change', {
        serviceDate: date || this.data.serviceDate,
        startTime: time || this.data.startTime,
        available: available
      });
    }
  }
});
