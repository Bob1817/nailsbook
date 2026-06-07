const api = require('../../../services/api');

const TIME_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30',
  '19:00','19:30','20:00','20:30'
];

const WEEKDAY_NAMES = ['日','一','二','三','四','五','六'];

function timeToMin(t) { var p = t.split(':'); return parseInt(p[0])*60 + parseInt(p[1]); }
function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function dateStr(y,m,d) { return y + '-' + pad2(m+1) + '-' + pad2(d); }

function buildCalendar(year, month, serviceDate) {
  var firstDay = new Date(year, month, 1).getDay();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var today = new Date();
  var todayStr = dateStr(today.getFullYear(), today.getMonth(), today.getDate());
  var days = [];
  for (var i = 0; i < firstDay; i++) days.push({ empty: true });
  for (var d = 1; d <= daysInMonth; d++) {
    var ds = dateStr(year, month, d);
    days.push({
      day: d,
      dateStr: ds,
      isPast: ds < todayStr,
      isToday: ds === todayStr,
      isSelected: ds === serviceDate
    });
  }
  return days;
}

function formatAddr(a) { return [a.province,a.city,a.district,a.detailAddress].filter(Boolean).join(' '); }

function getRestDays(tech) {
  if (!tech || !tech.serviceSchedule) return [];
  var sched = tech.serviceSchedule;
  if (sched.restDays && sched.restDays.length > 0) return sched.restDays;
  var schemes = sched.schemes;
  if (schemes && schemes.length > 0) {
    var active = schemes.find(function(s) { return s.id === sched.activeSchemeId; }) || schemes[0];
    if (active && active.restDays) return active.restDays;
  }
  return [];
}

