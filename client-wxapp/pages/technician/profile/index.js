const api = require('../../../services/api');
const { phoneMask } = require('../../../utils/util');
const { parseDate, isSameDay } = require('../../../utils/format');
const { normalizeSchedule, genId, daysSummary, DAY_KEYS, TIME_OPTIONS } = require('../../../utils/workSchedule');

// 我的预约 - 状态快捷入口
const ORDER_SHORTCUTS = [
  { status: 'pending_quote',   label: '待报价', icon: '/static/icons/tab-chat-active.svg' },
  { status: 'pending_confirm', label: '待确认', icon: '/static/icons/clock.svg' },
  { status: 'pending_shop',    label: '待到店', icon: '/static/icons/shop.svg' },
  { status: 'in_progress',     label: '服务中', icon: '/static/icons/status-progress.svg' }
];

// 工具入口（仅保留有对应页面的）
const TOOLS = [
  { key: 'homepage',    label: '我的主页', icon: '/static/icons/profile-edit.svg' },
  { key: 'services',    label: '服务管理', icon: '/static/icons/scissors.svg' },
  { key: 'works',       label: '作品管理', icon: '/static/icons/image.svg' },
  { key: 'styles',      label: '擅长风格', icon: '/static/icons/tag.svg' },
  { key: 'designs',     label: '设计需求', icon: '/static/icons/edit.svg' },
  { key: 'serviceTime', label: '服务时间', icon: '/static/icons/clock.svg' },
  { key: 'shops',       label: '店铺管理', icon: '/static/icons/shop.svg' },
  { key: 'tags',        label: '标签管理', icon: '/static/icons/tag.svg' }
];

const TOOL_ROUTES = {
  homepage:     '/pages/technician/homepage-settings/index',
  services:     '/pages/technician/services/index',
  works:        '/pages/technician/works/index',
  styles:       '/pages/technician/homepage-settings/index?section=styles',
  designs:      '/pages/technician/design-requests/index',
  serviceTime:  '/pages/technician/service-time/index',
  shops:        '/pages/technician/shop-management/index',
  tags:         '/pages/technician/tag-management/index'
};

