const api = require('../../../services/api');
const { requestBookingReminder } = require('../../../utils/wechat-subscription');
const { summarizeServices } = require('../../../utils/service-pricing');
const { buildClientLoginUrl } = require('../../../utils/artist-navigation');
const privacy = require('../../../utils/privacy');
const { evaluateBookingCity } = require('../../../utils/booking-location');
const DRAFT_KEY='client_booking_application_draft';

function selectionMap(ids) {
  return (ids || []).reduce(function (map, id) { map[id] = true; return map; }, {});
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function dateStr(y,m,d) { return y + '-' + pad2(m+1) + '-' + pad2(d); }
function formatAddr(a) { return [a.province,a.city,a.district,a.detailAddress || a.detail].filter(Boolean).join(' '); }

Page({
  data: {
    technicians: [],
    quickMode: false,
    referenceOnly: false,
    quickAvailable: false,
    needsBinding: false,
    presetLocked: false,
    selectedTechId: 0,
    selectedTech: null,
    bookingPaused: false,
    bookingReady: false,
    serviceType: '',
    availableServiceTypes: [],
    shopAddresses: [],
    selectedShopName: '',
    clientAddresses: [],
    serviceOptions: [],
    selectedServiceOptionKey: '',
    selectedClientAddressId: null,
    activeServiceItems: [],
    selectedServiceIds: [], selectedServiceMap: {},
    selectedServiceCount: 0,
    selectedServiceTotal: 0,
    selectedServiceDuration: 0,
    isCustomService: false,
    customTitle: '',
    customDesc: '',
    customImages: [],
    showWorkSelector: false,
    techWorks: [],
    selectedWorkIds: [],
    sourceWork: null,
    // Booking time
    serviceDate: '',
    startTime: '',
    // Misc
    remark: '',
    uploading: false,
    submitting: false,
    minDate: '',
    showApplicationReview: false,
    bookingRulesAgreed: false,
    // 绑定美甲师弹窗
    showBindTech: false,
    bindInviteCode: '',
    bindChecking: false,
    bindTechName: '',
    bindTechId: 0,
    bindError: '',
    locationStatus: 'locating', currentLocationCity: '', serviceLocationCity: '', cityMismatch: false,
    cityMismatchConfirmed: false, locationDistance: 0, locationInferred: false
  },

  onLoad: function (options) {
    this._pageActive = true;
    this._fullMode = options.mode === 'full' || !!options.design_id || !!options.serviceId;
    this.setData({ referenceOnly: options.reference === '1' });
    this._attributionSource = options.source === 'work_share' ? 'work_share' : '';
    var draft = wx.getStorageSync(DRAFT_KEY) || {};
    if ((options.techId && Number(options.techId) !== draft.selectedTechId) || (options.workId && Number(options.workId) !== draft.sourceWorkId)) draft = {};
    if (options.resume === '1' && !options.mode && !options.design_id && !options.serviceId) this._fullMode = !!draft.fullMode;
    this.applicationKey = draft.applicationKey || ('booking-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
    var today = new Date();
    var minDate = dateStr(today.getFullYear(), today.getMonth(), today.getDate());
    var defaultDate = minDate;
    this.setData({
      minDate: minDate,
      serviceDate: defaultDate,
      remark: draft.remark || ''
    });
    this._bookingDraft = draft;
    if (this.isClientLoggedIn()) this.loadClientAddresses();
    if (options.resume === '1') this._attributionSource = draft.attributionSource || this._attributionSource;
    // 从聊天「快速发起预约」进入：锁定美甲师为对话对象
    var presetTechId = options.techId || options.tech_id;
    if (presetTechId) {
      this._presetTechId = parseInt(presetTechId);
      this.setData({ presetLocked:true });
    }
    this._resumeDraft = options.resume === '1';
    this.loadTechnicians();
    this.requestCurrentLocation();
    if (options.design_id) this.loadDesign(options.design_id);
    // 从作品详情「预约同款」进入：以该作品作为预约服务内容
    if (options.workId || (options.resume === '1' && !options.design_id && draft.sourceWorkId)) {
      this.sourceShareToken = options.shareToken || draft.sourceShareToken || '';
      this.setData({ referenceOnly: options.reference === '1' || !!draft.referenceOnly });
      this.loadWork(Number(options.workId || draft.sourceWorkId));
    }
  },

  requestCurrentLocation: async function () {
    if (this._locating) return;
    this._locating = true;
    this.setData({ locationStatus: 'locating' });
    try {
      await privacy.requireWechatPrivacyAuthorization();
      const location = await new Promise(function (resolve, reject) {
        wx.getLocation({ type: 'gcj02', isHighAccuracy: true, success: resolve, fail: reject });
      });
      this._currentLocation = location;
      this.setData({ locationStatus: 'ready' });
      this.updateBookingCityCheck();
    } catch (err) {
      this.setData({ locationStatus: 'failed', cityMismatch: false, cityMismatchConfirmed: false });
    } finally {
      this._locating = false;
    }
  },

  updateBookingCityCheck: function () {
    if (!this._currentLocation || !this.data.selectedTech) return;
    const result = evaluateBookingCity(this._currentLocation, this.data.selectedTech);
    this.setData({
      currentLocationCity: result.currentCity,
      serviceLocationCity: result.serviceCity,
      cityMismatch: result.mismatch,
      cityMismatchConfirmed: false,
      locationDistance: result.distance,
      locationInferred: result.inferred
    });
  },

  confirmCityMismatchBeforeSubmit: async function () {
    var d = this.data;
    if (!d.cityMismatch || d.cityMismatchConfirmed) return true;
    var locationLabel = d.currentLocationCity
      ? '你当前位于' + d.currentLocationCity
      : '你当前位置距服务地点约 ' + d.locationDistance + ' 公里';
    var serviceLabel = d.serviceLocationCity ? '，美甲师服务城市为' + d.serviceLocationCity : '';
    var result = await wx.showModal({
      title: '当前城市与服务城市不一致',
      content: locationLabel + serviceLabel + '。跨城前往可能影响预约，请确认行程无误后再继续。',
      cancelText: '返回检查',
      confirmText: '仍要预约'
    });
    if (!result.confirm) return false;
    this.setData({ cityMismatchConfirmed: true });
    return true;
  },

  onShow: function () {
    this._pageActive = true;
    if (this._hasShown && this.isClientLoggedIn()) this.loadClientAddresses();
    this._hasShown = true;
    if (this._submittedWhileHidden) {
      this._submittedWhileHidden = false;
      wx.reLaunch({ url: '/pages/client/orders/index' });
      return;
    }
    if (this._submitFinishedWhileHidden) {
      this.setData({ submitting: false });
      this._submitFinishedWhileHidden = false;
    }
    if (this._uploadFinishedWhileHidden) {
      this.setData({ uploading: false });
      this._uploadFinishedWhileHidden = false;
    }
  },
  onHide: function () { this._pageActive = false; this.saveDraft(); },
  onUnload: function () {
    this._pageActive = false;
    if (this._navTimer) clearTimeout(this._navTimer);
  },

  isClientLoggedIn: function () {
    const app = getApp();
    return (wx.getStorageSync('role') || app.globalData.role) === 'client' && !!(wx.getStorageSync('client_token') || app.globalData.token);
  },
  requireClientLogin: function () {
    if (this.isClientLoggedIn()) return true;
    this.saveDraft();
    const path = '/pages/client/create-order/index?techId=' + this.data.selectedTechId + '&resume=1&mode=' + (this._fullMode ? 'full' : 'quick');
    wx.navigateTo({ url: buildClientLoginUrl(path, { source: 'quick_booking' }) });
    return false;
  },
  useFullBooking: function () {
    this._fullMode = true;
    this.setData({ quickMode: false, referenceOnly: false, presetLocked: !!this._presetTechId, isCustomService: !this.data.activeServiceItems.length });
  },
  clearQuickWork: function () {
    this._workRequestId = (this._workRequestId || 0) + 1;
    this.sourceWorkId = null; this.sourceShareToken = ''; this._pendingWorkPrefill = null;
    this._sourceLoading = false; this._sourceFailed = false;
    this.setData({ sourceWork: null, selectedWorkIds: [], referenceOnly: false, customTitle: '', customDesc: '', customImages: [], selectedServiceDuration: 0, selectedServiceCount: 0, selectedServiceTotal: 0, startTime: '' });
  },
  toggleReferenceOnly: function () {
    if (!this.data.quickMode || !this.data.sourceWork) return;
    const referenceOnly = !this.data.referenceOnly || !this.data.sourceWork.pricingReady;
    this.setData({ referenceOnly: referenceOnly, selectedServiceDuration: referenceOnly ? 0 : this.data.sourceWork.totalDurationMinutes, startTime: '' });
  },

  // ── 数据加载 ─────────────────────────────

  loadPublicTechnician: function () {
    return api.public.artists.detail(this._presetTechId).then(result => {
      const artist = result.artist || result;
      const tech = { ...artist, status: artist.acceptingBookings ? 'active' : 'inactive', serviceItems: artist.serviceItems || [], shopService: !!artist.shopService, homeService: !!artist.homeService };
      this.setData({ technicians: [tech], needsBinding: true });
      this.selectTechById(tech.id);
      this.restoreDraft();
      if (this._pendingWorkPrefill) this.applyWorkPrefill();
    }).catch(err => wx.showToast({ title: err.message || '美甲师加载失败', icon: 'none' }));
  },
  loadTechnicians: function () {
    var self = this;
    if (!this.isClientLoggedIn() && this._presetTechId) { this.loadPublicTechnician(); return; }
    api.auth.getUserInfo('client').then(function (res) {
      var bindings = res.bindings || wx.getStorageSync('client_bindings') || [];
      var techs = bindings.map(function (b) {
        var t = b.technician || b;
        return {
          id: t.id, name: t.name, avatarUrl: t.avatarUrl, city: t.city,
          status: t.status, shopService: t.shopService, homeService: t.homeService,
          shopAddresses: (t.shopAddresses || []).filter(function (sa) { return sa.enabled !== false; }),
          serviceItems: (t.serviceItems || []).filter(function (si) { return si.isActive; }),
          serviceSchedule: t.serviceSchedule || null,
          isDefault: b.isDefault || false
        };
      }).filter(function (t) { return t.status === 'active' || t.status === 'inactive'; });
      self.setData({ technicians: techs, needsBinding: false });
      if (self._presetTechId && !techs.some(t => t.id === self._presetTechId) && !self._fullMode) {
        self.loadPublicTechnician(); return;
      }


      // 无绑定美甲师 → 强制弹出绑定弹窗
      if (techs.length === 0) {
        self.setData({ showBindTech: true });
        return;
      }

      // 优先锁定快速预约带入的美甲师；否则仅一个时默认选中
      if (self._presetTechId && techs.some(function (t) { return t.id === self._presetTechId; })) {
        self.selectTechById(self._presetTechId);
      } else if (self._presetTechId) {
        self.setData({ showBindTech:true, presetLocked:false });
      } else if (techs.length === 1) {
        self.selectTechById(techs[0].id);
      }
      if (self._resumeDraft || self._presetTechId || techs.length === 1) self.restoreDraft();
      // 作品预填：美甲师加载完成后应用
      if (self._pendingWorkPrefill) self.applyWorkPrefill();
    }).catch(function (e) { console.error(e); });
  },

  loadClientAddresses: function () {
    var self = this;
    if (!api.client || !api.client.addresses || !api.client.addresses.list) return Promise.resolve();
    return api.client.addresses.list().then(function (res) {
      var addresses = res.list || res.data || res || [];
      self.setData({ clientAddresses: addresses });
      if (self.data.selectedTech) self.refreshServiceOptions(self.data.selectedTech, true);
    }).catch(function () {
      self.setData({ clientAddresses: [] });
      if (self.data.selectedTech) self.refreshServiceOptions(self.data.selectedTech, true);
    });
  },

  viewArtist: function (e) {
    var id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/client/artist-home/index?id=' + id });
  },

  loadDesign: function (designId) {
    var self = this;
    api.client.designs.detail(designId).then(function (d) {
      self._sourceDesign = { id: Number(designId), status: d.status };
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
    var requestId = this._workRequestId = (this._workRequestId || 0) + 1;
    this._sourceLoading = true;
    this._sourceFailed = false;
    var request = self.sourceShareToken
      ? api.public.works.shared(self.sourceShareToken)
      : (this.isClientLoggedIn() ? api.client.works.detail(workId) : api.public.works.detail(workId));
    request.then(function (w) {
      if (requestId !== self._workRequestId) return;
      if (Number(w.id) !== Number(workId)) throw new Error('分享作品与预约来源不一致');
      var techId = w.technicianId || (w.technician && w.technician.id) || 0;
      var images = (w.imageUrls && w.imageUrls.length)
        ? w.imageUrls.slice(0, 9)
        : (w.coverUrl ? [w.coverUrl] : []);
      self._pendingWorkPrefill = {
        sourceWorkId: w.id,
        techId: techId,
        customTitle: w.title || '同款美甲',
        customDesc: w.description || '',
        customImages: images,
        serviceLines: Array.isArray(w.serviceLines) ? w.serviceLines : [],
        serviceSubtotalFen: Number(w.serviceSubtotalFen || 0),
        standardPriceFen: Number.isFinite(Number(w.standardPriceFen)) ? Number(w.standardPriceFen) : 0,
        totalDurationMinutes: Number(w.totalDurationMinutes || 0)
      };
      self._pendingWorkPrefill.pricingReady =
        self._pendingWorkPrefill.standardPriceFen > 0 &&
        self._pendingWorkPrefill.serviceLines.length > 0 &&
        self._pendingWorkPrefill.totalDurationMinutes > 0;
      self._pendingWorkPrefill.priceDifferenceFen =
        self._pendingWorkPrefill.standardPriceFen - self._pendingWorkPrefill.serviceSubtotalFen;
      if (techId) self._presetTechId = techId;
      // 美甲师已加载则立即应用，否则等 loadTechnicians 完成后应用
      if (self.data.technicians.length > 0) self.applyWorkPrefill();
    }).catch(function (e) {
      if (requestId !== self._workRequestId) return;
      self._sourceFailed = true;
      console.error('loadWork', e);
      wx.showToast({ title: e.message || '请先绑定该美甲师后预约同款', icon: 'none' });
    }).finally(function () { if (requestId === self._workRequestId) self._sourceLoading = false; });
  },

  viewSourceWork: function () {
    if (!this.sourceWorkId) return;
    var page = this.isClientLoggedIn() ? 'work-detail' : 'public-work';
    wx.navigateTo({ url: '/pages/client/' + page + '/index?id=' + this.sourceWorkId + (this.sourceShareToken ? '&shareToken=' + encodeURIComponent(this.sourceShareToken) : '') });
  },

  applyWorkPrefill: function () {
    var pf = this._pendingWorkPrefill;
    if (!pf) return;
    // 先选中美甲师（会重置自定义字段），再写入作品内容
    if (pf.techId && this.data.selectedTechId !== pf.techId) {
      this.selectTechById(pf.techId);
    }
    this.setData({
      presetLocked: true,
      isCustomService: false,
      customTitle: pf.customTitle,
      customDesc: pf.customDesc,
      customImages: pf.customImages,
      sourceWork: pf,
        selectedServiceTotal: Number(pf.standardPriceFen || 0) / 100,
      selectedServiceDuration: this.data.referenceOnly ? 0 : pf.totalDurationMinutes,
      referenceOnly: this.data.referenceOnly || (this.data.quickMode && !pf.pricingReady),
      selectedServiceCount: (pf.serviceLines || []).length
    });
    this.sourceWorkId = pf.sourceWorkId;
    this._pendingWorkPrefill = null;
  },

  loadTechWorks: function (techId) {
    var self = this;
    (this.isClientLoggedIn() ? api.client.works.list({ techId: techId }) : api.public.works.list({ techId: techId })).then(function (res) {
      var works = (res.list || res.data || res || []).filter(function (w) {
        return w.technicianId === techId || (w.technician && w.technician.id === techId);
      });
      self.setData({ techWorks: works });
    }).catch(function () { self.setData({ techWorks: [] }); });
  },


  // ── 选择美甲师 ──────────────────────────

  selectTechById: function (id) {
    this.selectTech({ currentTarget: { dataset: { id: id } } });
  },

  onSelectTechnician: function (e) {
    if (this.data.presetLocked || this.data.selectedTechId === e.currentTarget.dataset.id) return;
    this.selectTech(e);
  },

  selectTech: function (e) {
    var id = e.currentTarget.dataset.id;
    var tech = this.data.technicians.find(function (t) { return t.id === id; });
    if (!tech) return;
    this._serviceOptionTouched = false;
    this.sourceWorkId = null;
    var shopAddrs = (tech.shopAddresses || []).filter(function (shop) { return shop.enabled !== false; });
    var serviceItems = (tech.serviceItems || []).filter(function (item) {
      return item.isActive !== false && Number.isFinite(Number(item.price)) && Number(item.durationMinutes) > 0;
    });
    this.setData({
      selectedTechId: id, selectedTech: tech, sourceWork: null,
      bookingReady: false, bookingPaused: tech.status === 'inactive',
      serviceType: '', availableServiceTypes: [],
      shopAddresses: shopAddrs, selectedShopName: '',
      serviceOptions: [], selectedServiceOptionKey: '', selectedClientAddressId: null,
      activeServiceItems: serviceItems,
      selectedServiceIds: [], selectedServiceMap: {}, selectedWorkIds: [],
      selectedServiceCount: 0, selectedServiceTotal: 0, selectedServiceDuration: 0,
      // 美甲师无服务项目时自动切换到自定义需求模式
      isCustomService: serviceItems.length === 0,
      startTime: ''
    });
    this.refreshServiceOptions(tech, false);
    this.updateBookingCityCheck();
    this.setData({ quickMode: false, quickAvailable: false });
    if (api.public.bookingSettings) api.public.bookingSettings(id).then(settings => {
      if (this.data.selectedTechId !== id) return;
      const quick = settings.quickBookingEnabled && !this._fullMode;
      this.setData({ quickAvailable: !!settings.quickBookingEnabled, quickMode: !!quick,
        ...(quick ? { presetLocked: true, isCustomService: true } : {}) });
      if (quick && this.data.sourceWork && !this.data.sourceWork.pricingReady) this.setData({ referenceOnly: true, selectedServiceDuration: 0 });
    }).catch(() => {});
    this.loadTechWorks(id);
    // booking-time-picker 组件通过 techId observer 自动加载排班和占用数据
  },

  onBookingAvailability: function (e) {
    if (this.data.bookingReady !== e.detail.ready || this.data.bookingPaused !== e.detail.paused) {
      this.setData({ bookingReady: e.detail.ready, bookingPaused: e.detail.paused });
    }
  },

  contactSelectedTech: function () {
    var tech = this.data.selectedTech;
    if (tech) wx.navigateTo({ url: '/pages/client/chat-detail/index?techId=' + tech.id + '&techName=' + encodeURIComponent(tech.name || '') });
  },

  checkBookingAvailability: function () {
    if (this.data.bookingPaused) {
      wx.showToast({ title: '美甲师已关闭预约，请先联系沟通', icon: 'none' });
      return false;
    }
    if (!this.data.bookingReady) {
      wx.showToast({ title: '请等待预约信息加载完成', icon: 'none' });
      return false;
    }
    return true;
  },

  onBookingTimeChange: function (e) {
    var detail = e.detail;
    if (this.data.serviceDate !== detail.serviceDate || this.data.startTime !== detail.startTime) {
      this.setData({ serviceDate: detail.serviceDate, startTime: detail.startTime });
    }
  },

  // ── 服务类型 ─────────────────────────────

  refreshServiceOptions: function (tech, preserveSelection) {
    var shops = tech.shopService ? (tech.shopAddresses || []).filter(function (shop) { return shop.enabled !== false; }) : [];
    var options = shops.map(function (shop, index) {
      return {
        key: 'shop:' + index + ':' + (shop.name || ''), type: '到店美甲', shopIndex: index,
        title: '到店美甲 · ' + (shop.name || '门店'),
        detail: formatAddr(shop), guidance: shop.guidance
      };
    });
    if (tech.homeService) {
      options = options.concat(this.data.clientAddresses.map(function (address) {
        return {
          key: 'home:' + address.id, type: '上门美甲', addressId: address.id,
          title: '上门美甲' + (address.isDefault ? ' · 默认地址' : ''),
          detail: formatAddr(address) + (address.doorInfo ? ' ' + address.doorInfo : ''),
          contact: [address.contactName, address.contactPhone].filter(Boolean).join(' ')
        };
      }));
    }
    var selectedKey = preserveSelection ? this.data.selectedServiceOptionKey : '';
    var draftOption = null;
    if (preserveSelection && this._bookingDraft) {
      var draft = this._bookingDraft;
      draftOption = options.find(function (item) {
        return item.key === draft.selectedServiceOptionKey ||
          (item.type === '到店美甲' && item.title === '到店美甲 · ' + draft.selectedShopName) ||
          (item.type === '上门美甲' && String(item.addressId) === String(draft.selectedClientAddressId));
      });
      if (!selectedKey && draftOption) selectedKey = draftOption.key;
    }
    if (options.length > 1 && !this._serviceOptionTouched && !draftOption) selectedKey = '';
    if (!options.some(function (item) { return item.key === selectedKey; })) selectedKey = options.length === 1 ? options[0].key : '';
    var selected = options.find(function (item) { return item.key === selectedKey; });
    var types = [];
    options.forEach(function (item) {
      if (!types.some(function (type) { return type.value === item.type; })) types.push({ value: item.type, label: item.type });
    });
    this.setData({
      serviceOptions: options, availableServiceTypes: types,
      selectedServiceOptionKey: selectedKey,
      serviceType: selected ? selected.type : '',
      selectedShopName: selected && selected.type === '到店美甲' ? shops[selected.shopIndex].name : '',
      selectedClientAddressId: selected && selected.type === '上门美甲' ? selected.addressId : null
    });
  },

  selectServiceOption: function (e) {
    var key = e.detail.value;
    var option = this.data.serviceOptions.find(function (item) { return item.key === key; });
    if (!option || key === this.data.selectedServiceOptionKey) return;
    this._serviceOptionTouched = true;
    var shop = option.type === '到店美甲' ? this.data.shopAddresses[option.shopIndex] : null;
    this.setData({
      selectedServiceOptionKey: key,
      serviceType: option.type,
      selectedShopName: shop ? shop.name : '',
      selectedClientAddressId: option.type === '上门美甲' ? option.addressId : null,
      startTime: ''
    });
  },

  selectServiceType: function (e) {
    var value = e.currentTarget.dataset.value;
    if (value === this.data.serviceType || !this.data.availableServiceTypes.some(function (type) { return type.value === value; })) return;
    this.setData({ serviceType: value, startTime: '' });
  },

  selectShopAddress: function (e) {
    var name = e.currentTarget.dataset.name;
    if (name === this.data.selectedShopName || !this.data.shopAddresses.some(function (shop) { return shop.name === name; })) return;
    this.setData({ serviceType: '到店美甲', selectedShopName: name, startTime: '' });
    // booking-time-picker 组件通过 shopName 属性变化自动刷新
  },

  openShopGuidance: function (e) {
    var shop = this.data.shopAddresses[parseInt(e.currentTarget.dataset.idx)];
    if (!shop || !this.data.selectedTechId) return;
    var address = [shop.province, shop.city, shop.district, shop.detailAddress].filter(Boolean).join('');
    wx.navigateTo({ url: '/pages/client/shop-guidance/index?techId=' + this.data.selectedTechId + '&shopName=' + encodeURIComponent(shop.name || '') + '&address=' + encodeURIComponent(address) });
  },

  openAddressManager: function () {
    wx.navigateTo({ url: '/pages/client/addresses/index' });
  },

  // ── 自定义 / 标准服务切换 ──────────────

  switchContentMode: function (e) {
    if (this.sourceWorkId) return;
    var mode = e.currentTarget.dataset.mode;
    if (mode === 'standard') this.sourceWorkId = null;
    this.setData({
      isCustomService: mode === 'custom',
      selectedServiceIds: [], selectedServiceMap: {},
      selectedServiceCount: 0,
      selectedServiceTotal: 0,
      selectedServiceDuration: 0
    });
  },

  toggleService: function (e) {
    if (this.data.sourceWork) return;
    var id = e.currentTarget.dataset.id;
    var ids = this.data.selectedServiceIds.slice();
    var idx = ids.indexOf(id);
    if (idx >= 0) ids.splice(idx, 1); else ids.push(id);
    var summary = summarizeServices(this.data.activeServiceItems, ids);
    this.setData({
      selectedServiceIds: ids, selectedServiceMap: selectionMap(ids),
      selectedServiceCount: summary.count,
      selectedServiceTotal: summary.totalPrice,
      selectedServiceDuration: summary.totalDurationMinutes
    });
  },

  onCustomTitleInput: function (e) { this.setData({ customTitle: e.detail.value }); },
  onCustomDescInput: function (e) { this.setData({ customDesc: e.detail.value }); },

  chooseImage: function () {
    if (this.data.quickMode && !this.requireClientLogin()) return;
    var self = this;
    if (self.data.uploading) return;
    var remaining = 3 - self.data.customImages.length;
    if (remaining <= 0) return;
    wx.chooseMedia({
      count: remaining, mediaType: ['image'],
      success: function (res) {
        self.setData({ uploading: true });
        Promise.all(res.tempFiles.map(function (f) { return api.upload.image(f.tempFilePath); }))
          .then(function (results) {
            if (!self._pageActive) { self._uploadFinishedWhileHidden = true; return; }
            self.setData({ customImages: self.data.customImages.concat(results.map(function (r) { return r.url; })), uploading: false });
          })
          .catch(function () {
            if (!self._pageActive) { self._uploadFinishedWhileHidden = true; return; }
            wx.showToast({ title: '上传失败', icon: 'none' }); self.setData({ uploading: false });
          });
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
    if (this.data.quickMode) { this.setData({ selectedWorkIds: [id], showWorkSelector: false, referenceOnly: false }); this.loadWork(id); return; }
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

  // ── 备注 ─────────────────────────────────

  onRemarkInput: function (e) { this.setData({ remark: e.detail.value }); },

  // ── 提交 ─────────────────────────────────

  saveDraft: function () {
    var d = this.data;
    if (!this.applicationKey) return;
    wx.setStorageSync(DRAFT_KEY, {
      applicationKey: this.applicationKey,
      fullMode: !!this._fullMode,
      sourceWorkId: this.sourceWorkId || null,
      sourceShareToken: this.sourceShareToken || '',
      attributionSource: this._attributionSource || '',
      referenceOnly: this.data.referenceOnly,
      selectedTechId: d.selectedTechId,
      serviceType: d.serviceType,
      selectedShopName: d.selectedShopName,
      selectedServiceOptionKey: d.selectedServiceOptionKey,
      selectedClientAddressId: d.selectedClientAddressId,
      selectedServiceIds: d.selectedServiceIds,
      isCustomService: d.isCustomService,
      customTitle: d.customTitle,
      customDesc: d.customDesc,
      customImages: d.customImages,
      serviceDate: d.serviceDate,
      startTime: d.startTime,
      remark: d.remark
    });
  },

  restoreDraft: function () {
    var draft = this._bookingDraft;
    if (!draft || this._draftRestored || !this.data.technicians.length) return;
    this._draftRestored = true;
    if (draft.selectedTechId && (!this._presetTechId || this._presetTechId === draft.selectedTechId) && this.data.technicians.some(function (item) { return item.id === draft.selectedTechId; })) {
      this.selectTechById(draft.selectedTechId);
      var restoredOption = this.data.serviceOptions.find(function (item) {
        return item.key === draft.selectedServiceOptionKey ||
          (item.type === '到店美甲' && item.title === '到店美甲 · ' + draft.selectedShopName) ||
          (item.type === '上门美甲' && String(item.addressId) === String(draft.selectedClientAddressId));
      });
      if (restoredOption) this._serviceOptionTouched = true;
      this.setData({
        serviceType: restoredOption ? restoredOption.type : this.data.serviceType,
        selectedServiceOptionKey: restoredOption ? restoredOption.key : this.data.selectedServiceOptionKey,
        selectedShopName: restoredOption && restoredOption.type === '到店美甲' ? draft.selectedShopName : this.data.selectedShopName,
        selectedClientAddressId: restoredOption && restoredOption.type === '上门美甲' ? restoredOption.addressId : this.data.selectedClientAddressId,
        selectedServiceIds: draft.selectedServiceIds || [],
        selectedServiceMap: selectionMap(draft.selectedServiceIds),
        isCustomService: Boolean(draft.isCustomService),
        customTitle: draft.customTitle || '',
        customDesc: draft.customDesc || '',
        customImages: draft.customImages || [],
        serviceDate: this._resumeDraft ? (draft.serviceDate || this.data.serviceDate) : this.data.serviceDate,
        startTime: this._resumeDraft ? (draft.startTime || '') : '',
        remark: draft.remark || ''
      });
      var summary = summarizeServices(this.data.activeServiceItems, draft.selectedServiceIds || []);
      this.setData({
        selectedServiceCount: summary.count,
        selectedServiceTotal: summary.totalPrice,
        selectedServiceDuration: summary.totalDurationMinutes
      });
    }
  },

  handleSubmit: async function () {
    var d = this.data;
    if (d.submitting) return;
    if (this._sourceLoading || this._sourceFailed) { wx.showToast({ title: '请等待作品加载成功后再提交', icon: 'none' }); return; }
    if (!d.selectedTechId) { wx.showToast({ title: '请选择美甲师', icon: 'none' }); return; }
    if (!this.checkBookingAvailability()) return;
    if (!d.serviceType) { wx.showToast({ title: '请选择服务类型', icon: 'none' }); return; }
    if (!d.serviceDate) { wx.showToast({ title: '请选择日期', icon: 'none' }); return; }
    if (!d.startTime) { wx.showToast({ title: '请选择时间', icon: 'none' }); return; }
    if (d.serviceType === '到店美甲' && !d.selectedShopName) { wx.showToast({ title: '请选择门店', icon: 'none' }); return; }
    if (d.serviceType === '上门美甲' && !d.selectedClientAddressId) { wx.showToast({ title: '请选择上门地址', icon: 'none' }); return; }
    if (!d.quickMode && !this.sourceWorkId && d.isCustomService && !d.customTitle.trim()) { wx.showToast({ title: '请输入服务名称', icon: 'none' }); return; }
    if (!d.quickMode && !this.sourceWorkId && !d.isCustomService && d.selectedServiceIds.length === 0) { wx.showToast({ title: '请选择服务内容', icon: 'none' }); return; }
    if (this.sourceWorkId && (!d.sourceWork || (!d.sourceWork.pricingReady && !d.quickMode))) { wx.showToast({ title: '该作品尚未完善服务与标准报价', icon: 'none' }); return; }
    if (!(await this.confirmCityMismatchBeforeSubmit())) return;

    this.saveDraft();
    if (d.quickMode) { this.doSubmit(); return; }
    this.setData({ showApplicationReview: true, bookingRulesAgreed: false });
  },

  toggleBookingRules: function () {
    this.setData({ bookingRulesAgreed: !this.data.bookingRulesAgreed });
  },

  // 弹窗内部点击只处理自身操作，不传递给遮罩层的关闭事件。
  preventModalClose: function () {},

  cancelApplicationReview: function () {
    this.setData({ showApplicationReview: false });
  },

  confirmApplicationReview: async function () {
    if (!this.data.bookingRulesAgreed) {
      wx.showToast({ title: '请先确认预约申请规则', icon: 'none' });
      return;
    }
    await requestBookingReminder('client');
    this.setData({ showApplicationReview: false });
    this.doSubmit();
  },

  doSubmit: async function () {
    var self = this;
    var d = self.data;
    if (d.quickMode && !this.requireClientLogin()) return;
    if (d.quickMode && d.needsBinding) {
      if (d.submitting) return;
      this.setData({ submitting: true });
      try {
        if (!this.sourceWorkId) {
          this.setData({ showBindTech: true, bindInviteCode: (d.selectedTech || {}).invitationCode || '', bindTechId: d.selectedTechId, bindTechName: (d.selectedTech || {}).name || '' });
          return;
        }
        const consent = await wx.showModal({ title: '预约' + (d.selectedTech.name || '美甲师'), content: '继续后将绑定这位美甲师并提交预约申请，已有其他绑定不会改变。', confirmText: '确认并提交' });
        if (!consent.confirm) return;
        await api.client.profile.bindSharedWork(this.sourceWorkId, this.sourceShareToken);
        this.setData({ needsBinding: false });
      } catch (err) { wx.showToast({ title: err.message || '绑定失败，请重试', icon: 'none' }); return; }
      finally { this.setData({ submitting: false }); }
    }
    if (d.submitting || !this.checkBookingAvailability() || !d.startTime) return;
    self.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    var payload = {
      applicationKey:self.applicationKey,
      techId: d.selectedTechId,
      serviceDate: d.serviceDate,
      startTime: d.startTime,
      serviceType: d.serviceType,
      remark: d.remark || undefined
    };
    if (d.quickMode && (!self.sourceWorkId || d.referenceOnly)) payload.quickBooking = true;
    if (d.quickMode && d.referenceOnly && self.sourceWorkId) payload.referenceOnly = true;
    if (self.sourceWorkId) payload.sourceWorkId = self.sourceWorkId;
    if (self.sourceWorkId && self._attributionSource) payload.attributionSource = self._attributionSource;
    if (self.sourceWorkId && self.sourceShareToken) payload.sourceShareToken = self.sourceShareToken;
    if (d.serviceType === '到店美甲') {
      var shop = d.shopAddresses.find(function (s) { return s.name === d.selectedShopName; });
      if (shop) payload.shopAddress = shop;
    }
    if (d.serviceType === '上门美甲') payload.addressId = d.selectedClientAddressId;
    if (self.sourceWorkId) {
      // 作品预约的服务与价格均由后端按作品快照生成。
    } else if (d.isCustomService || d.quickMode) {
      payload.customTitle = d.customTitle.trim();
      if (d.customDesc.trim()) payload.customDescription = d.customDesc.trim();
      if (d.customImages.length > 0) payload.customImages = d.customImages;
    } else {
      payload.selectedServiceIds = d.selectedServiceIds;
    }

    var request = self._sourceDesign && self._sourceDesign.status === 'accepted'
      ? api.client.orders.createFromDesign({
          applicationKey:self.applicationKey,
          designId: self._sourceDesign.id,
          techId: payload.techId,
          serviceDate: payload.serviceDate,
          startTime: payload.startTime,
          serviceType: payload.serviceType,
          shopAddress: payload.shopAddress,
          addressId: payload.addressId
        })
      : api.client.orders.create(payload);
    request.then(function () {
      wx.hideLoading();
      if (!self._pageActive) { self._submittedWhileHidden = true; return; }
      wx.removeStorageSync(DRAFT_KEY);
      self.applicationKey = '';
      wx.showToast({ title: '申请已提交', icon: 'success' });
      self._navTimer = setTimeout(function () { if (self._pageActive) wx.reLaunch({ url: '/pages/client/orders/index' }); }, 1200);
    }).catch(function (err) {
      wx.hideLoading();
      if (!self._pageActive) { self._submitFinishedWhileHidden = true; return; }
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }).finally(function () {
      if (self._pageActive) self.setData({ submitting: false });
      else if (!self._submittedWhileHidden) self._submitFinishedWhileHidden = true;
    });
  },

  // ── 绑定美甲师弹窗 ─────────────────────────────

  onBindInviteInput: function (e) {
    var raw = (e.detail.value || '').trim();
    this.setData({ bindInviteCode: raw, bindError: '', bindTechName: '' });
    // 自动解析邀请链接
    var code = raw;
    if (/^https?:\/\//i.test(raw)) {
      var match = raw.match(/[?&/](?:invite|code|referral)[=/#]([A-Za-z0-9_-]+)/i);
      if (match) code = match[1];
      else { var parts = raw.replace(/\/+$/, '').split('/'); code = parts[parts.length - 1]; }
      this.setData({ bindInviteCode: code });
    }
    if (code.length >= 4) this._debounceCheckBindTech(code);
  },

  _bindCheckTimer: null,
  _debounceCheckBindTech: function (code) {
    var self = this;
    if (self._bindCheckTimer) clearTimeout(self._bindCheckTimer);
    self._bindCheckTimer = setTimeout(function () { self._checkBindTech(code); }, 500);
  },

  _checkBindTech: function (code) {
    var self = this;
    self.setData({ bindChecking: true, bindError: '' });
    api.client.profile.findTechByInviteCode(code).then(function (tech) {
      if (tech && tech.name) {
        self.setData({ bindTechName: tech.name, bindTechId:tech.id, bindChecking: false });
      } else {
        self.setData({ bindTechName: '', bindTechId:0, bindChecking: false, bindError: '该邀请码无效，请联系美甲师重新获取' });
      }
    }).catch(function (err) {
      var msg = err.message || '';
      if (msg.includes('异常') || msg.includes('禁用') || msg.includes('inactive')) {
        self.setData({ bindTechName: '', bindTechId:0, bindChecking: false, bindError: '该邀请码对应的美甲师账户异常，无法进行关联' });
      } else {
        self.setData({ bindTechName: '', bindTechId:0, bindChecking: false, bindError: '该邀请码无效，请联系美甲师重新获取' });
      }
    });
  },

  confirmBindTech: function () {
    var self = this;
    var code = self.data.bindInviteCode.trim();
    if (!code) {
      self.setData({ bindError: '请输入邀请码或邀请链接' });
      return;
    }
    if (!self.data.bindTechName) {
      self.setData({ bindError: '请先输入有效的邀请码' });
      return;
    }
    self.setData({ bindChecking: true });
    api.client.profile.bindTechnician(self.data.bindTechId, code, '从预约页申请绑定', 'booking').then(function () {
      wx.showModal({ title:'绑定申请已提交', content:'美甲师通过后即可选择时间预约。', showCancel:false, confirmText:'知道了' });
      self.setData({ showBindTech: false, bindInviteCode: '', bindTechName: '', bindTechId:0, bindError: '', bindChecking: false });
    }).catch(function (err) {
      self.setData({ bindChecking: false, bindError: err.message || '绑定失败，请重试' });
    });
  },

  cancelBindTech: function () {
    this.setData({ showBindTech: false, bindInviteCode: '', bindTechName: '', bindTechId:0, bindError: '', bindChecking: false });
    wx.navigateBack();
  }
});