Page({
  data: {
    technicians: [],
    selectedTechId: 0,
    selectedTech: null,
    serviceType: '',
    availableServiceTypes: [],
    shopAddresses: [],
    selectedShopName: '',
    activeServiceItems: [],
    selectedServiceIds: [],
    isCustomService: false,
    customTitle: '',
    customDesc: '',
    customImages: [],
    showWorkSelector: false,
    techWorks: [],
    selectedWorkIds: [],
    addresses: [],
    selectedAddressId: null,
    // Calendar
    calendarYear: 0,
    calendarMonth: 0,
    calendarMonthLabel: '',
    calendarDays: [],
    serviceDate: '',
    startTime: '',
    // Time slots with occupied status
    timeSlotStatuses: [],
    blockedSlots: [],
    // Misc
    remark: '',
    uploading: false,
    submitting: false,
    minDate: '',
    showShopConfirm: false
  },

  onLoad: function (options) {
    var today = new Date();
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    var minDate = dateStr(today.getFullYear(), today.getMonth(), today.getDate());
    var defaultDate = dateStr(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    this.setData({
      minDate: minDate,
      serviceDate: defaultDate,
      calendarYear: tomorrow.getFullYear(),
      calendarMonth: tomorrow.getMonth(),
      calendarMonthLabel: tomorrow.getFullYear() + '年' + (tomorrow.getMonth() + 1) + '月',
      calendarDays: buildCalendar(tomorrow.getFullYear(), tomorrow.getMonth(), defaultDate)
    });
    // 从聊天「快速发起预约」进入：锁定美甲师为对话对象
    if (options.techId) this._presetTechId = parseInt(options.techId);
    this.loadTechnicians();
    this.loadAddresses();
    if (options.design_id) this.loadDesign(options.design_id);
    // 从作品详情「预约同款」进入：以该作品作为预约服务内容
    if (options.workId) this.loadWork(parseInt(options.workId));
  },

  onShow: function () { this.loadAddresses(); },

  // ── 数据加载 ─────────────────────────────

  loadTechnicians: function () {
    var self = this;
    api.auth.getUserInfo('client').then(function (res) {
      var bindings = res.bindings || wx.getStorageSync('client_bindings') || [];
      var techs = bindings.map(function (b) {
        var t = b.technician || b;
        return {
          id: t.id, name: t.name, avatarUrl: t.avatarUrl, city: t.city,
          status: t.status, homeService: t.homeService, shopService: t.shopService,
          shopAddresses: (t.shopAddresses || []).filter(function (sa) { return sa.enabled !== false; }),
          serviceItems: (t.serviceItems || []).filter(function (si) { return si.isActive; }),
          serviceSchedule: t.serviceSchedule || null,
          isDefault: b.isDefault || false
        };
      }).filter(function (t) { return t.status === 'active'; });
      self.setData({ technicians: techs });
      // 优先锁定快速预约带入的美甲师；否则仅一个时默认选中
      if (self._presetTechId && techs.some(function (t) { return t.id === self._presetTechId; })) {
        self.selectTechById(self._presetTechId);
      } else if (techs.length === 1) {
        self.selectTechById(techs[0].id);
      }
      // 作品预填：美甲师加载完成后应用
      if (self._pendingWorkPrefill) self.applyWorkPrefill();
    }).catch(function (e) { console.error(e); });
  },

  loadAddresses: function () {
    var self = this;
    api.client.addresses.list().then(function (res) {
      var addrs = res.list || res.data || res || [];
      var def = addrs.find(function (a) { return a.isDefault; }) || addrs[0];
      self.setData({ addresses: addrs, selectedAddressId: self.data.selectedAddressId || (def ? def.id : null) });
    }).catch(function () {});
  },

  loadDesign: function (designId) {
    var self = this;
    api.client.designs.detail(designId).then(function (d) {
      self.setData({
        isCustomService: true,
        customTitle: d.title || '设计作品',
        customDesc: d.description || '',
        customImages: d.imageUrls || [],
        selectedTechId: d.techId || self.data.selectedTechId
      });
      if (d.techId) self.selectTechById(d.techId);
    }).catch(function (e) { console.error('loadDesign', e); });
  },

  // 「预约同款」：以作品（美甲师 + 标题 + 图片）作为预约服务内容
  loadWork: function (workId) {
    var self = this;
    api.client.works.detail(workId).then(function (w) {
      var techId = w.technicianId || (w.technician && w.technician.id) || 0;
      var images = (w.imageUrls && w.imageUrls.length)
        ? w.imageUrls.slice(0, 9)
        : (w.coverUrl ? [w.coverUrl] : []);
      self._pendingWorkPrefill = {
        techId: techId,
        customTitle: w.title || '同款美甲',
        customDesc: w.description || '',
        customImages: images
      };
      if (techId) self._presetTechId = techId;
      // 美甲师已加载则立即应用，否则等 loadTechnicians 完成后应用
      if (self.data.technicians.length > 0) self.applyWorkPrefill();
    }).catch(function (e) { console.error('loadWork', e); });
  },

  applyWorkPrefill: function () {
    var pf = this._pendingWorkPrefill;
    if (!pf) return;
    // 先选中美甲师（会重置自定义字段），再写入作品内容
    if (pf.techId && this.data.selectedTechId !== pf.techId) {
      this.selectTechById(pf.techId);
    }
    this.setData({
      isCustomService: true,
      customTitle: pf.customTitle,
      customDesc: pf.customDesc,
      customImages: pf.customImages
    });
    this._pendingWorkPrefill = null;
  },

  loadTechWorks: function (techId) {
    var self = this;
    api.client.works.list({ techId: techId }).then(function (res) {
      var works = (res.list || res.data || res || []).filter(function (w) {
        return w.technicianId === techId || (w.technician && w.technician.id === techId);
      });
      self.setData({ techWorks: works });
    }).catch(function () { self.setData({ techWorks: [] }); });
  },

  fetchBlockedSlots: function (techId) {
    var self = this;
    api.client.orders.blockedSlots(techId).then(function (res) {
      self.setData({ blockedSlots: res || [] });
      self.refreshTimeSlots();
    }).catch(function () {
      self.setData({ blockedSlots: [] });
      self.refreshTimeSlots();
    });
  },

  // ── 选择美甲师 ──────────────────────────

  selectTechById: function (id) {
    this.selectTech({ currentTarget: { dataset: { id: id } } });
  },

  selectTech: function (e) {
    var id = e.currentTarget.dataset.id;
    var tech = this.data.technicians.find(function (t) { return t.id === id; });
    if (!tech) return;
    var shopAddrs = tech.shopAddresses || [];
    var hasHome = tech.homeService;
    var hasShop = tech.shopService && shopAddrs.length > 0;
    var types = [];
    if (hasHome) types.push({ value: '上门美甲', label: '上门美甲', desc: '美甲师按预约时间上门服务' });
    if (hasShop) types.push({ value: '到店美甲', label: '到店美甲', desc: '前往美甲师门店地址服务' });
    var serviceType = types.length > 0 ? types[0].value : '';
    var serviceItems = tech.serviceItems || [];
    this.setData({
      selectedTechId: id, selectedTech: tech,
      serviceType: serviceType, availableServiceTypes: types,
      shopAddresses: shopAddrs, selectedShopName: '',
      activeServiceItems: serviceItems,
      selectedServiceIds: [], selectedWorkIds: [],
      // 美甲师无服务项目时自动切换到自定义需求模式
      isCustomService: serviceItems.length === 0,
      blockedSlots: [], timeSlotStatuses: [], startTime: ''
    });
    this.loadTechWorks(id);
    this.fetchBlockedSlots(id);
    this.updateCalendarRestDays(tech);
  },

  updateCalendarRestDays: function (tech) {
    var restDays = getRestDays(tech);
    var days = buildCalendar(this.data.calendarYear, this.data.calendarMonth, this.data.serviceDate);
    if (restDays.length > 0) {
      days.forEach(function (d) {
        if (d.empty) return;
        var wd = new Date(d.dateStr + 'T00:00:00').getDay();
        if (restDays.indexOf(wd) >= 0) d.isRest = true;
      });
    }
    this.setData({ calendarDays: days });
  },

  // ── 服务类型 ─────────────────────────────

  selectServiceType: function (e) {
    var type = e.currentTarget.dataset.type;
    this.setData({ serviceType: type, selectedShopName: '', startTime: '' });
    this.refreshTimeSlots();
  },

  selectShopAddress: function (e) {
    this.setData({ selectedShopName: e.currentTarget.dataset.name, startTime: '' });
    this.refreshTimeSlots();
  },

  selectAddress: function (e) {
    this.setData({ selectedAddressId: e.currentTarget.dataset.id });
  },

  // ── 自定义 / 标准服务切换 ──────────────

  switchContentMode: function (e) {
    var mode = e.currentTarget.dataset.mode;
    this.setData({ isCustomService: mode === 'custom', selectedServiceIds: [] });
  },

  toggleService: function (e) {
    var id = e.currentTarget.dataset.id;
    var ids = this.data.selectedServiceIds.slice();
    var idx = ids.indexOf(id);
    if (idx >= 0) ids.splice(idx, 1); else ids.push(id);
    this.setData({ selectedServiceIds: ids });
  },

  onCustomTitleInput: function (e) { this.setData({ customTitle: e.detail.value }); },
  onCustomDescInput: function (e) { this.setData({ customDesc: e.detail.value }); },

  chooseImage: function () {
    var self = this;
    var remaining = 3 - self.data.customImages.length;
    if (remaining <= 0) return;
    wx.chooseMedia({
      count: remaining, mediaType: ['image'],
      success: function (res) {
        self.setData({ uploading: true });
        Promise.all(res.tempFiles.map(function (f) { return api.upload.image(f.tempFilePath); }))
          .then(function (results) {
            self.setData({ customImages: self.data.customImages.concat(results.map(function (r) { return r.url; })), uploading: false });
          })
          .catch(function () { wx.showToast({ title: '上传失败', icon: 'none' }); self.setData({ uploading: false }); });
      }
    });
  },

  removeImage: function (e) {
    var idx = e.currentTarget.dataset.index;
    var imgs = this.data.customImages.slice();
    imgs.splice(idx, 1);
    this.setData({ customImages: imgs });
  },

  toggleWorkSelector: function () { this.setData({ showWorkSelector: !this.data.showWorkSelector }); },

  toggleWork: function (e) {
    var id = e.currentTarget.dataset.id;
    var ids = this.data.selectedWorkIds.slice();
    var idx = ids.indexOf(id);
    if (idx >= 0) { ids.splice(idx, 1); }
    else { if (ids.length >= 3) { wx.showToast({ title: '最多选3个', icon: 'none' }); return; } ids.push(id); }
    this.setData({ selectedWorkIds: ids });
  },

  removeWork: function (e) {
    var id = e.currentTarget.dataset.id;
    this.setData({ selectedWorkIds: this.data.selectedWorkIds.filter(function (i) { return i !== id; }) });
  },

  // ── 日历 ─────────────────────────────────

  onPrevMonth: function () {
    var y = this.data.calendarYear, m = this.data.calendarMonth - 1;
    if (m < 0) { m = 11; y--; }
    var label = y + '年' + (m + 1) + '月';
    var days = buildCalendar(y, m, this.data.serviceDate);
    if (this.data.selectedTech) {
      var restDays = getRestDays(this.data.selectedTech);
      if (restDays.length > 0) {
        days.forEach(function (d) {
          if (d.empty) return;
          var wd = new Date(d.dateStr + 'T00:00:00').getDay();
          if (restDays.indexOf(wd) >= 0) d.isRest = true;
        });
      }
    }
    this.setData({ calendarYear: y, calendarMonth: m, calendarMonthLabel: label, calendarDays: days });
  },

  onNextMonth: function () {
    var y = this.data.calendarYear, m = this.data.calendarMonth + 1;
    if (m > 11) { m = 0; y++; }
    var label = y + '年' + (m + 1) + '月';
    var days = buildCalendar(y, m, this.data.serviceDate);
    if (this.data.selectedTech) {
      var restDays = getRestDays(this.data.selectedTech);
      if (restDays.length > 0) {
        days.forEach(function (d) {
          if (d.empty) return;
          var wd = new Date(d.dateStr + 'T00:00:00').getDay();
          if (restDays.indexOf(wd) >= 0) d.isRest = true;
        });
      }
    }
    this.setData({ calendarYear: y, calendarMonth: m, calendarMonthLabel: label, calendarDays: days });
  },

  onSelectDate: function (e) {
    var ds = e.currentTarget.dataset.date;
    if (!ds) return;
    var day = this.data.calendarDays.find(function (d) { return d.dateStr === ds; });
    if (!day || day.isPast || day.isRest) return;
    var days = buildCalendar(this.data.calendarYear, this.data.calendarMonth, ds);
    if (this.data.selectedTech) {
      var restDays = getRestDays(this.data.selectedTech);
      if (restDays.length > 0) {
        days.forEach(function (d) {
          if (d.empty) return;
          var wd = new Date(d.dateStr + 'T00:00:00').getDay();
          if (restDays.indexOf(wd) >= 0) d.isRest = true;
        });
      }
    }
    this.setData({ serviceDate: ds, startTime: '', calendarDays: days });
    this.refreshTimeSlots();
  },

  // ── 时间段 ───────────────────────────────

  refreshTimeSlots: function () {
    var serviceType = this.data.serviceType;
    var selectedShopName = this.data.selectedShopName;
    var shopAddresses = this.data.shopAddresses;
    var serviceDate = this.data.serviceDate;
    var blockedSlots = this.data.blockedSlots || [];
    var slots = TIME_SLOTS.slice();

    // Filter by shop business hours if applicable
    if (serviceType === '到店美甲' && selectedShopName) {
      var shop = shopAddresses.find(function (s) { return s.name === selectedShopName; });
      if (shop && shop.businessHours) {
        var weekday = new Date(serviceDate + 'T00:00:00').getDay();
        var hours = shop.businessHours.find(function (h) { return h.weekday === weekday; });
        if (!hours || hours.closed) {
          this.setData({ timeSlotStatuses: [], startTime: '' });
          return;
        }
        var start = timeToMin(hours.start), end = timeToMin(hours.end);
        slots = slots.filter(function (t) { var m = timeToMin(t); return m >= start && m < end; });
      }
    }

    // Build statuses with occupied flag
    var today = new Date();
    var todayStr = dateStr(today.getFullYear(), today.getMonth(), today.getDate());
    var nowMin = today.getHours() * 60 + today.getMinutes();
    var isToday = serviceDate === todayStr;

    var statuses = slots.map(function (time) {
      var occupied = false;
      // Past time check
      if (isToday && timeToMin(time) <= nowMin) {
        occupied = true;
      }
      // Blocked slot check
      if (!occupied && blockedSlots.length > 0) {
        var slotDateTime = new Date(serviceDate + 'T' + time + ':00');
        for (var i = 0; i < blockedSlots.length; i++) {
          var bStart = new Date(blockedSlots[i].startTime);
          var bEnd = new Date(blockedSlots[i].endTime);
          if (slotDateTime >= bStart && slotDateTime < bEnd) {
            occupied = true;
            break;
          }
        }
      }
      return { time: time, occupied: occupied };
    });

    // Auto-select 14:00 if available and no time selected
    if (!this.data.startTime || slots.indexOf(this.data.startTime) < 0) {
      var defaultSlot = statuses.find(function (s) { return s.time === '14:00' && !s.occupied; });
      if (!defaultSlot) defaultSlot = statuses.find(function (s) { return !s.occupied; });
      if (defaultSlot) this.setData({ startTime: defaultSlot.time });
    }

    this.setData({ timeSlotStatuses: statuses });
  },

  selectTime: function (e) {
    var time = e.currentTarget.dataset.time;
    var status = this.data.timeSlotStatuses.find(function (s) { return s.time === time; });
    if (status && status.occupied) return;
    this.setData({ startTime: time });
  },

  // ── 备注 ─────────────────────────────────

  onRemarkInput: function (e) { this.setData({ remark: e.detail.value }); },

  // ── 地址 ─────────────────────────────────

  goToAddAddress: function () { wx.navigateTo({ url: '/pages/client/address-edit/index' }); },

  // ── 提交 ─────────────────────────────────

  handleSubmit: function () {
    var d = this.data;
    if (d.submitting) return;
    if (!d.selectedTechId) { wx.showToast({ title: '请选择美甲师', icon: 'none' }); return; }
    if (!d.serviceType) { wx.showToast({ title: '请选择服务类型', icon: 'none' }); return; }
    if (!d.serviceDate) { wx.showToast({ title: '请选择日期', icon: 'none' }); return; }
    if (!d.startTime) { wx.showToast({ title: '请选择时间', icon: 'none' }); return; }
    if (d.serviceType === '上门美甲' && !d.selectedAddressId) { wx.showToast({ title: '请选择上门地址', icon: 'none' }); return; }
    if (d.serviceType === '到店美甲' && !d.selectedShopName) { wx.showToast({ title: '请选择门店', icon: 'none' }); return; }
    if (d.isCustomService && !d.customTitle.trim()) { wx.showToast({ title: '请输入服务名称', icon: 'none' }); return; }
    if (!d.isCustomService && d.selectedServiceIds.length === 0) { wx.showToast({ title: '请选择服务内容', icon: 'none' }); return; }

    // Shop service: show confirmation modal first
    if (d.serviceType === '到店美甲') {
      this.setData({ showShopConfirm: true });
      return;
    }

    this.doSubmit();
  },

  confirmShopBooking: function () {
    this.setData({ showShopConfirm: false });
    this.doSubmit();
  },

  cancelShopBooking: function () {
    this.setData({ showShopConfirm: false });
  },

  doSubmit: function () {
    var self = this;
    var d = self.data;
    self.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    var payload = {
      techId: d.selectedTechId,
      serviceDate: d.serviceDate,
      startTime: d.startTime,
      serviceType: d.serviceType,
      remark: d.remark || undefined
    };
    if (d.serviceType === '上门美甲') payload.addressId = d.selectedAddressId;
    if (d.serviceType === '到店美甲') {
      var shop = d.shopAddresses.find(function (s) { return s.name === d.selectedShopName; });
      if (shop) payload.shopAddress = shop;
    }
    if (d.isCustomService) {
      payload.customTitle = d.customTitle.trim();
      if (d.customDesc.trim()) payload.customDescription = d.customDesc.trim();
      if (d.customImages.length > 0) payload.customImages = d.customImages;
    } else {
      payload.selectedServiceIds = d.selectedServiceIds;
    }

    api.client.orders.create(payload).then(function () {
      wx.hideLoading();
      wx.showToast({ title: '预约成功', icon: 'success' });
      setTimeout(function () { wx.reLaunch({ url: '/pages/client/orders/index' }); }, 1200);
    }).catch(function (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }).finally(function () {
      self.setData({ submitting: false });
    });
  }
});