Page({
  data: {
    userInfo: {},
    isAccepting: false,
    canAcceptOrders: false,  // 是否满足接单前置条件（已开启上门或到店服务）
    stats: { todayOrders: 0, monthOrders: 0, pendingTotal: 0, customers: 0, newCustomers: 0, works: 0, monthlyRevenue: '¥0', rating: '待积累' },
    orderShortcuts: ORDER_SHORTCUTS.map((s) => ({ ...s, count: 0 })),
    tools: TOOLS,

    // 新手引导
    needsSetup: false,       // shopService 未配置时显示引导卡
    shopServiceOn: false,
    setupSteps: [],

    // 服务类型引导弹窗（仅工作时间设置时触发）
    showServiceTypeModal: false,
    serviceTypeTab: 'shop',  // 仅到店服务
    // 店铺管理
    shopList: [],
    shopLoading: false,
    showShopForm: false,
    editingShop: null,
    shopName: '',
    shopAddress: '',
    shopPhone: '',
    shopSaving: false,

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
    this.refreshUserInfo();
    this.loadStats();
  },

  async refreshUserInfo() {
    try {
      const fresh = await api.technician.auth.getUserInfo();
      const userInfo = { ...(this.data.userInfo || {}), ...fresh };
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('technician_userInfo', userInfo);
      this.applyUserInfo();
    } catch (err) {
      console.warn('refresh technician profile failed', err);
    }
  },

  onPullDownRefresh() {
    this.applyUserInfo();
    this.loadStats().finally(() => wx.stopPullDownRefresh());
  },

  applyUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || wx.getStorageSync('technician_userInfo') || {};
    if (userInfo.phone) userInfo.phoneDisplay = phoneMask(userInfo.phone);
    const shopServiceOn = !!userInfo.shopService;
    const activeServices = (userInfo.serviceItems || []).filter((item) =>
      item && item.isActive !== false && item.name && Number.isFinite(Number(item.price)) && Number(item.durationMinutes) > 0
    );
    const schedule = normalizeSchedule(userInfo.serviceSchedule);
    const activeScheme = (schedule.schemes || []).find((item) => item.id === schedule.activeSchemeId);
    const serviceReady = activeServices.length > 0;
    const shopReady = shopServiceOn && (userInfo.shopAddresses || []).some((item) => item.enabled !== false && (item.detailAddress || item.address));
    const scheduleReady = !!(activeScheme && activeScheme.days && activeScheme.days.length && activeScheme.startTime < activeScheme.endTime);
    const setupSteps = [
      { key: 'services', label: '完善服务与定价', hint: serviceReady ? '已配置有效服务' : '添加服务名称、价格和预计时长', done: serviceReady, route: 'services' },
      { key: 'shop', label: '完善到店门店', hint: shopReady ? '已配置可用门店' : '添加客户到店地址', done: shopReady, route: 'shops' },
      { key: 'schedule', label: '设置可预约时间', hint: scheduleReady ? '已启用工作时间方案' : '设置工作日和营业时段', done: scheduleReady, route: 'schedule' }
    ];
    const canAcceptOrders = serviceReady && shopReady && scheduleReady;
    this.setData({ userInfo, shopServiceOn, needsSetup: !canAcceptOrders, canAcceptOrders, setupSteps });
    this.computeAccepting();
  },

  goSetupStep(e) {
    const route = e.currentTarget.dataset.route;
    if (route === 'schedule') return this.openScheduleModal();
    if (route === 'shops') return wx.navigateTo({ url: '/pages/technician/shop-management/index' });
    wx.navigateTo({ url: '/pages/technician/services/index' });
  },

  async toggleAccepting() {
    const userInfo = this.data.userInfo || {};
    if (userInfo.status === 'active') {
      try {
        const updated = await api.technician.auth.updateStatus('inactive');
        const next = { ...userInfo, ...updated };
        wx.setStorageSync('userInfo', next);
        wx.setStorageSync('technician_userInfo', next);
        this.setData({ userInfo: next, isAccepting: false });
        wx.showToast({ title: '已暂停接单', icon: 'success' });
      } catch (err) {
        wx.showToast({ title: err.message || '操作失败', icon: 'none' });
      }
      return;
    }
    if (!this.data.canAcceptOrders) {
      const firstIncomplete = this.data.setupSteps.find((item) => !item.done);
      wx.showModal({
        title: '请先完成接单设置',
        content: '需要完善服务与定价、到店门店和可预约时间后才能开启接单。',
        confirmText: '去完善',
        success: (res) => {
          if (res.confirm && firstIncomplete) {
            this.goSetupStep({ currentTarget: { dataset: { route: firstIncomplete.route } } });
          }
        }
      });
      return;
    }
    try {
      const updated = await api.technician.auth.updateStatus('active');
      const next = { ...userInfo, ...updated };
      wx.setStorageSync('userInfo', next);
      wx.setStorageSync('technician_userInfo', next);
      this.setData({ userInfo: next });
      this.computeAccepting();
      wx.showToast({ title: '已开启接单', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '尚未满足接单条件', icon: 'none' });
    }
  },

  // 根据工作时间方案和休息日自动判断接单状态
  // 前置条件：必须开启上门服务或到店服务
  // 无生效方案 → 24小时全程接单（仅受其他预约占用限制）
  computeAccepting() {
    const userInfo = this.data.userInfo || {};
    // 未开启任何服务类型，无法接单
    if (!this.data.canAcceptOrders) {
      this.setData({ isAccepting: false });
      return;
    }
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
    // 检查当前时间是否在工作时间范围内
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTimeStr = String(currentHour).padStart(2, '0') + ':' + String(currentMin).padStart(2, '0');
    if (currentTimeStr >= active.startTime && currentTimeStr < active.endTime) {
      this.setData({ isAccepting: true });
    } else {
      this.setData({ isAccepting: false });
    }
  },

  // ---------- 统计 ----------
  async loadStats() {
    if (this._statsLoading) return;
    this._statsLoading = true;
    try {
      const overview = await api.technician.insights.overview().catch(() => null);
      if (overview) {
        const byStatus = overview.bookings.byStatus || {};
        this.setData({
          stats: {
            todayOrders: overview.bookings.today || 0,
            monthOrders: overview.bookings.monthCompleted || 0,
            pendingTotal: overview.bookings.pending || 0,
            customers: overview.customers.total || 0,
            newCustomers: overview.customers.newThisMonth || 0,
            works: overview.works.total || 0,
            monthlyRevenue: `¥${Number(overview.revenue.monthConfirmed || 0).toFixed(0)}`,
            averageTicket: overview.revenue.averageTicket == null
              ? '待积累'
              : `¥${Number(overview.revenue.averageTicket).toFixed(0)}`,
            repeatRate: overview.customers.repeatRate == null
              ? '待积累'
              : `${(Number(overview.customers.repeatRate) * 100).toFixed(0)}%`,
            rating: overview.rating.average == null
              ? '待积累'
              : Number(overview.rating.average).toFixed(1)
          },
          orderShortcuts: ORDER_SHORTCUTS.map((item) => ({
            ...item,
            count: byStatus[item.status] || 0
          }))
        });
        return;
      }

      const [ordersRes, customersRes, worksRes] = await Promise.all([
        api.technician.orders.list({}).catch(() => []),
        api.technician.customers.list({}).catch(() => []),
        api.technician.works.list().catch(() => [])
      ]);

      const orders    = Array.isArray(ordersRes)    ? ordersRes    : (ordersRes.list    || ordersRes.data    || []);
      const customers = Array.isArray(customersRes) ? customersRes : (customersRes.list || customersRes.data || []);
      const works     = Array.isArray(worksRes)     ? worksRes     : (worksRes.list     || worksRes.data     || []);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let todayOrders = 0;
      let monthOrders = 0;
      let monthlyRevenue = 0;
      const ratings = [];
      const counts = {};

      orders.forEach((o) => {
        if (o.status) counts[o.status] = (counts[o.status] || 0) + 1;
        const t = parseDate(o.startTime);
        if (!t || o.status === 'cancelled') return;
        if (isSameDay(t, now)) todayOrders += 1;
        if (t >= monthStart) {
          monthOrders += 1;
          if (o.status === 'completed') monthlyRevenue += Number(o.revenue?.amount ?? o.quotePrice ?? 0);
        }
        if (o.review && Number(o.review.rating) > 0) ratings.push(Number(o.review.rating));
      });

      // 待处理：待报价 + 待我确认
      const pendingTotal = (counts.pending_quote || 0) + (counts.pending_confirm || 0);

      // 本月新客：以 createdAt 为准，无此字段则降级为 0
      const newCustomers = customers.filter((c) => {
        const t = parseDate(c.createdAt);
        return t && t >= monthStart;
      }).length;

      const orderShortcuts = ORDER_SHORTCUTS.map((s) => ({
        ...s,
        count: counts[s.status] || 0
      }));

      this.setData({
        stats: {
          todayOrders,
          monthOrders,
          pendingTotal,
          customers: customers.length,
          newCustomers,
          works: works.length,
          monthlyRevenue: `¥${monthlyRevenue.toFixed(0)}`,
          rating: ratings.length ? (ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1) : '待积累'
        },
        orderShortcuts
      });
    } finally {
      this._statsLoading = false;
    }
  },

  // ---------- 我的预约 ----------
  goAllOrders() {
    wx.navigateTo({ url: '/pages/technician/all-bookings/index' });
  },
  goTradeOrders() {
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
  goStatsPending() {
    wx.reLaunch({ url: '/pages/technician/orders/index?filter=pending' });
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
      path: u.id ? `/pages/client/works/index?techId=${u.id}&source=card` : (code ? `/pages/client/login/index?invite=${code}` : '/pages/login/index'),
      imageUrl: u.avatarUrl || ''
    };
  },

  // ---------- 引导入口 ----------
  goSetupShop() {
    wx.navigateTo({ url: '/pages/technician/shop-management/index?from=setup' });
  },

  // ---------- 工具 ----------
  onTool(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'homepage') {
      const user = this.data.userInfo || wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || {};
      if (!user.id) return wx.showToast({ title:'账号信息加载中', icon:'none' });
      return wx.navigateTo({ url:'/pages/client/artist-home/index?id=' + user.id + '&preview=1' });
    }
    if (key === 'serviceTime') return this.openScheduleModal();
    const url = TOOL_ROUTES[key];
    if (url) wx.navigateTo({ url });
  },

  // ---------- 服务类型引导弹窗（仅工作时间设置时触发） ----------
  openServiceTypeModal(tab) {
    this.setData({ showServiceTypeModal: true, serviceTypeTab: tab || 'shop' });
    this.loadServiceTypeConfig();
  },

  closeServiceTypeModal() {
    this.setData({ showServiceTypeModal: false, showShopForm: false, editingShop: null });
    this.applyUserInfo();
  },

  preventBubble() {},

  // ---- 加载服务类型配置（从 userInfo 读取） ----
  loadServiceTypeConfig() {
    const userInfo = this.data.userInfo || {};
    const shopAddresses = userInfo.shopAddresses || [];
    this.setData({
      shopList: shopAddresses
    });
  },

  // ---- 店铺快速配置 ----
  openShopForm(e) {
    const shop = e ? e.currentTarget.dataset.shop : null;
    this.setData({
      showShopForm: true,
      editingShop: shop,
      shopName: shop ? shop.name : '',
      shopAddress: shop ? (shop.detailAddress || shop.address || '') : '',
      shopPhone: shop ? (shop.phone || '') : ''
    });
  },

  closeShopForm() {
    this.setData({ showShopForm: false, editingShop: null });
  },

  onShopNameInput(e) { this.setData({ shopName: e.detail.value }); },
  onShopAddressInput(e) { this.setData({ shopAddress: e.detail.value }); },
  onShopPhoneInput(e) { this.setData({ shopPhone: e.detail.value }); },

  async saveShop() {
    if (this.data.shopSaving) return;
    const { shopName, shopAddress, shopPhone, editingShop, shopList } = this.data;
    if (!shopName.trim()) { wx.showToast({ title: '请输入店铺名称', icon: 'none' }); return; }
    if (!shopAddress.trim()) { wx.showToast({ title: '请输入地址', icon: 'none' }); return; }
    this.setData({ shopSaving: true });
    try {
      let newShops = [...shopList];
      if (editingShop) {
        // 编辑现有店铺
        newShops = newShops.map(s => {
          if (s.name === editingShop.name && s.detailAddress === editingShop.detailAddress) {
            return { ...s, name: shopName, detailAddress: shopAddress, phone: shopPhone };
          }
          return s;
        });
      } else {
        // 新增店铺
        const id = 'shop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        newShops.push({ id, name: shopName, detailAddress: shopAddress, phone: shopPhone, enabled: true });
      }
      await api.technician.auth.updateServiceType({
        shopService: true,
        shopAddresses: newShops
      });
      // 重新获取用户信息
      const res = await api.technician.auth.getUserInfo();
      const userInfo = { ...this.data.userInfo, ...res };
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('technician_userInfo', userInfo);
      this.setData({ shopSaving: false, showShopForm: false, userInfo });
      this.applyUserInfo();
      wx.showToast({ title: '店铺已保存', icon: 'success' });
    } catch (err) {
      this.setData({ shopSaving: false });
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  },

  deleteShop(e) {
    const { name, address } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除店铺',
      content: `确定删除"${name}"吗？`,
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const newShops = this.data.shopList.filter(s => !(s.name === name && (s.detailAddress || s.address) === address));
          await api.technician.auth.updateServiceType({
            shopService: newShops.length > 0,
            shopAddresses: newShops
          });
          // 重新获取用户信息
          const userRes = await api.technician.auth.getUserInfo();
          const userInfo = { ...this.data.userInfo, ...userRes };
          wx.setStorageSync('userInfo', userInfo);
          wx.setStorageSync('technician_userInfo', userInfo);
          this.setData({ userInfo });
          this.applyUserInfo();
          wx.showToast({ title: '已删除', icon: 'success' });
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      }
    });
  },

  // ---------- 工作时间设置 ----------
  openScheduleModal() {
    // 前置条件检查：必须开启到店服务
    if (!this.data.canAcceptOrders) {
      this.openServiceTypeModal('shop');
      return;
    }
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
      const updateData = { serviceSchedule: cleanSchedule };
      const res = await api.technician.auth.updateProfile(updateData);
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
    wx.reLaunch({ url: '/pages/login/index' });
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (!res.confirm) return;
        getApp().logout();
        wx.reLaunch({ url: '/pages/login/index' });
      }
    });
  }
});
