const api = require('../../../services/api');
const { phoneMask } = require('../../../utils/util');
const { parseDate, isSameDay } = require('../../../utils/format');
const { normalizeSchedule, genId, daysSummary, DAY_KEYS, TIME_OPTIONS } = require('../../../utils/workSchedule');

// 我的预约 - 状态快捷入口
const ORDER_SHORTCUTS = [
  { status: 'pending_quote',   label: '待报价', icon: '💬' },
  { status: 'pending_confirm', label: '待确认', icon: '⏳' },
  { status: 'pending_home',    label: '待上门', icon: '🚗' },
  { status: 'pending_shop',    label: '待到店', icon: '🏪' },
  { status: 'in_progress',     label: '服务中', icon: '💅' }
];

// 工具入口（仅保留有对应页面的）
const TOOLS = [
  { key: 'services',    label: '服务管理', icon: '💅' },
  { key: 'works',       label: '作品管理', icon: '🖼️' },
  { key: 'homeService', label: '上门设置', icon: '🚗' },
  { key: 'serviceTime', label: '服务时间', icon: '⏰' },
  { key: 'shops',       label: '店铺管理', icon: '🏪' },
  { key: 'tags',        label: '标签管理', icon: '🏷️' },
  { key: 'subscription',label: '订阅套餐', icon: '⭐' }
];

const TOOL_ROUTES = {
  services:     '/pages/technician/services/index',
  works:        '/pages/technician/works/index',
  homeService:  '/pages/technician/home-service-settings/index',
  serviceTime:  '/pages/technician/service-time/index',
  shops:        '/pages/technician/shop-management/index',
  tags:         '/pages/technician/tag-management/index',
  subscription: '/pages/technician/subscription/index'
};

