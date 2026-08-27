const api = require('../../../services/api');
const { requestBookingReminder } = require('../../../utils/wechat-subscription');
const { summarizeServices } = require('../../../utils/service-pricing');
const DRAFT_KEY='client_booking_application_draft';

function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function dateStr(y,m,d) { return y + '-' + pad2(m+1) + '-' + pad2(d); }
function formatAddr(a) { return [a.province,a.city,a.district,a.detailAddress].filter(Boolean).join(' '); }

Page({
  data: {
    technicians: [],
    presetLocked: false,
    selectedTechId: 0,
    selectedTech: null,
    serviceType: '',
    availableServiceTypes: [],
    shopAddresses: [],
    selectedShopName: '',
    activeServiceItems: [],
    selectedServiceIds: [],
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
    bindError: ''
  },

  onLoad: function (options) {
    this._pageActive = true;
    var draft = wx.getStorageSync(DRAFT_KEY) || {};
    this.applicationKey = draft.applicationKey || ('booking-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
    var today = new Date();
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    var minDate = dateStr(today.getFullYear(), today.getMonth(), today.getDate());
    var defaultDate = dateStr(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    this.setData({
      minDate: minDate,
      serviceDate: defaultDate,
      remark: draft.remark || ''
    });
    this._bookingDraft = draft;
    // 从聊天「快速发起预约」进入：锁定美甲师为对话对象
    var presetTechId = options.techId || options.tech_id;
    if (presetTechId) {
      this._presetTechId = parseInt(presetTechId);
      this.setData({ presetLocked:true });
    }
    this.loadTechnicians();
    if (options.design_id) this.loadDesign(options.design_id);
    // 从作品详情「预约同款」进入：以该作品作为预约服务内容
    if (options.workId) this.loadWork(parseInt(options.workId));
  },

  onShow: function () {
    this._pageActive = true;
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

  // ── 数据加载 ─────────────────────────────

  loadTechnicians: function () {
    var self = this;
    api.auth.getUserInfo('client').then(function (res) {
      var bindings = res.bindings || wx.getStorageSync('client_bindings') || [];
      var techs = bindings.map(function (b) {
        var t = b.technician || b;
        return {
          id: t.id, name: t.name, avatarUrl: t.avatarUrl, city: t.city,
          status: t.status, shopService: t.shopService,
          shopAddresses: (t.shopAddresses || []).filter(function (sa) { return sa.enabled !== false; }),
          serviceItems: (t.serviceItems || []).filter(function (si) { return si.isActive; }),
          serviceSchedule: t.serviceSchedule || null,
          isDefault: b.isDefault || false
        };
      }).filter(function (t) { return t.status === 'active'; });
      self.setData({ technicians: techs });
      self.restoreDraft();

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
    api.client.works.detail(workId).then(function (w) {
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
      if (techId) self._presetTechId = techId;
      // 美甲师已加载则立即应用，否则等 loadTechnicians 完成后应用
      if (self.data.technicians.length > 0) self.applyWorkPrefill();
    }).catch(function (e) {
      console.error('loadWork', e);
      wx.showToast({ title: e.message || '请先绑定该美甲师后预约同款', icon: 'none' });
    });
  },

  applyWorkPrefill: function () {
    var pf = this._pendingWorkPrefill;
    if (!pf) return;
    // 先选中美甲师（会重置自定义字段），再写入作品内容
    if (pf.techId && this.data.selectedTechId !== pf.techId) {
      this.selectTechById(pf.techId);
    }
    this.setData({
      isCustomService: false,
      customTitle: pf.customTitle,
      customDesc: pf.customDesc,
      customImages: pf.customImages,
      sourceWork: pf,
      selectedServiceTotal: Number(pf.standardPriceFen || 0) / 100,
      selectedServiceDuration: pf.totalDurationMinutes,
      selectedServiceCount: (pf.serviceLines || []).length
    });
    this.sourceWorkId = pf.sourceWorkId;
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


  // ── 选择美甲师 ──────────────────────────

  selectTechById: function (id) {
    this.selectTech({ currentTarget: { dataset: { id: id } } });
  },

  selectTech: function (e) {
    var id = e.currentTarget.dataset.id;
    var tech = this.data.technicians.find(function (t) { return t.id === id; });
    if (!tech) return;
    this.sourceWorkId = null;
    var shopAddrs = tech.shopAddresses || [];
    var hasShop = tech.shopService && shopAddrs.length > 0;
    var types = hasShop
      ? [{ value: '到店美甲', label: '到店美甲', desc: '前往美甲师门店地址服务' }]
      : [];
    var serviceType = types.length > 0 ? types[0].value : '';
    var serviceItems = (tech.serviceItems || []).filter(function (item) {
      return item.isActive !== false && Number.isFinite(Number(item.price)) && Number(item.durationMinutes) > 0;
    });
    this.setData({
      selectedTechId: id, selectedTech: tech,
      serviceType: serviceType, availableServiceTypes: types,
      shopAddresses: shopAddrs, selectedShopName: '',
      activeServiceItems: serviceItems,
      selectedServiceIds: [], selectedWorkIds: [],
      selectedServiceCount: 0, selectedServiceTotal: 0, selectedServiceDuration: 0,
      // 美甲师无服务项目时自动切换到自定义需求模式
      isCustomService: serviceItems.length === 0,
      startTime: ''
    });
    this.loadTechWorks(id);
    // booking-time-picker 组件通过 techId observer 自动加载排班和占用数据
  },

  onBookingTimeChange: function (e) {
    var detail = e.detail;
    this.setData({ serviceDate: detail.serviceDate, startTime: detail.startTime });
  },

  // ── 服务类型 ─────────────────────────────

  selectShopAddress: function (e) {
    this.setData({ selectedShopName: e.currentTarget.dataset.name, startTime: '' });
    // booking-time-picker 组件通过 shopName 属性变化自动刷新
  },

  openShopGuidance: function (e) {
    var shop = this.data.shopAddresses[parseInt(e.currentTarget.dataset.idx)];
    if (!shop || !this.data.selectedTechId) return;
    var address = [shop.province, shop.city, shop.district, shop.detailAddress].filter(Boolean).join('');
    wx.navigateTo({ url: '/pages/client/shop-guidance/index?techId=' + this.data.selectedTechId + '&shopName=' + encodeURIComponent(shop.name || '') + '&address=' + encodeURIComponent(address) });
  },

  // ── 自定义 / 标准服务切换 ──────────────

  switchContentMode: function (e) {
    if (this.sourceWorkId) return;
    var mode = e.currentTarget.dataset.mode;
    if (mode === 'standard') this.sourceWorkId = null;
    this.setData({
      isCustomService: mode === 'custom',
      selectedServiceIds: [],
      selectedServiceCount: 0,
      selectedServiceTotal: 0,
      selectedServiceDuration: 0
    });
  },

  toggleService: function (e) {
    var id = e.currentTarget.dataset.id;
    var ids = this.data.selectedServiceIds.slice();
    var idx = ids.indexOf(id);
    if (idx >= 0) ids.splice(idx, 1); else ids.push(id);
    var summary = summarizeServices(this.data.activeServiceItems, ids);
    this.setData({
      selectedServiceIds: ids,
      selectedServiceCount: summary.count,
      selectedServiceTotal: summary.totalPrice,
      selectedServiceDuration: summary.totalDurationMinutes
    });
  },

  onCustomTitleInput: function (e) { this.setData({ customTitle: e.detail.value }); },
  onCustomDescInput: function (e) { this.setData({ customDesc: e.detail.value }); },

  chooseImage: function () {
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
      selectedTechId: d.selectedTechId,
      serviceType: d.serviceType,
      selectedShopName: d.selectedShopName,
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
    if (draft.selectedTechId && this.data.technicians.some(function (item) { return item.id === draft.selectedTechId; })) {
      this.selectTechById(draft.selectedTechId);
      this.setData({
        serviceType: draft.serviceType || this.data.serviceType,
        selectedShopName: draft.selectedShopName || '',
        selectedServiceIds: draft.selectedServiceIds || [],
        isCustomService: Boolean(draft.isCustomService),
        customTitle: draft.customTitle || '',
        customDesc: draft.customDesc || '',
        customImages: draft.customImages || [],
        serviceDate: draft.serviceDate || this.data.serviceDate,
        startTime: draft.startTime || this.data.startTime,
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

  handleSubmit: function () {
    var d = this.data;
    if (d.submitting) return;
    if (!d.selectedTechId) { wx.showToast({ title: '请选择美甲师', icon: 'none' }); return; }
    if (!d.serviceType) { wx.showToast({ title: '请选择服务类型', icon: 'none' }); return; }
    if (!d.serviceDate) { wx.showToast({ title: '请选择日期', icon: 'none' }); return; }
    if (!d.startTime) { wx.showToast({ title: '请选择时间', icon: 'none' }); return; }
    if (d.serviceType === '到店美甲' && !d.selectedShopName) { wx.showToast({ title: '请选择门店', icon: 'none' }); return; }
    if (!this.sourceWorkId && d.isCustomService && !d.customTitle.trim()) { wx.showToast({ title: '请输入服务名称', icon: 'none' }); return; }
    if (!this.sourceWorkId && !d.isCustomService && d.selectedServiceIds.length === 0) { wx.showToast({ title: '请选择服务内容', icon: 'none' }); return; }
    if (this.sourceWorkId && (!d.sourceWork || !d.sourceWork.pricingReady)) { wx.showToast({ title: '该作品尚未完善服务与标准报价', icon: 'none' }); return; }

    this.saveDraft();
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

  doSubmit: function () {
    var self = this;
    var d = self.data;
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
    if (self.sourceWorkId) payload.sourceWorkId = self.sourceWorkId;
    if (d.serviceType === '到店美甲') {
      var shop = d.shopAddresses.find(function (s) { return s.name === d.selectedShopName; });
      if (shop) payload.shopAddress = shop;
    }
    if (self.sourceWorkId) {
      // 作品预约的服务与价格均由后端按作品快照生成。
    } else if (d.isCustomService) {
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
          shopAddress: payload.shopAddress
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
