const api = require('../../../services/api');
const { requestBookingReminder } = require('../../../utils/wechat-subscription');
const { summarizeServices } = require('../../../utils/service-pricing');
const { buildClientLoginUrl } = require('../../../utils/artist-navigation');
const DRAFT_KEY='client_booking_application_draft';

function selectionMap(ids) {
  return (ids || []).reduce(function (map, id) { map[id] = true; return map; }, {});
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function dateStr(y,m,d) { return y + '-' + pad2(m+1) + '-' + pad2(d); }
function formatAddr(a) { return [a.province,a.city,a.district,a.detailAddress || a.detail].filter(Boolean).join(' '); }

function normalizeCity(name) {
  if (!name || typeof name !== 'string') return '';
  return name.trim().replace(/(市|特别行政区|地区|盟|自治州)$/, '');
}

function getCityHint(tech, address) {
  var techCity = (tech && (tech.city || tech.serviceArea)) || '';
  var addrCity = (address && address.city) || '';
  var normTech = normalizeCity(techCity);
  var normAddr = normalizeCity(addrCity);

  if (!addrCity) {
    if (techCity) {
      return {
        isCrossCity: false,
        isSameCity: false,
        techCity: techCity,
        addrCity: '',
        hintText: '服务范围：限 ' + techCity + ' 及周边，具体路程与时间由美甲师沟通确认'
      };
    }
    return {
      isCrossCity: false,
      isSameCity: false,
      techCity: '',
      addrCity: '',
      hintText: '上门美甲服务范围及路程由美甲师沟通确认'
    };
  }

  if (normTech && normAddr) {
    if (normTech === normAddr) {
      return {
        isCrossCity: false,
        isSameCity: true,
        techCity: techCity,
        addrCity: addrCity,
        hintText: '同城上门 · 美甲师常驻 ' + techCity + '，路程费用由美甲师沟通确认'
      };
    }
    return {
      isCrossCity: true,
      isSameCity: false,
      techCity: techCity,
      addrCity: addrCity,
      hintText: '跨城提醒：当前地址（' + addrCity + '）与美甲师常驻城市（' + techCity + '）不一致，请提前确认是否支持跨城上门及路程费用'
    };
  }

  return {
    isCrossCity: false,
    isSameCity: false,
    techCity: techCity,
    addrCity: addrCity,
    hintText: '已选择 ' + addrCity + ' · 请与美甲师确认是否支持该区域上门'
  };
}

function organizeTechWorks(works, repeatService) {
  if (!Array.isArray(works) || works.length === 0) return [];
  var result = works.map(function (w) {
    return Object.assign({}, w, { isLastBooking: false });
  });
  var repeatWorkId = (repeatService && repeatService.hasWork && repeatService.workId) ? Number(repeatService.workId) : null;
  if (!repeatWorkId) return result;

  var foundIdx = -1;
  for (var i = 0; i < result.length; i++) {
    if (Number(result[i].id) === repeatWorkId) {
      foundIdx = i;
      result[i].isLastBooking = true;
      break;
    }
  }
  if (foundIdx > 0) {
    var pinned = result.splice(foundIdx, 1)[0];
    result.unshift(pinned);
  } else if (foundIdx === -1 && repeatService.title) {
    var syntheticWork = {
      id: repeatWorkId,
      title: repeatService.title || '上次预约作品',
      coverUrl: repeatService.coverUrl || '',
      standardPriceFen: Math.round(Number(repeatService.price || 0) * 100),
      isLastBooking: true
    };
    result.unshift(syntheticWork);
  }
  return result;
}

Page({
  data: {
    submitBarHeight: 120,
    technicians: [], homeFeeTiers: [], homeServiceArea:'',
    quickMode: false, depositMode: 'none', depositValue: 0, depositText: '¥0', settingsReady: false,
    timeCollapsed: false,
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
    selectedAddress: null,
    selectedAddressId: 0,
    homeCityHint: null,
    addressCount:0, homeQuote:null, homeQuoteLoading:false, homeQuoteError:'',
    serviceOptions: [],
    selectedServiceOptionKey: '',
    activeServiceItems: [],
    selectedServiceIds: [], selectedServiceMap: {},
    selectedServiceCount: 0,
    selectedServiceTotal: 0,
    selectedServiceDuration: 0,
    repeatService: null,
    lastServiceHint: '',
    isCustomService: false,
    customTitle: '',
    customDesc: '',
    customImages: [],
    showWorkSelector: false,
    showQuickRef: false,
    techWorks: [],
    workSearchKeyword: '',
    selectedWorkTag: '全部',
    workFilterTags: ['全部'],
    filteredTechWorks: [],
    selectedWorkIds: [],
    sourceWork: null,
    // Booking time
    serviceDate: '',
    startTime: '',
    // Misc
    remark: '',
    uploading: false,
    submitting: false,
    submitSuccess: false,
    submitSuccessTech: '',
    showServiceDetailModal: false,
    showQuickConfirm: false,
    showWorkPreview: false,
    previewWorkData: null,
    previewWorkIndex: 0,
    selectedWorkMap: {},
    hasPriceContent: false,
    minDate: '',
    showApplicationReview: false,
    bookingRulesAgreed: false,
    showConflictTimePicker: false,
    bookingConflictMessage: '',
    // 绑定美甲师弹窗
    showBindTech: false,
    bindInviteCode: '',
    bindChecking: false,
    bindTechName: '',
    bindTechId: 0,
    bindError: ''
  },

  onReady: function () { this.measureSubmitBar(); },
  onResize: function () { this.measureSubmitBar(); },

  measureSubmitBar: function () {
    this.createSelectorQuery().select('.submit-bar').boundingClientRect(rect => {
      if (rect && Math.abs(rect.height - this.data.submitBarHeight) > 1) {
        this.setData({ submitBarHeight: Math.ceil(rect.height) });
      }
    }).exec();
  },

  refreshPriceContent: function () {
    var d = this.data;
    var has = !!(d.sourceWork || (!d.isCustomService && d.selectedServiceCount > 0));
    if (has !== d.hasPriceContent) this.setData({ hasPriceContent: has });
  },

  onLoad: function (options) {
    if (getApp().globalData.role === 'technician') {
      wx.redirectTo({ url: '/pages/technician/create-order/index' });
      return;
    }
    this._pageActive = true;
    this._preferCustom = options.content === 'custom';
    this._fullMode = options.mode === 'full' || this._preferCustom || !!options.design_id || !!options.serviceId;
    this.setData({ referenceOnly: options.reference === '1' });
    this._attributionSource = options.source || '';
    this.inviteCode = options.invite || '';
    this._draftOwner = String((wx.getStorageSync('client_userInfo') || {}).id || 'guest');
    var draft = wx.getStorageSync(DRAFT_KEY) || {};
    if (options.resume !== '1' || (draft.owner && draft.owner !== 'guest' && draft.owner !== this._draftOwner) || (options.intent && options.intent !== draft.applicationKey)) draft = {};
    this.inviteCode = this.inviteCode || draft.inviteCode || '';
    if ((options.techId && Number(options.techId) !== draft.selectedTechId) || (options.workId && Number(options.workId) !== draft.sourceWorkId)) draft = {};
    if (options.resume === '1' && !options.mode && !options.design_id && !options.serviceId) this._fullMode = !!draft.fullMode;
    this.applicationKey = draft.applicationKey || ('booking-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
    var today = new Date();
    var minDate = dateStr(today.getFullYear(), today.getMonth(), today.getDate());
    var defaultDate = minDate;
    var presetDate = /^\d{4}-\d{2}-\d{2}$/.test(options.serviceDate || '') && options.serviceDate >= minDate ? options.serviceDate : defaultDate;
    var presetTime = /^\d{1,2}:\d{2}$/.test(options.startTime || '') ? options.startTime : '';
    this._presetTime = presetTime;
    this.setData({
      minDate: minDate,
      serviceDate: presetDate,
      startTime: presetTime,
      timeCollapsed: !!presetTime,
      remark: draft.remark || ''
    });
    this._bookingDraft = draft;
    if (options.resume === '1') this._attributionSource = draft.attributionSource || this._attributionSource;
    // 从聊天「快速发起预约」进入：锁定美甲师为对话对象
    var presetTechId = options.techId || options.tech_id;
    if (presetTechId) {
      this._presetTechId = parseInt(presetTechId);
      this.setData({ presetLocked:true });
    }
    this._sourceOrderId = options.sourceOrderId ? Number(options.sourceOrderId) : null;
    if (!this.isClientLoggedIn()) {
      var queryParts = [];
      if (options.workId) queryParts.push('workId=' + encodeURIComponent(options.workId));
      if (presetTechId) queryParts.push('techId=' + encodeURIComponent(presetTechId));
      if (options.sourceOrderId) queryParts.push('sourceOrderId=' + encodeURIComponent(options.sourceOrderId));
      if (this.inviteCode) queryParts.push('invite=' + encodeURIComponent(this.inviteCode));
      if (options.reference === '1') queryParts.push('reference=1');
      if (options.source) queryParts.push('source=' + encodeURIComponent(options.source));
      if (options.mode) queryParts.push('mode=' + encodeURIComponent(options.mode));
      if (options.content) queryParts.push('content=' + encodeURIComponent(options.content));
      if (options.shareToken) queryParts.push('shareToken=' + encodeURIComponent(options.shareToken));
      var returnTarget = '/pages/client/create-order/index' + (queryParts.length ? '?' + queryParts.join('&') : '');
      wx.redirectTo({
        url: buildClientLoginUrl(returnTarget, {
          source: this._attributionSource || 'booking',
          inviteCode: this.inviteCode,
          quickBookingTechId: presetTechId || undefined
        })
      });
      return;
    }
    this._resumeDraft = options.resume === '1';
    this._resumeSubmit = this._resumeDraft && options.intent === draft.applicationKey && draft.submitRequested === true;
    this.loadTechnicians();
    if (options.design_id) this.loadDesign(options.design_id);
    // 从作品详情「预约同款」进入：以该作品作为预约服务内容
    if (options.workId || (options.resume === '1' && !options.design_id && draft.sourceWorkId)) {
      this.sourceShareToken = options.shareToken || draft.sourceShareToken || '';
      this.setData({ referenceOnly: options.reference === '1' || !!draft.referenceOnly });
      this.loadWork(Number(options.workId || draft.sourceWorkId));
    }
  },

  onShow: function () {
    this._pageActive = true;
    this._hasShown = true;
    if (this.data.serviceType === '上门美甲') this.loadDefaultAddress();
    var picked = wx.getStorageSync('client_selected_address');
    if (picked && picked.id && this.data.serviceType === '上门美甲') {
      wx.removeStorageSync('client_selected_address');
      this.setData({
        selectedAddress: picked,
        selectedAddressId: picked.id
      }, () => {
        this.measureSubmitBar();
        this.updateHomeCityHint(undefined, picked);
        this.refreshHomeQuote();
      });
    }
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
    this._homeQuoteToken = (this._homeQuoteToken || 0) + 1;
    if (this._navTimer) clearTimeout(this._navTimer);
  },

  isClientLoggedIn: function () {
    if (typeof wx === 'undefined') return false;
    const app = getApp();
    return (wx.getStorageSync('role') || app.globalData.role) === 'client' && !!(wx.getStorageSync('client_token') || app.globalData.token);
  },
  requireClientLogin: function () {
    if (this.isClientLoggedIn()) return true;
    this.saveDraft();
    const path = '/pages/client/create-order/index?techId=' + this.data.selectedTechId + '&resume=1&intent=' + encodeURIComponent(this.applicationKey) + '&mode=' + (this._fullMode ? 'full' : 'quick');
    const inviteCode = this.inviteCode || (this.data.selectedTech || {}).invitationCode || '';
    wx.navigateTo({ url: buildClientLoginUrl(path, { source: this._attributionSource || 'quick_booking', inviteCode }) });
    return false;
  },
  clearQuickWork: function () {
    this._workRequestId = (this._workRequestId || 0) + 1;
    this.sourceWorkId = null; this.sourceShareToken = ''; this._pendingWorkPrefill = null;
    this._sourceLoading = false; this._sourceFailed = false;
    this.setData({ sourceWork: null, selectedWorkIds: [], referenceOnly: false, customTitle: '', customDesc: '', customImages: [], selectedServiceDuration: 0, selectedServiceCount: 0, selectedServiceTotal: 0, startTime: '' });
    this.updateDeposit();
    this.refreshPriceContent();
  },
  toggleReferenceOnly: function () {
    if (!this.data.quickMode || !this.data.sourceWork) return;
    const referenceOnly = !this.data.referenceOnly || !this.data.sourceWork.pricingReady;
    this.setData({ referenceOnly: referenceOnly, selectedServiceDuration: referenceOnly ? 0 : this.data.sourceWork.totalDurationMinutes, startTime: '' });
    this.updateDeposit();
  },

  // ── 数据加载 ─────────────────────────────

  loadPublicTechnician: function () {
    return api.public.artists.detail(this._presetTechId).then(async result => {
      const artist = result.artist || result;
      const tech = { ...artist, status: artist.acceptingBookings ? 'active' : 'inactive', serviceItems: artist.serviceItems || [], shopService: !!artist.shopService, homeService: !!artist.homeService };
      // 预约目标由 techId 确认，后续绑定只能使用该美甲师公开资料中的邀请码。
      this.inviteCode = artist.invitationCode || '';
      if (this.isClientLoggedIn() && this.inviteCode) {
        wx.showLoading({ title: '正在关联美甲师', mask: true });
        try {
          await api.client.profile.bindQuickBooking(Number(tech.id), this.inviteCode);
          wx.hideLoading();
          return this.loadTechnicians();
        } catch (err) {
          wx.hideLoading();
          throw err;
        }
      }
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
      var bindings = res.bindings || res.technicians || wx.getStorageSync('client_bindings') || [];
      var techs = bindings.map(function (b) {
        var t = b.technician || b;
        return {
          id: t.id, name: t.name, avatarUrl: t.avatarUrl, city: t.city,
          status: t.status, shopService: t.shopService, homeService: t.homeService, homeServiceSettings:t.homeServiceSettings,
          shopAddresses: (t.shopAddresses || []).filter(function (sa) { return sa.enabled !== false; }),
          serviceItems: (t.serviceItems || []).filter(function (si) { return si.isActive; }),
          serviceSchedule: t.serviceSchedule || null,
          isDefault: b.isDefault || false
        };
      }).filter(function (t) { return t.status === 'active' || t.status === 'inactive'; });
      self.setData({ technicians: techs, needsBinding: false });
      if (self._presetTechId && !techs.some(t => t.id === self._presetTechId)) {
        self.loadPublicTechnician(); return;
      }


      // 无绑定美甲师：无法预约，引导前往「我的美甲师」绑定
      if (techs.length === 0) {
        wx.showToast({ title: '请先绑定美甲师后再预约', icon: 'none' });
        setTimeout(function () {
          wx.navigateTo({ url: '/pages/client/my-technicians/index' });
        }, 600);
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
      if (self._presetTechId && techId && Number(self._presetTechId) !== Number(techId)) {
        throw new Error('作品与当前美甲师不一致，请从作品页面重新预约');
      }
      var images = (w.imageUrls && w.imageUrls.length)
        ? w.imageUrls.slice(0, 9)
        : (w.coverUrl ? [w.coverUrl] : []);
      self._pendingWorkPrefill = {
        sourceWorkId: w.id,
        techId: techId,
        title: w.title || '美甲作品',
        coverUrl: w.coverUrl || (images.length ? images[0] : ''),
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
    }).finally(function () { if (requestId === self._workRequestId) { self._sourceLoading = false; self.resumeSubmission(); } });
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
    var isPriced = Boolean(pf.pricingReady && pf.standardPriceFen > 0);
    var isReference = Boolean(this.data.referenceOnly || !isPriced);
    this.setData({
      presetLocked: true,
      isCustomService: false,
      customTitle: pf.customTitle,
      customDesc: pf.customDesc,
      customImages: pf.customImages,
      sourceWork: pf,
      selectedServiceTotal: Number(pf.standardPriceFen || 0) / 100,
      selectedServiceDuration: isReference ? 0 : pf.totalDurationMinutes,
      referenceOnly: isReference,
      selectedServiceCount: (pf.serviceLines || []).length
    });
    this.sourceWorkId = pf.sourceWorkId;
    this._pendingWorkPrefill = null;
    this.updateDeposit();
    this.refreshPriceContent();
    this.resumeSubmission();
  },

  loadTechWorks: function (techId) {
    var self = this;
    (this.isClientLoggedIn() ? api.client.works.list({ techId: techId }) : api.public.works.list({ techId: techId })).then(function (res) {
      var works = (res.list || res.data || res || []).filter(function (w) {
        return w.technicianId === techId || (w.technician && w.technician.id === techId);
      });
      var tagSet = {};
      works.forEach(function (w) {
        if (Array.isArray(w.tags)) {
          w.tags.forEach(function (t) { if (t && typeof t === 'string' && t.trim()) tagSet[t.trim()] = true; });
        }
        if (w.category && typeof w.category === 'string' && w.category.trim()) tagSet[w.category.trim()] = true;
        if (w.style && typeof w.style === 'string' && w.style.trim()) tagSet[w.style.trim()] = true;
      });
      var tags = ['全部'].concat(Object.keys(tagSet));
      var reordered = organizeTechWorks(works, self.data.repeatService);
      self.setData({
        techWorks: reordered,
        workFilterTags: tags,
        selectedWorkTag: '全部',
        workSearchKeyword: ''
      }, function () {
        self.updateFilteredTechWorks();
      });
    }).catch(function () {
      self.setData({ techWorks: [], filteredTechWorks: [], workFilterTags: ['全部'] });
    });
  },

  updateFilteredTechWorks: function () {
    var works = this.data.techWorks || [];
    var tag = this.data.selectedWorkTag || '全部';
    var kw = (this.data.workSearchKeyword || '').trim().toLowerCase();
    var filtered = works.filter(function (w) {
      if (tag !== '全部') {
        var hasTag = (Array.isArray(w.tags) && w.tags.indexOf(tag) >= 0) ||
          w.category === tag ||
          w.style === tag ||
          ((w.title || '').indexOf(tag) >= 0);
        if (!hasTag) return false;
      }
      if (kw) {
        var inTitle = (w.title || '').toLowerCase().indexOf(kw) >= 0;
        var inDesc = (w.description || '').toLowerCase().indexOf(kw) >= 0;
        var inTags = Array.isArray(w.tags) && w.tags.some(function (t) { return (t || '').toLowerCase().indexOf(kw) >= 0; });
        if (!inTitle && !inDesc && !inTags) return false;
      }
      return true;
    });
    this.setData({ filteredTechWorks: filtered });
  },

  onWorkSearchInput: function (e) {
    var val = e.detail.value || '';
    this.setData({ workSearchKeyword: val });
    this.updateFilteredTechWorks();
  },

  clearWorkSearch: function () {
    this.setData({ workSearchKeyword: '' });
    this.updateFilteredTechWorks();
  },

  onSelectWorkTag: function (e) {
    var tag = e.currentTarget.dataset.tag || '全部';
    this.setData({ selectedWorkTag: tag });
    this.updateFilteredTechWorks();
  },

  resetWorkFilter: function () {
    this.setData({ selectedWorkTag: '全部', workSearchKeyword: '' });
    this.updateFilteredTechWorks();
  },

  selectWorkSameStyle: function (e) {
    var id = Number(e.currentTarget ? e.currentTarget.dataset.id : e);
    if (!id) return;
    var self = this;
    var m = {}; m[id] = true;
    this.setData({
      selectedWorkIds: [id],
      selectedWorkMap: m,
      referenceOnly: false
    });
    this.loadWork(id);
    wx.pageScrollTo({
      selector: '.booking-time-section',
      duration: 300
    });
    var target = (this.data.techWorks || []).find(function (w) { return w.id === id; });
    if (target && target.title) {
      wx.showToast({ title: '已选《' + target.title + '》同款', icon: 'none' });
    }
  },

  reselectWork: function () {
    this.setData({
      showWorkSelector: true,
      showQuickRef: true
    });
    wx.pageScrollTo({
      selector: '.tech-works-section',
      duration: 300
    });
    wx.showToast({ title: '请选择款式', icon: 'none' });
  },

  removeSelectedWork: function () {
    var self = this;
    wx.showModal({
      title: '取消选择款式',
      content: '确定要移除已选的同款作品吗？移除后可重新选择其他作品或自定义需求。',
      confirmText: '确定移除',
      cancelText: '保留',
      success: function (res) {
        if (!res.confirm) return;
        self._workRequestId = (self._workRequestId || 0) + 1;
        self.sourceWorkId = null;
        self.sourceShareToken = '';
        self._pendingWorkPrefill = null;
        self._sourceLoading = false;
        self._sourceFailed = false;
        self.setData({
          sourceWork: null,
          selectedWorkIds: [],
          selectedWorkMap: {},
          referenceOnly: false,
          customTitle: '',
          customDesc: '',
          customImages: [],
          selectedServiceDuration: 0,
          selectedServiceCount: 0,
          selectedServiceTotal: 0,
          showWorkSelector: false,
          showQuickRef: false,
          ...(self.data.repeatService ? { 'repeatService.isApplied': false } : {})
        }, function () {
          self.measureSubmitBar();
        });
        self.updateDeposit();
        self.refreshPriceContent();
        wx.showToast({ title: '已移除同款作品', icon: 'none' });
      }
    });
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
      return !String(item.category).startsWith('surcharge_') && item.isActive !== false && Number.isFinite(Number(item.price)) && Number(item.durationMinutes) > 0;
    });
    // 首次锁定快约带入的美甲师时保留带入的预约时间，用户后续切换美甲师才清空
    var keepPresetTime = !this._presetTimeApplied && this._presetTechId === id && !!this._presetTime;
    this._presetTimeApplied = true;
    this.setData({
      selectedTechId: id, selectedTech: tech, sourceWork: null,
      bookingReady: false, bookingPaused: tech.status === 'inactive',
      serviceType: '', availableServiceTypes: [],
      shopAddresses: shopAddrs, selectedShopName: '',
      serviceOptions: [], selectedServiceOptionKey: '',
      activeServiceItems: serviceItems,
      selectedServiceIds: [], selectedServiceMap: {}, selectedWorkIds: [], selectedWorkMap: {},
      showWorkSelector: false,
      selectedServiceCount: 0, selectedServiceTotal: 0, selectedServiceDuration: 0,
      repeatService: null,
      // 美甲师无服务项目时自动切换到自定义需求模式
      isCustomService: this._preferCustom || serviceItems.length === 0,
      startTime: keepPresetTime ? this._presetTime : ''
    });
    this.refreshServiceOptions(tech, false);
    this.setData({ quickMode: false, quickAvailable: false, settingsReady: false });
    this.refreshPriceContent();
    this.applyReturningClientPrefill(id, serviceItems);
    if (api.public.bookingSettings) api.public.bookingSettings(id).then(settings => {
      if (this.data.selectedTechId !== id) return;
      const quick = settings.quickBookingEnabled && !this._fullMode;
      this.setData({ settingsReady: true, depositMode: settings.depositMode || 'none', depositValue: settings.depositValue || 0 });
      this.updateDeposit();
      this.setData({ quickAvailable: !!settings.quickBookingEnabled, quickMode: !!quick,
        ...(quick ? { presetLocked: true, isCustomService: true } : {}) });
      if (quick && this.data.sourceWork && !this.data.sourceWork.pricingReady) this.setData({ referenceOnly: true, selectedServiceDuration: 0 });
      this.refreshPriceContent();
      this.updateDeposit();
      this.resumeSubmission();
    }).catch(() => { if (this.data.selectedTechId === id) wx.showToast({ title: '预约设置加载失败，请重新进入重试', icon: 'none' }); });
    this.loadTechWorks(id);
    // booking-time-picker 组件通过 techId observer 自动加载排班和占用数据
  },

  expectedPriceFen: function () {
    const d = this.data;
    const base = d.sourceWork && d.sourceWork.pricingReady && !d.referenceOnly ? d.sourceWork.standardPriceFen : !d.isCustomService && d.selectedServiceCount > 0 ? Math.round(d.selectedServiceTotal * 100) : null;
    return base == null ? null : base + (d.serviceType === '上门美甲' && d.homeQuote ? d.homeQuote.feeFen : 0);
  },

  resumeSubmission: function () {
    if (!this._resumeSubmit || !this.isClientLoggedIn() || !this.data.bookingReady || !this.data.settingsReady || this._sourceLoading || this._sourceFailed) return;
    const draft = this._bookingDraft || {};
    if (!this.data.startTime || this.data.startTime !== draft.startTime || this.data.serviceDate !== draft.serviceDate) return;
    this._resumeSubmit = false;
    if (draft.expectedPriceFen !== this.expectedPriceFen() || draft.depositMode !== this.data.depositMode || draft.depositValue !== this.data.depositValue) {
      wx.showToast({ title: '价格或定金设置已更新，请核对后提交', icon: 'none' });
      return;
    }
    this.handleSubmit();
  },

  onBookingAvailability: function (e) {
    if (this.data.bookingReady !== e.detail.ready || this.data.bookingPaused !== e.detail.paused) {
      this.setData({ bookingReady: e.detail.ready, bookingPaused: e.detail.paused });
    }
    this.resumeSubmission();
  },

  contactSelectedTech: function () {
    var tech = this.data.selectedTech;
    if (tech) wx.navigateTo({ url: '/pages/client/chat-detail/index?techId=' + tech.id + '&techName=' + encodeURIComponent(tech.name || '') });
  },

  checkBookingAvailability: function () {
    if (!this.data.serviceType) { wx.showToast({ title:'请先选择服务形式', icon:'none' }); return false; }
    if (this.data.serviceType === '上门美甲' && (!this.data.homeQuote || this.data.homeQuoteLoading || this.data.homeQuoteError)) { wx.showToast({ title:this.data.homeQuoteError || '请先选择地址并确认上门费', icon:'none' }); return false; }
    if (this.data.settingsReady === false) { wx.showToast({ title: '请等待预约设置加载完成', icon: 'none' }); return false; }
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
    var updates = {};
    if (this.data.serviceDate !== detail.serviceDate) updates.serviceDate = detail.serviceDate;
    if (this.data.startTime !== detail.startTime) updates.startTime = detail.startTime;
    // 时间失效时展开完整时间选择，避免折叠行与选择器同时不可见导致无法选时间
    if (!detail.startTime && this.data.timeCollapsed) updates.timeCollapsed = false;
    if (!Object.keys(updates).length) return;
    this.setData(updates, () => this.measureSubmitBar());
  },

  expandTimePicker: function () {
    this.setData({ timeCollapsed: false });
  },

  // ── 服务类型 ─────────────────────────────

  chooseAddress: function () {
    if (!this.requireClientLogin()) return;
    if (!this.data.addressCount && !this.data.selectedAddress) return wx.navigateTo({ url:'/pages/client/address-edit/index?requireLocation=1&select=1&forceDefault=1' });
    wx.navigateTo({ url: '/pages/client/addresses/index?mode=select' });
  },

  loadDefaultAddress: function () {
    if (this.data.serviceType !== '上门美甲' || !this.isClientLoggedIn()) return;
    var self = this;
    var requestId = (this._addressRequest || 0) + 1; this._addressRequest = requestId;
    api.client.addresses.list().then(function (res) {
      var list = res.list || res.data || res || [];
      if (!self._pageActive || requestId !== self._addressRequest || self.data.serviceType !== '上门美甲') return;
      var def = list.find(function (a) { return String(a.id) === String(self.data.selectedAddressId); }) || (list.length === 1 ? list[0] : null);
      self.setData({ addressCount:list.length, selectedAddress:def, selectedAddressId:def ? def.id : 0 });
      if (def) {
        self.setData({
          selectedAddress: def,
          selectedAddressId: def.id
        }, () => {
          self.measureSubmitBar();
          self.updateHomeCityHint(undefined, def);
          self.refreshHomeQuote();
        });
      } else self.refreshHomeQuote();
    }).catch(function () { if (self._pageActive) self.setData({ homeQuote:null, homeQuoteError:'地址加载失败，请重新选择地址' }); });
  },

  editSelectedAddress: function () {
    if (!this.requireClientLogin() || !this.data.selectedAddressId) return;
    wx.navigateTo({ url:'/pages/client/address-edit/index?id=' + this.data.selectedAddressId + '&requireLocation=1&select=1' });
  },

  refreshHomeQuote: async function () {
    const token = (this._homeQuoteToken || 0) + 1; this._homeQuoteToken = token;
    const d = this.data;
    this.setData({ homeQuote:null, homeQuoteLoading:false, homeQuoteError:'' });
    if (d.serviceType !== '上门美甲' || !d.selectedTechId || !d.selectedAddressId || !this.isClientLoggedIn()) return;
    this.setData({ homeQuoteLoading:true });
    try {
      const quote = await api.client.orders.homeServiceQuote(d.selectedTechId, d.selectedAddressId);
      if (this._pageActive && token === this._homeQuoteToken) this.setData({ homeQuote:{ ...quote, feeText:(quote.feeFen / 100).toFixed(2) } }, () => this.updateDeposit());
    } catch (err) {
      if (this._pageActive && token === this._homeQuoteToken) this.setData({ homeQuoteError:err.message || '上门费用计算失败，请重试' });
    } finally { if (this._pageActive && token === this._homeQuoteToken) this.setData({ homeQuoteLoading:false }); }
  },

  updateHomeCityHint: function (selectedTech, selectedAddress) {
    var tech = selectedTech !== undefined ? selectedTech : this.data.selectedTech;
    var addr = selectedAddress !== undefined ? selectedAddress : this.data.selectedAddress;
    var hint = getCityHint(tech, addr);
    this.setData({ homeCityHint: hint });
  },

  refreshServiceOptions: function (tech, preserveSelection) {
    var home = tech.homeServiceSettings || {};
    if (typeof home === 'string') { try { home = JSON.parse(home); } catch (_) { home = {}; } }
    var feeTiers = Array.isArray(home.tiers) ? home.tiers.map(function (tier, index, tiers) {
      return { rangeText:(index ? tiers[index - 1].maxKm : 0) + '–' + tier.maxKm + 'km', feeText:(Number(tier.feeFen) / 100).toFixed(2) };
    }) : [];
    this.setData({ homeFeeTiers:feeTiers, homeServiceArea:[home.province, home.city, home.district].filter(Boolean).join(' ') });
    var shops = tech.shopService ? (tech.shopAddresses || []).filter(function (shop) { return shop.enabled !== false; }) : [];
    var options = shops.map(function (shop, index) {
      return {
        key: 'shop:' + index + ':' + (shop.name || ''), type: '到店美甲', shopIndex: index,
        title: '到店美甲 · ' + (shop.name || '门店'),
        detail: formatAddr(shop), contact:shop.phone || '', guidance: shop.guidance
      };
    });
    var isAudit = Boolean(tech.auditMode || this.data.auditMode);
    if (tech.homeService && !isAudit) {
      options.push({
        key: 'home:service',
        type: '上门美甲',
        shopIndex: -1,
        title: '上门美甲',
        detail: '美甲师上门服务 · 需提供您的服务地址'
      });
    }
    var selectedKey = preserveSelection ? this.data.selectedServiceOptionKey : '';
    var draftOption = null;
    if (preserveSelection && this._bookingDraft) {
      var draft = this._bookingDraft;
      draftOption = options.find(function (item) {
        return item.key === draft.selectedServiceOptionKey ||
          (item.type === '到店美甲' && item.title === '到店美甲 · ' + draft.selectedShopName) ||
          (item.type === '上门美甲' && draft.serviceType === '上门美甲');
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
      serviceType: selected ? selected.type : (types.length === 1 ? types[0].value : ''),
      selectedShopName: selected && selected.type === '到店美甲' && shops[selected.shopIndex] ? shops[selected.shopIndex].name : ''
    }, () => this.measureSubmitBar());
    this.updateHomeCityHint(tech);
    if (selected && selected.type === '上门美甲' && !this.data.selectedAddressId) {
      this.loadDefaultAddress();
    }
  },

  selectServiceOption: function (e) {
    var key = e.detail.value;
    var option = this.data.serviceOptions.find(function (item) { return item.key === key; });
    if (!option || key === this.data.selectedServiceOptionKey) return;
    this._serviceOptionTouched = true;
    var shop = option.type === '到店美甲' && option.shopIndex >= 0 ? this.data.shopAddresses[option.shopIndex] : null;
    this.setData({
      selectedServiceOptionKey: key,
      serviceType: option.type,
      selectedShopName: shop ? shop.name : '',
      startTime: ''
    }, () => this.measureSubmitBar());
    if (option.type === '上门美甲') this.loadDefaultAddress();
    else this.refreshHomeQuote();
  },

  selectServiceType: function (e) {
    var value = e.currentTarget.dataset.value;
    this._serviceOptionTouched = true;
    if (value === this.data.serviceType || !this.data.availableServiceTypes.some(function (type) { return type.value === value; })) return;
    var matchOption = this.data.serviceOptions.find(function (opt) { return opt.type === value; });
    var shop = matchOption && matchOption.type === '到店美甲' && matchOption.shopIndex >= 0 ? this.data.shopAddresses[matchOption.shopIndex] : null;
    this.setData({
      serviceType: value,
      selectedServiceOptionKey: matchOption ? matchOption.key : '',
      selectedShopName: shop ? shop.name : '',
      startTime: ''
    }, () => this.measureSubmitBar());
    if (value === '上门美甲') this.loadDefaultAddress();
    else this.refreshHomeQuote();
  },

  selectShopAddress: function (e) {
    var name = e.currentTarget.dataset.name;
    if (name === this.data.selectedShopName || !this.data.shopAddresses.some(function (shop) { return shop.name === name; })) return;
    this.setData({ serviceType: '到店美甲', selectedShopName: name, startTime: '' }, () => this.measureSubmitBar());
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

  toggleQuickRef: function () {
    this.setData({ showQuickRef: !this.data.showQuickRef });
  },

  switchContentMode: function (e) {
    if (this.sourceWorkId) return;
    var mode = e.currentTarget.dataset.mode;
    this._preferCustom = mode === 'custom';
    if (mode === 'standard') this.sourceWorkId = null;
    this.setData({
      isCustomService: mode === 'custom',
      selectedServiceIds: [], selectedServiceMap: {},
      selectedServiceCount: 0,
      selectedServiceTotal: 0,
      selectedServiceDuration: 0
    });
    this.updateDeposit();
    this.refreshPriceContent();
  },

  toggleService: function (e) {
    if (this.data.sourceWork) return;
    var id = e.currentTarget.dataset.id;
    var ids = this.data.selectedServiceIds.slice();
    var idx = ids.indexOf(id);
    if (idx >= 0) ids.splice(idx, 1); else ids.push(id);
    var summary = summarizeServices(this.data.activeServiceItems, ids);
    var rs = this.data.repeatService;
    var isApplied = Boolean(rs && rs.serviceIds && rs.serviceIds.length === ids.length && rs.serviceIds.every(function (i) { return ids.indexOf(i) >= 0; }));
    this.setData({
      selectedServiceIds: ids, selectedServiceMap: selectionMap(ids),
      selectedServiceCount: summary.count,
      selectedServiceTotal: summary.totalPrice,
      selectedServiceDuration: summary.totalDurationMinutes,
      ...(rs ? { 'repeatService.isApplied': isApplied } : {}),
      lastServiceHint: ''
    });
    this.updateDeposit();
    this.refreshPriceContent();
  },

  // 老客加速：预填该美甲师最近一次订单中的同名服务
  applyReturningClientPrefill: function (techId, serviceItems) {
    var self = this;
    var app = getApp();
    if (!app.globalData || !app.globalData.token) return;
    if (!api.client || !api.client.orders || typeof api.client.orders.list !== 'function') return;
    if (this.data.sourceWork || this.data.selectedServiceIds.length) return;
    api.client.orders.list({ pageSize: 20 }).then(function (res) {
      if (self.data.selectedTechId != techId) return;
      var list = Array.isArray(res) ? res : (res.list || res.data || []);
      var mine = list.filter(function (o) {
        if (!o || o.status === 'cancelled' || o.status === 'expired') return false;
        var tid = o.technician && (o.technician.id || o.technician.technicianId);
        return String(tid) === String(techId);
      }).sort(function (a, b) {
        return new Date(b.startTime || b.createdAt || 0) - new Date(a.startTime || a.createdAt || 0);
      });
      var targetOrder = self._sourceOrderId
        ? (mine.find(function (o) { return Number(o.id) === Number(self._sourceOrderId); }) || mine[0])
        : mine[0];
      if (!targetOrder) return;
      var names = (Array.isArray(targetOrder.serviceLines) ? targetOrder.serviceLines : [])
        .map(function (line) { return line.nameSnapshot || line.name; })
        .filter(Boolean);
      var workObj = targetOrder.sourceWork || (Array.isArray(targetOrder.worksFromOrder) && targetOrder.worksFromOrder[0]) || (Array.isArray(targetOrder.works) && targetOrder.works[0]) || targetOrder.work;
      var workId = (workObj && workObj.id) || targetOrder.sourceWorkId || targetOrder.workId || null;
      var hasWork = Boolean(workId);
      if (!names.length && !hasWork) return;
      var matched = names.length ? (serviceItems || []).filter(function (item) {
        return names.indexOf(item.name) !== -1;
      }) : [];
      if (!matched.length && !hasWork) return;
      var ids = matched.map(function (item) { return item.id; });
      var summary = summarizeServices(serviceItems, ids);
      var coverUrl = (workObj && (workObj.coverUrl || (workObj.imageUrls && workObj.imageUrls[0]))) || '';
      var workTitle = (workObj && workObj.title) || targetOrder.serviceName || (matched.length ? matched.map(function (i) { return i.name; }).join(' + ') : '美甲作品');
      var workPrice = (workObj && workObj.standardPriceFen) ? (workObj.standardPriceFen / 100).toFixed(2) : (targetOrder.totalAmount ? Number(targetOrder.totalAmount).toFixed(2) : (summary.totalPrice ? Number(summary.totalPrice).toFixed(2) : ''));

      var repeatData = {
        orderId: targetOrder.id,
        workId: workId,
        title: workTitle,
        coverUrl: coverUrl,
        price: workPrice,
        hasWork: hasWork,
        names: workTitle,
        count: matched.length || 1,
        duration: summary.totalDurationMinutes || 120,
        totalPrice: workPrice || Number(summary.totalPrice || 0).toFixed(2),
        serviceIds: ids,
        isApplied: false
      };

      var dataToSet = {
        repeatService: repeatData,
        lastServiceHint: ''
      };

      if (hasWork && self.data.techWorks && self.data.techWorks.length > 0) {
        dataToSet.techWorks = organizeTechWorks(self.data.techWorks, repeatData);
      }

      if (matched.length > 0) {
        dataToSet.selectedServiceIds = ids;
        dataToSet.selectedServiceMap = selectionMap(ids);
        dataToSet.selectedServiceCount = summary.count;
        dataToSet.selectedServiceTotal = summary.totalPrice;
        dataToSet.selectedServiceDuration = summary.totalDurationMinutes;
      }

      self.setData(dataToSet, function () {
        self.updateFilteredTechWorks();
        self.measureSubmitBar();
      });
      self.updateDeposit();
      self.refreshPriceContent();
    }).catch(function () {});
  },

  applyRepeatServices: function (e) {
    var id = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    var rs = this.data.repeatService;
    var targetWorkId = id || (rs && rs.workId);
    if (targetWorkId) {
      this.selectWorkSameStyle(targetWorkId);
      if (this.data.repeatService) {
        this.setData({ 'repeatService.isApplied': true });
      }
      return;
    }
    if (!rs.serviceIds || !rs.serviceIds.length) return;
    var serviceItems = this.data.activeServiceItems || [];
    var isCurrentlyApplied = rs.isApplied;
    var nextIds = isCurrentlyApplied ? [] : rs.serviceIds.slice();
    var summary = summarizeServices(serviceItems, nextIds);
    var self = this;
    this.setData({
      selectedServiceIds: nextIds,
      selectedServiceMap: selectionMap(nextIds),
      selectedServiceCount: summary.count,
      selectedServiceTotal: summary.totalPrice,
      selectedServiceDuration: summary.totalDurationMinutes,
      'repeatService.isApplied': !isCurrentlyApplied
    }, function () {
      self.measureSubmitBar();
    });
    this.updateDeposit();
    this.refreshPriceContent();
    wx.showToast({
      title: !isCurrentlyApplied ? '已勾选上次服务项目' : '已取消勾选',
      icon: 'none'
    });
  },

  updateDeposit: function () {
    const d = this.data;
    const known = d.sourceWork ? d.sourceWork.pricingReady && !d.referenceOnly : !d.isCustomService && d.selectedServiceCount > 0;
    const amount = d.depositMode === 'fixed' ? d.depositValue / 100 : d.depositMode === 'percentage' && known ? Math.round((this.expectedPriceFen() || 0) * d.depositValue / 10000) / 100 : 0;
    this.setData({ depositText: d.depositMode === 'percentage' && !known ? (d.depositValue / 100) + '%，金额待报价后计算' : '¥' + amount }, () => this.measureSubmitBar());
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
    var id = Number(e.currentTarget.dataset.id);
    if (this.data.quickMode) {
      var map = {}; map[id] = true;
      this.setData({ selectedWorkIds: [id], selectedWorkMap: map, showWorkSelector: false, referenceOnly: false });
      this.loadWork(id); return;
    }
    var ids = this.data.selectedWorkIds.slice();
    var idx = ids.indexOf(id);
    if (idx >= 0) { ids.splice(idx, 1); }
    else { if (ids.length >= 3) { wx.showToast({ title: '最多选3个', icon: 'none' }); return; } ids.push(id); }
    var m = {};
    ids.forEach(function (i) { m[i] = true; });
    this.setData({ selectedWorkIds: ids, selectedWorkMap: m });
  },

  removeWork: function (e) {
    var id = Number(e.currentTarget.dataset.id);
    var ids = this.data.selectedWorkIds.filter(function (i) { return i !== id; });
    var m = {};
    ids.forEach(function (i) { m[i] = true; });
    this.setData({ selectedWorkIds: ids, selectedWorkMap: m });
  },

  // ── 备注 ─────────────────────────────────

  onRemarkInput: function (e) { this.setData({ remark: e.detail.value }); },

  // ── 提交 ─────────────────────────────────

  saveDraft: function () {
    var d = this.data;
    if (!this.applicationKey) return;
    wx.setStorageSync(DRAFT_KEY, {
      applicationKey: this.applicationKey,
      owner: this._draftOwner || String((wx.getStorageSync('client_userInfo') || {}).id || 'guest'),
      inviteCode: this.inviteCode || '',
      fullMode: !!this._fullMode,
      sourceWorkId: this.sourceWorkId || null,
      sourceShareToken: this.sourceShareToken || '',
      attributionSource: this._attributionSource || '',
      submitRequested: !!this._submitRequested,
      expectedPriceFen: this.expectedPriceFen(),
      depositMode: d.depositMode,
      depositValue: d.depositValue,
      referenceOnly: this.data.referenceOnly,
      selectedTechId: d.selectedTechId,
      serviceType: d.serviceType,
      selectedShopName: d.selectedShopName,
      selectedAddress: d.selectedAddress,
      selectedAddressId: d.selectedAddressId,
      selectedServiceOptionKey: d.selectedServiceOptionKey,
      selectedServiceIds: d.selectedServiceIds,
      isCustomService: d.isCustomService,
      customTitle: d.customTitle,
      customDesc: d.customDesc,
      customImages: d.customImages,
      selectedWorkIds: d.selectedWorkIds,
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
          (item.type === '上门美甲' && draft.serviceType === '上门美甲');
      });
      if (restoredOption) this._serviceOptionTouched = true;
      var addrUpdates = {};
      if (draft.selectedAddressId) {
        addrUpdates.selectedAddressId = draft.selectedAddressId;
        addrUpdates.selectedAddress = draft.selectedAddress || null;
      }
      this.setData({
        serviceType: restoredOption ? restoredOption.type : this.data.serviceType,
        selectedServiceOptionKey: restoredOption ? restoredOption.key : this.data.selectedServiceOptionKey,
        selectedShopName: restoredOption && restoredOption.type === '到店美甲' ? draft.selectedShopName : this.data.selectedShopName,
        selectedAddress: addrUpdates.selectedAddress !== undefined ? addrUpdates.selectedAddress : this.data.selectedAddress,
        selectedAddressId: addrUpdates.selectedAddressId !== undefined ? addrUpdates.selectedAddressId : this.data.selectedAddressId,
        selectedServiceIds: draft.selectedServiceIds || [],
        selectedServiceMap: selectionMap(draft.selectedServiceIds),
        isCustomService: Boolean(draft.isCustomService),
        customTitle: draft.customTitle || '',
        customDesc: draft.customDesc || '',
        customImages: draft.customImages || [],
        selectedWorkIds: draft.selectedWorkIds || [],
        selectedWorkMap: selectionMap(draft.selectedWorkIds),
        serviceDate: this._resumeDraft ? (draft.serviceDate || this.data.serviceDate) : this.data.serviceDate,
        startTime: this._resumeDraft ? (draft.startTime || '') : (this._presetTime || ''),
        remark: draft.remark || ''
      });
      var summary = summarizeServices(this.data.activeServiceItems, draft.selectedServiceIds || []);
      this.setData({
        selectedServiceCount: summary.count,
        selectedServiceTotal: summary.totalPrice,
        selectedServiceDuration: summary.totalDurationMinutes
      });
      this.updateDeposit();
    }
  },

  handleSubmit: async function () {
    var self = this;
    var d = self.data;
    if (d.submitting) return;
    if (this._sourceLoading || this._sourceFailed) { wx.showToast({ title: '请等待作品加载成功后再提交', icon: 'none' }); return; }
    if (!d.selectedTechId) { wx.showToast({ title: '请选择美甲师', icon: 'none' }); return; }
    if (!this.checkBookingAvailability()) return;
    if (!d.serviceType) { wx.showToast({ title: '请选择服务类型', icon: 'none' }); return; }
    if (!d.serviceDate) { wx.showToast({ title: '请选择日期', icon: 'none' }); return; }
    if (!d.startTime) { wx.showToast({ title: '请选择时间', icon: 'none' }); return; }
    if (d.serviceType === '到店美甲' && !d.selectedShopName) { wx.showToast({ title: '请选择门店', icon: 'none' }); return; }
    // 服务非必填：无服务时由确认弹窗提醒用户；未定价作品按待报价流程发起
    if (this.sourceWorkId && !d.sourceWork) { wx.showToast({ title: '请等待作品加载成功后再提交', icon: 'none' }); return; }

    this._submitRequested = true;
    this.saveDraft();
    if (this.sourceWorkId) {
      // 预约同款最优路径：信息齐全直接提交，免去多层确认弹窗阻碍
      return this.doSubmit();
    }
    if (!this._fullMode || d.quickMode) {
      this.setData({ showQuickConfirm: true });
      return;
    }
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

  goToOrders: function () {
    wx.reLaunch({ url: '/pages/client/orders/index' });
  },

  showServiceDetail: function () {
    this.setData({ showServiceDetailModal: true });
  },

  hideServiceDetail: function () {
    this.setData({ showServiceDetailModal: false });
  },

  confirmQuickSubmit: function () {
    this.setData({ showQuickConfirm: false });
    this.doSubmit();
  },

  cancelQuickSubmit: function () {
    this.setData({ showQuickConfirm: false });
  },

  closeConflictTimePicker: function () {
    this.setData({ showConflictTimePicker: false, bookingConflictMessage: '' });
  },

  confirmConflictTime: function () {
    if (!this.data.startTime) {
      wx.showToast({ title: '请选择新的预约时间', icon: 'none' });
      return;
    }
    this.setData(
      { showConflictTimePicker: false, bookingConflictMessage: '' },
      () => this.doSubmit()
    );
  },

  previewWork: function (e) {
    var id = Number(e.currentTarget.dataset.id);
    var works = this.data.techWorks;
    var idx = works.findIndex(function (w) { return w.id === id; });
    if (idx < 0) return;
    this.setData({ showWorkPreview: true, previewWorkData: works[idx], previewWorkIndex: idx });
  },

  prevWork: function () {
    var idx = this.data.previewWorkIndex - 1;
    if (idx < 0) return;
    this.setData({ previewWorkData: this.data.techWorks[idx], previewWorkIndex: idx });
  },

  nextWork: function () {
    var idx = this.data.previewWorkIndex + 1;
    if (idx >= this.data.techWorks.length) return;
    this.setData({ previewWorkData: this.data.techWorks[idx], previewWorkIndex: idx });
  },

  toggleWorkFromPreview: function (e) {
    var id = Number(e.currentTarget.dataset.id);
    if (!id) return;
    this.setData({ showWorkPreview: false });
    this.selectWorkSameStyle(id);
  },

  closeWorkPreview: function () {
    this.setData({ showWorkPreview: false, previewWorkData: null });
  },

  previewFullImage: function (e) {
    var url = e.currentTarget.dataset.url;
    if (url) wx.previewImage({ urls: [url], current: url });
  },

  doSubmit: async function () {
    var self = this;
    var d = self.data;
    if (!this.requireClientLogin()) return;
    if (d.needsBinding) {
      wx.showToast({ title: '请返回主页重新发起预约', icon: 'none' });
      return;
    }
    if (d.submitting || !this.checkBookingAvailability() || !d.startTime) return;
    self.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    var payload = {
      expectedDepositMode: d.depositMode, expectedDepositValue: d.depositValue,
      expectedHomeServiceFeeFen: d.serviceType === '上门美甲' && d.homeQuote ? d.homeQuote.feeFen : undefined,
      expectedPriceFen: self.expectedPriceFen() == null ? undefined : self.expectedPriceFen(),
      applicationKey:self.applicationKey,
      techId: d.selectedTechId,
      serviceDate: d.serviceDate,
      startTime: d.startTime,
      serviceType: d.serviceType,
      remark: d.remark || undefined
    };
    if (d.quickMode && (!self.sourceWorkId || d.referenceOnly)) payload.quickBooking = true;
    if (d.referenceOnly && self.sourceWorkId) payload.referenceOnly = true;
    if (self.sourceWorkId) payload.sourceWorkId = self.sourceWorkId;
    if (self.sourceWorkId && self._attributionSource) payload.attributionSource = self._attributionSource;
    if (self.sourceWorkId && self.sourceShareToken) payload.sourceShareToken = self.sourceShareToken;
    if (d.serviceType === '到店美甲') {
      var shop = d.shopAddresses.find(function (s) { return s.name === d.selectedShopName; });
      if (shop) payload.shopAddress = shop;
      else if (d.shopAddresses.length > 0) {
        wx.hideLoading();
        wx.showToast({ title: '请选择到店门店', icon: 'none' });
        self.setData({ submitting: false });
        return;
      }
    } else if (d.serviceType === '上门美甲') {
      if (!d.selectedAddressId) {
        wx.hideLoading();
        wx.showToast({ title: '请选择上门服务地址', icon: 'none' });
        self.setData({ submitting: false });
        return;
      }
      payload.addressId = d.selectedAddressId;
    }
    if (self.sourceWorkId) {
      // 作品预约的服务与价格均由后端按作品快照生成。
    } else if (d.isCustomService || d.quickMode) {
      payload.customTitle = d.customTitle.trim();
      if (d.customDesc.trim()) payload.customDescription = d.customDesc.trim();
      if (d.customImages.length > 0) payload.customImages = d.customImages;
      if (d.selectedWorkIds.length > 0) payload.intentWorkIds = d.selectedWorkIds;
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
      wx.removeStorageSync(DRAFT_KEY);
      self.applicationKey = '';
      if (!self._pageActive) { self._submittedWhileHidden = true; return; }
      var isQuoteBranch = Boolean(d.referenceOnly || !payload.expectedPriceFen || d.isCustomService);
      self.setData({
        submitSuccess: true,
        submitSuccessTech: (d.selectedTech || {}).name || '美甲师',
        submitSuccessType: isQuoteBranch ? 'quote' : 'confirm'
      });
      self._navTimer = setTimeout(function () { if (self._pageActive) wx.reLaunch({ url: '/pages/client/orders/index' }); }, 2500);
    }).catch(function (err) {
      wx.hideLoading();
      if (!self._pageActive) { self._submitFinishedWhileHidden = true; return; }
      var message = err.message || '提交失败';
      var isBookingConflict = message.indexOf('重新选择预约时间') >= 0 ||
        message.indexOf('时间段已被预约') >= 0 ||
        message.indexOf('时间段已经被其他用户预约') >= 0;
      if (isBookingConflict) {
        self.setData({
          startTime: '',
          bookingConflictMessage: '该时间已被预约，请重新选择其他可用时间。',
          showConflictTimePicker: true
        });
        self.saveDraft();
        return;
      }
      wx.showToast({ title: message, icon: 'none' });
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
    api.client.profile.bindTechnician(self.data.bindTechId, code, '从预约页直接绑定', 'booking').then(function () {
      wx.showModal({ title:'绑定成功', content:'已与该美甲师建立关系，现在可以继续预约。', showCancel:false, confirmText:'继续预约' });
      self.setData({ showBindTech: false, bindInviteCode: '', bindTechName: '', bindTechId:0, bindError: '', bindChecking: false });
      if (typeof self.loadTechnicians === 'function') self.loadTechnicians();
    }).catch(function (err) {
      self.setData({ bindChecking: false, bindError: err.message || '绑定失败，请重试' });
    });
  },

  cancelBindTech: function () {
    this.setData({ showBindTech: false, bindInviteCode: '', bindTechName: '', bindTechId:0, bindError: '', bindChecking: false });
    wx.navigateBack();
  }
});