Page({
  data: {
    userInfo: {},
    isAccepting: false,
    stats: { todayOrders: 0, customers: 0, works: 0 },
    orderShortcuts: ORDER_SHORTCUTS.map((s) => ({ ...s, count: 0 })),
    tools: TOOLS,

    // 工作时间设置
    showScheduleModal: false,
    schedule: null,
    savingSchedule: false,

    // 方案编辑器
    showSchemeEditor: false,
    editingScheme: null,
    editingSchemeIndex: -1,
    schemeError: '',
    timeOptions: TIME_OPTIONS,
    dayKeys: DAY_KEYS,
    dayLabels: { mon: '周一', tue: '周二', wed: '周三', thu: '周四', fri: '周五', sat: '周六', sun: '周日' },

    // 休息日日历
    showRestDayCalendar: false,
    selectedDaysMap: {},
    startTimeIdx: 0,
    endTimeIdx: 0
  },

  onLoad() {
    this.applyUserInfo();
  },

  onShow() {
    if (wx.getStorageSync('role') !== 'technician') return;
    this.applyUserInfo();
    this.loadStats();
  },

  onPullDownRefresh() {
    this.applyUserInfo();
    this.loadStats().finally(() => wx.stopPullDownRefresh());
  },

  applyUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || wx.getStorageSync('technician_userInfo') || {};
    if (userInfo.phone) userInfo.phoneDisplay = phoneMask(userInfo.phone);
    this.setData({ userInfo });
    this.computeAccepting();
  },

  // 根据工作时间方案和休息日自动判断接单状态
  // 无生效方案 → 24小时全程接单（仅受其他预约占用限制）
  computeAccepting() {
    const userInfo = this.data.userInfo || {};
    if (userInfo.status === 'inactive') {
      this.setData({ isAccepting: false });
      return;
    }
    const schedule = normalizeSchedule(userInfo.serviceSchedule);
    const schemes = schedule.schemes || [];
    const active = schemes.find((s) => s.id === schedule.activeSchemeId);
    // 无生效方案 → 24小时接单
    if (!active || active.days.length === 0) {
      this.setData({ isAccepting: true });
      return;
    }
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayKey = dayKeys[now.getDay()];
    if ((schedule.restDays || []).indexOf(todayStr) >= 0) {
      this.setData({ isAccepting: false });
      return;
    }
    if (active.days.indexOf(todayKey) < 0) {
      this.setData({ isAccepting: false });
      return;
    }
    this.setData({ isAccepting: true });
  },

  // ---------- 统计 ----------
  async loadStats() {
    const [ordersRes, customersRes, worksRes] = await Promise.all([
      api.technician.orders.list({}).catch(() => []),
      api.technician.customers.list({}).catch(() => []),
      api.technician.works.list().catch(() => [])
    ]);

    const orders = Array.isArray(ordersRes) ? ordersRes : (ordersRes.list || ordersRes.data || []);
    const customers = Array.isArray(customersRes) ? customersRes : (customersRes.list || customersRes.data || []);
    const works = Array.isArray(worksRes) ? worksRes : (worksRes.list || worksRes.data || []);

    const now = new Date();
    let todayOrders = 0;
    const counts = {};
    orders.forEach((o) => {
      if (o.status) counts[o.status] = (counts[o.status] || 0) + 1;
      const t = parseDate(o.startTime);
      if (t && isSameDay(t, now) && o.status !== 'cancelled') todayOrders += 1;
    });

    const orderShortcuts = ORDER_SHORTCUTS.map((s) => ({
      ...s,
      count: counts[s.status] || 0
    }));

    this.setData({
      stats: {
        todayOrders,
        customers: customers.length,
        works: works.length
      },
      orderShortcuts
    });
  },

  // ---------- 我的预约 ----------
  goAllOrders() {
    wx.navigateTo({ url: '/pages/technician/all-bookings/index' });
  },
  goOrderStatus(e) {
    const status = e.currentTarget.dataset.status;
    wx.navigateTo({ url: `/pages/technician/all-bookings/index?status=${status}` });
  },

  // ---------- 统计数据跳转 ----------
  goStatsOrders() {
    wx.reLaunch({ url: '/pages/technician/orders/index?tab=all' });
  },
  goStatsCustomers() {
    wx.reLaunch({ url: '/pages/technician/customers/index' });
  },
  goStatsWorks() {
    wx.reLaunch({ url: '/pages/technician/works/index' });
  },

  // ---------- 邀请码 ----------
  copyInvite() {
    const code = this.data.userInfo && this.data.userInfo.invitationCode;
    if (!code) return wx.showToast({ title: '暂无邀请码', icon: 'none' });
    wx.setClipboardData({
      data: code,
      success: () => wx.showToast({ title: '邀请码已复制', icon: 'success' })
    });
  },

  onShareAppMessage() {
    const u = this.data.userInfo || {};
    const code = u.invitationCode || '';
    return {
      title: `美甲师 ${u.name || '小美'} 的名片`,
      path: code ? `/pages/client/login/index?invite=${code}` : '/pages/role-select/index',
      imageUrl: u.avatarUrl || ''
    };
  },

  // ---------- 工具 ----------
  onTool(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'serviceTime') return this.openScheduleModal();
    const url = TOOL_ROUTES[key];
    if (url) wx.navigateTo({ url });
  },

  // ---------- 工作时间设置 ----------
  openScheduleModal() {
    const userInfo = this.data.userInfo || {};
    const schedule = normalizeSchedule(userInfo.serviceSchedule);
    // 为每个方案生成摘要
    if (schedule.schemes) {
      schedule.schemes = schedule.schemes.map((s) => ({
        ...s,
        _summary: s.startTime + '–' + s.endTime + ' · ' + daysSummary(s.days)
      }));
    }
    this.setData({ schedule, showScheduleModal: true });
  },

  closeScheduleModal() {
    this.setData({ showScheduleModal: false, schedule: null });
  },

  preventBubble() {},

  _buildSelectedDaysMap(days) {
    const map = {};
    (days || []).forEach((d) => { map[d] = true; });
    return map;
  },

  // --- 方案列表 ---
  addScheme() {
    const schedule = this.data.schedule || { schemes: [], activeSchemeId: null, restDays: [] };
    const newScheme = {
      id: genId(),
      label: '方案' + ((schedule.schemes || []).length + 1),
      startTime: '10:00',
      endTime: '21:00',
      days: [],
      _summary: '10:00–21:00 · 未选择'
    };
    const schemes = (schedule.schemes || []).concat([newScheme]);
    this.setData({
      schedule: { ...schedule, schemes },
      editingScheme: JSON.parse(JSON.stringify(newScheme)),
      editingSchemeIndex: schemes.length - 1,
      schemeError: '',
      showSchemeEditor: true,
      selectedDaysMap: {},
      startTimeIdx: TIME_OPTIONS.indexOf('10:00'),
      endTimeIdx: TIME_OPTIONS.indexOf('21:00')
    });
  },

  editScheme(e) {
    const idx = e.currentTarget.dataset.index;
    const scheme = this.data.schedule.schemes[idx];
    this.setData({
      editingScheme: JSON.parse(JSON.stringify(scheme)),
      editingSchemeIndex: idx,
      schemeError: '',
      showSchemeEditor: true,
      selectedDaysMap: this._buildSelectedDaysMap(scheme.days),
      startTimeIdx: TIME_OPTIONS.indexOf(scheme.startTime),
      endTimeIdx: TIME_OPTIONS.indexOf(scheme.endTime)
    });
  },

  toggleSchemeActive(e) {
    const id = e.currentTarget.dataset.id;
    const schedule = this.data.schedule;
    const newActiveId = id === schedule.activeSchemeId ? null : id;
    this.setData({ schedule: { ...schedule, activeSchemeId: newActiveId } });
  },

  closeSchemeEditor() {
    const idx = this.data.editingSchemeIndex;
    const schedule = this.data.schedule;
    // 移除 days 为空的未完成方案（新增但未保存）
    if (idx >= 0 && schedule.schemes[idx] && schedule.schemes[idx].days.length === 0) {
      const schemes = schedule.schemes.filter((_, i) => i !== idx);
      let activeSchemeId = schedule.activeSchemeId;
      if (schemes.length === 0) activeSchemeId = null;
      this.setData({
        schedule: { ...schedule, schemes, activeSchemeId },
        showSchemeEditor: false,
        editingScheme: null,
        editingSchemeIndex: -1
      });
      return;
    }
    this.setData({ showSchemeEditor: false, editingScheme: null, editingSchemeIndex: -1, schemeError: '' });
  },

  // 方案编辑器 - 标签输入
  onSchemeLabelInput(e) {
    const editingScheme = this.data.editingScheme;
    this.setData({ editingScheme: { ...editingScheme, label: e.detail.value } });
  },

  // 方案编辑器 - 开始时间选择
  onStartTimeChange(e) {
    const idx = parseInt(e.detail.value[0], 10);
    const time = TIME_OPTIONS[idx];
    const editingScheme = this.data.editingScheme;
    this.setData({ editingScheme: { ...editingScheme, startTime: time }, startTimeIdx: idx });
  },

  // 方案编辑器 - 结束时间选择
  onEndTimeChange(e) {
    const idx = parseInt(e.detail.value[0], 10);
    const time = TIME_OPTIONS[idx];
    const editingScheme = this.data.editingScheme;
    this.setData({ editingScheme: { ...editingScheme, endTime: time }, endTimeIdx: idx });
  },

  // 方案编辑器 - 切换工作日
  toggleSchemeDay(e) {
    const day = e.currentTarget.dataset.day;
    const editingScheme = this.data.editingScheme;
    let days = editingScheme.days || [];
    if (days.indexOf(day) >= 0) {
      days = days.filter((d) => d !== day);
    } else {
      days = days.concat([day]);
    }
    this.setData({
      editingScheme: { ...editingScheme, days },
      selectedDaysMap: this._buildSelectedDaysMap(days)
    });
  },

  // 方案编辑器 - 保存
  saveScheme() {
    const { editingScheme, editingSchemeIndex, schedule } = this.data;
    this.setData({ schemeError: '' });

    if (!editingScheme.days || editingScheme.days.length === 0) {
      this.setData({ schemeError: '请选择应用的工作日' });
      return;
    }

    const startIdx = TIME_OPTIONS.indexOf(editingScheme.startTime);
    const endIdx = TIME_OPTIONS.indexOf(editingScheme.endTime);
    if (startIdx >= endIdx) {
      this.setData({ schemeError: '结束时间需晚于开始时间' });
      return;
    }

    const updated = { ...editingScheme, _summary: editingScheme.startTime + '–' + editingScheme.endTime + ' · ' + daysSummary(editingScheme.days) };
    const schemes = schedule.schemes.map((s, i) => i === editingSchemeIndex ? updated : s);
    // 如果没有 activeSchemeId，自动设为第一个
    const activeSchemeId = schedule.activeSchemeId || schemes[0].id;

    this.setData({
      schedule: { ...schedule, schemes, activeSchemeId },
      showSchemeEditor: false,
      editingScheme: null,
      editingSchemeIndex: -1
    });
  },

  // 方案编辑器 - 删除
  deleteScheme() {
    const { editingSchemeIndex, schedule } = this.data;
    const removed = schedule.schemes[editingSchemeIndex];
    const schemes = schedule.schemes.filter((_, i) => i !== editingSchemeIndex);
    let activeSchemeId = schedule.activeSchemeId;
    if (removed && removed.id === activeSchemeId) {
      activeSchemeId = schemes.length > 0 ? schemes[0].id : null;
    }
    this.setData({
      schedule: { ...schedule, schemes, activeSchemeId },
      showSchemeEditor: false,
      editingScheme: null,
      editingSchemeIndex: -1
    });
  },

  // --- 休息日 ---
  openRestDayCalendar() {
    // 先关闭工作时间弹窗，避免 z-index 层级冲突
    this.setData({ showRestDayCalendar: true, showScheduleModal: false });
  },

  closeRestDayCalendar() {
    // 关闭日历后重新打开工作时间弹窗
    this.setData({ showRestDayCalendar: false, showScheduleModal: true });
  },

  onRestDayConfirm(e) {
    const dates = e.detail.dates || [];
    const schedule = this.data.schedule;
    this.setData({
      schedule: { ...schedule, restDays: dates },
      showRestDayCalendar: false,
      showScheduleModal: true
    });
  },

  removeRestDay(e) {
    const date = e.currentTarget.dataset.date;
    const schedule = this.data.schedule;
    const restDays = (schedule.restDays || []).filter((d) => d !== date);
    this.setData({ schedule: { ...schedule, restDays } });
  },

  // --- 保存工作时间 ---
  async saveSchedule() {
    const { schedule } = this.data;
    if (!schedule || !schedule.schemes || schedule.schemes.length === 0) {
      return wx.showToast({ title: '请至少添加一个工作时间方案', icon: 'none' });
    }
    this.setData({ savingSchedule: true });
    try {
      const cleanSchedule = {
        schemes: schedule.schemes.map((s) => ({ id: s.id, label: s.label, startTime: s.startTime, endTime: s.endTime, days: s.days })),
        activeSchemeId: schedule.activeSchemeId,
        restDays: schedule.restDays || []
      };
      const res = await api.technician.auth.updateProfile({ serviceSchedule: cleanSchedule });
      const userInfo = this.data.userInfo;
      userInfo.serviceSchedule = res.serviceSchedule || cleanSchedule;
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('technician_userInfo', userInfo);
      this.setData({ userInfo, savingSchedule: false, showScheduleModal: false, schedule: null });
      this.computeAccepting();
      wx.showToast({ title: '工作时间已保存', icon: 'success' });
    } catch (err) {
      this.setData({ savingSchedule: false });
      wx.showToast({ title: err.message || '保存失败，请重试', icon: 'none' });
    }
  },

  editProfile() {
    wx.navigateTo({ url: '/pages/technician/profile-settings/index' });
  },

  // ---------- 设置 ----------
  navigateToAccountSecurity() { wx.navigateTo({ url: '/pages/technician/account-security/index' }); },
  navigateToHelp() { wx.navigateTo({ url: '/pages/technician/help-feedback/index' }); },
  navigateToAbout() { wx.navigateTo({ url: '/pages/technician/about/index' }); },

  switchRole() {
    wx.reLaunch({ url: '/pages/role-select/index' });
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (!res.confirm) return;
        getApp().logout();
        wx.reLaunch({ url: '/pages/role-select/index' });
      }
    });
  }
});
