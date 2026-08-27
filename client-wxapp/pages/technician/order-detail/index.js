const api = require('../../../services/api');
const { normalizeSourceWorkSummary } = require('../../../utils/normalize-work');
const { requestBookingReminder } = require('../../../utils/wechat-subscription');
const {
  parseDate,
  formatClock,
  formatBookingDate,
  formatMoney
} = require('../../../utils/format');
const {
  normalizeOrder,
  normalizeDepositAmount,
  resolveOrderPresentation,
  getStatusLabel,
  getStatusTone
} = require('../../../utils/order');

// 状态描述 - 帮助技师理解预约当前阶段
const STATUS_DESC = {
  pending_quote:   '客户已发起预约，请尽快给出报价',
  pending_agree:   '已发送报价，等待客户确认',
  pending_client_confirm: '预约链接已发送，等待客户确认',
  pending_confirm: '客户已同意报价，请确认到店排期',
  pending_shop:    '已确认排期，记得准时到店',
  in_progress:     '服务进行中',
  completed:       '预约已完成',
  cancelled:       '预约已取消'
};

// 按状态返回详情页底部应显示的动作
function actionsForStatus(status) {
  const QUOTE  = { key: 'quote',   label: '发送报价', style: 'action-primary' };
  const CONFIRM= { key: 'confirm', label: '确认排期', style: 'action-primary' };
  const COMPLETE={ key: 'complete',label: '确认完成', style: 'action-primary' };
  const CANCEL = { key: 'cancel',  label: '取消预约', style: 'action-danger' };

  switch (status) {
    case 'pending_quote':   return [QUOTE, CANCEL];
    case 'pending_agree':   return [CANCEL];
    case 'pending_client_confirm': return [CANCEL];
    case 'pending_confirm': return [CANCEL, CONFIRM];
    case 'pending_shop':    return [CANCEL];
    case 'in_progress':     return [CANCEL, COMPLETE];
    default:                return [];
  }
}

// 取消原因常用项
const CANCEL_REASONS = ['客户临时取消', '档期冲突', '双方未能确认时间', '其他'];

function maskPhone(phone) {
  if (!phone) return '';
  const p = String(phone);
  if (p.length < 7) return p;
  return p.slice(0, 3) + '****' + p.slice(-4);
}

function todayISO() {
  const d = new Date();
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

Page({
  data: {
    order: null,
    orderId: '',
    loading: true,
    loadFailed: false,
    loadErrorText: '',
    shopGuidance: null,
    guidanceShop: null,

    todayDate: todayISO(),

    // 报价 sheet
    showQuote: false,
    quoteIsRevise: false,
    quotePrice: '',
    quoteDate: '',
    quoteTime: '',
    quoteDuration: '120',
    quoteRemark: '',
    quoteServices: [],
    quoteSelectedServiceIds: [],
    quoteSubtotalFen: 0,
    quoteDiscount: '',
    quoteFinalFen: 0,
    quoteTotalDuration: 0,
    quoteDepositAmount: '',
    quoteDepositPaid: false,

    // 取消 sheet
    showCancel: false,
    cancelReason: '',
    cancelReasons: CANCEL_REASONS,
    cancelRefundDeposit: null,

    // 服务项目编辑 sheet
    showServiceEdit: false,
    showActionMenu: false,
    editAllServices: [],
    editSubtotalFen: 0,
    editTotalDuration: 0,
    serviceEditSubmitting: false,

    // 报价调整 sheet
    showEditPrice: false,
    editQuotePrice: '',
    editDepositAmount: '',
    editDepositPaid: false,
    editPriceSubmitting: false,

    // 完成及实际支付金额
    showActualAmount: false,
    actualAmountInput: '',
    actualAmountMode: 'complete',

    submitting: false
  },

  onLoad(options) {
    this.orderId = options.id;
    this.setData({ orderId: this.orderId || '' });
    this.pendingAction = options.action || ''; // 来自列表传参，例如 quote
    if (this.orderId) this.loadOrder();
    else this.setData({ loading: false, loadFailed: true, loadErrorText: '预约参数无效' });
  },

  onShow() {
    if (!this.orderId) return;
    if (!this.data.loading) this.loadOrder();
  },

  onPullDownRefresh() {
    this.loadOrder().finally(() => wx.stopPullDownRefresh());
  },

  // ---------- 数据加载 ----------
  async loadOrder() {
    if (this._loadingOrder || !this.orderId) return;
    this._loadingOrder = true;
    this.setData({ loading: true, loadFailed: false, loadErrorText: '' });
    try {
      const result = await Promise.all([
        api.technician.orders.detail(this.orderId),
        api.technician.services.list(),
        api.technician.auth.getUserInfo()
      ]);
      const raw = result[0];
      const quoteServices = (result[1] || []).filter(item => item.isActive !== false);
      const technicianProfile = result[2] || {};
      let sourceWork = raw.sourceWork || null;
      const sourceWorkId = raw.sourceWorkId || (sourceWork && sourceWork.id);
      if (sourceWorkId && (!sourceWork || !normalizeSourceWorkSummary(sourceWork)._priceFen)) {
        try { sourceWork = await api.technician.works.detail(sourceWorkId); } catch (e) {}
      }
      sourceWork = normalizeSourceWorkSummary(sourceWork);
      const o = normalizeOrder(raw);

      // 补充详情页专有字段
      o.orderNo = raw.orderNo;
      o.remark = raw.remark || raw.note || '';

      const start = parseDate(o.startTime);
      const end = parseDate(o.endTime);
      o.durationMinutes = start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0;

      const pres = resolveOrderPresentation(o);

      // 是否显示价格卡
      const price = raw.quotePrice || raw.price || 0;
      const depositAmount = normalizeDepositAmount(raw);
      const serviceSubtotalFen = Number(raw.serviceSubtotalFen || 0);
      const showPriceCard = price > 0 || depositAmount > 0 || serviceSubtotalFen > 0 || (raw.serviceLines && raw.serviceLines.length > 0);

      const quotePriceFen = Math.round(price * 100);
      // 未设置报价时默认=服务合计，差额为0
      const effectivePriceFen = quotePriceFen > 0 ? quotePriceFen : serviceSubtotalFen;
      const priceDiffFen = quotePriceFen > 0 ? (quotePriceFen - serviceSubtotalFen) : 0;

      const decorated = {
        ...o,
        techId: o.techId || raw.techId || raw.technicianId || (raw.technician && raw.technician.id),
        _statusLabel: getStatusLabel(o.status),
        _statusTone:  getStatusTone(o.status),
        _statusDesc:  STATUS_DESC[o.status] || '',
        _typeLabel:   pres.typeLabel,
        _typeClass:   pres.typeClass,
        _dateLabel:   formatBookingDate(o.startTime),
        _timeRange:   start && end
          ? `${formatClock(o.startTime)} - ${formatClock(o.endTime)}`
          : formatClock(o.startTime),
        _priceText:   price ? formatMoney(price) : (serviceSubtotalFen > 0 ? formatMoney(serviceSubtotalFen / 100) : '待报价'),
        _customerPhoneMasked: maskPhone(o.customerPhone),
        _showPriceCard: showPriceCard,
        _actions: actionsForStatus(o.status),
        serviceLines: (raw.serviceLines || []).map(line => ({
          id: line.id,
          name: line.nameSnapshot || line.name || '服务',
          quantity: line.quantity || 1,
          unitPriceFen: line.unitPriceFen || 0,
          subtotalFen: line.subtotalFen || 0,
          servicePublicIdSnapshot: line.servicePublicIdSnapshot || null,
        })),
        serviceSubtotalFen: serviceSubtotalFen,
        _priceDiffFen: priceDiffFen,
        _priceDiffType: priceDiffFen > 0 ? 'surcharge' : (priceDiffFen < 0 ? 'discount' : ''),
        discountAmountFen: Number(raw.discountAmountFen || 0),
        depositAmount: depositAmount,
        depositPaid: !!raw.isDepositPaid,
        actualAmount: raw.actualAmount == null ? price : Number(raw.actualAmount),
        _actualAmountText: formatMoney(raw.actualAmount == null ? price : Number(raw.actualAmount)),
        _depositStatusText: raw.isDepositPaid
          ? (depositAmount > 0 ? `已支付定金 ¥${depositAmount}` : '定金已支付')
          : (depositAmount > 0 ? `待支付定金 ¥${depositAmount}` : '未支付定金'),
        bookingType: raw.bookingType || 'legacy',
        sourceWork
      };
      const normalizedAddress = String(decorated.address || '').replace(/\s+/g, '');
      const guidanceShop = (technicianProfile.shopAddresses || []).find((shop) => {
        const fullAddress = [shop.province, shop.city, shop.district, shop.detailAddress].filter(Boolean).join('').replace(/\s+/g, '');
        const detailAddress = String(shop.detailAddress || '').replace(/\s+/g, '');
        return shop.enabled !== false && normalizedAddress && (fullAddress === normalizedAddress || (detailAddress && normalizedAddress.includes(detailAddress)) || fullAddress.includes(normalizedAddress));
      }) || null;
      const shopGuidance = guidanceShop?.guidance?.enabled ? guidanceShop.guidance : null;

      // 用拉到的数据预填报价表单
      const sd = start ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}` : '';
      const st = start ? formatClock(o.startTime) : '14:00';

      this.setData({
        order: decorated,
        shopGuidance,
        guidanceShop,
        loading: false,
        loadFailed: false,
        quotePrice: o.price ? String(o.price) : '',
        quoteDate: sd,
        quoteTime: st,
        quoteDuration: decorated.durationMinutes > 0 ? String(decorated.durationMinutes) : '120',
        quoteRemark: o.remark || ''
        ,        quoteServices,
        quoteSelectedServiceIds: (raw.serviceLines || []).map(line => {
          const matched = quoteServices.find(s => s.publicId === line.servicePublicIdSnapshot || s.name === line.nameSnapshot);
          return matched ? String(matched.id) : null;
        }).filter(Boolean),
        quoteDiscount: raw.discountAmountFen ? String(raw.discountAmountFen / 100) : ''
        ,quoteDepositAmount: depositAmount ? String(depositAmount) : ''
        ,quoteDepositPaid: !!raw.isDepositPaid
      });
      this.recalculateQuote();

      // 从列表跳来时如果带 action=quote，直接打开报价 sheet
      if (this.pendingAction === 'quote' && actionsForStatus(o.status).some((a) => a.key === 'quote')) {
        this.pendingAction = '';
        setTimeout(() => this.openQuote(), 100);
      }
    } catch (err) {
      this.setData({ loading: false, loadFailed: true, loadErrorText: '预约暂时无法加载' });
    } finally {
      this._loadingOrder = false;
    }
  },

  // ---------- 操作分发 ----------
  onAction(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ showActionMenu: false });
    switch (key) {
      case 'quote':    return this.openQuote();
      case 'confirm':  return this.confirmOrder();
      case 'complete': return this.completeOrder();
      case 'cancel':   return this.openCancel();
    }
  },

  openActionMenu() { this.setData({ showActionMenu: true }); },
  closeActionMenu() { this.setData({ showActionMenu: false }); },

  viewSourceWork() {
    const sourceWork = this.data.order && this.data.order.sourceWork;
    if (sourceWork && sourceWork.id) wx.navigateTo({ url: `/pages/technician/work-detail/index?id=${sourceWork.id}` });
  },

  // ---------- 客户操作 ----------
  callCustomer() {
    const phone = this.data.order && this.data.order.customerPhone;
    if (!phone) {
      wx.showToast({ title: '暂无电话', icon: 'none' });
      return;
    }
    wx.makePhoneCall({ phoneNumber: String(phone) });
  },

  navigateToAddress() {
    const addr = this.data.order && this.data.order.address;
    if (!addr) return;
    // 美甲师自己的店铺有坐标，直接从本地缓存或接口获取
    const tryOpen = (lat, lng) => {
      if (lat && lng) {
        wx.openLocation({ latitude: lat, longitude: lng, name: '服务地址', address: addr, scale: 18 });
      } else {
        wx.setClipboardData({ data: addr, success: () => wx.showToast({ title: '地址已复制，请打开导航 App 粘贴', icon: 'none', duration: 2500 }) });
      }
    };
    // 优先从已加载的 userInfo 中取 shopAddresses
    const cached = wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || {};
    const shops = (cached.shopAddresses || []).filter(s => s.enabled !== false);
    const normAddr = addr.replace(/\s+/g, '');
    let matched = shops.find(s => {
      const full = ((s.province || '') + (s.city || '') + (s.district || '') + (s.detailAddress || '')).replace(/\s+/g, '');
      return full === normAddr || normAddr.indexOf((s.detailAddress || '').replace(/\s+/g, '')) >= 0;
    });
    if (!matched) matched = shops.find(s => s.latitude && s.longitude) || null;
    if (matched) {
      tryOpen(parseFloat(matched.latitude), parseFloat(matched.longitude));
    } else {
      // 缓存没有则异步拉取
      api.technician.auth.getUserInfo().then(res => {
        const allShops = (res.shopAddresses || []).filter(s => s.enabled !== false);
        let m = allShops.find(s => {
          const full = ((s.province || '') + (s.city || '') + (s.district || '') + (s.detailAddress || '')).replace(/\s+/g, '');
          return full === normAddr || normAddr.indexOf((s.detailAddress || '').replace(/\s+/g, '')) >= 0;
        });
        if (!m) m = allShops.find(s => s.latitude && s.longitude) || null;
        tryOpen(m ? parseFloat(m.latitude) : 0, m ? parseFloat(m.longitude) : 0);
      }).catch(() => tryOpen(0, 0));
    }
  },

  openShopGuidance() {
    const order = this.data.order;
    const shop = this.data.guidanceShop;
    const techId = order && (order.techId || order.technicianId);
    if (!techId || !shop) return;
    wx.navigateTo({ url: `/pages/client/shop-guidance/index?techId=${techId}&shopName=${encodeURIComponent(shop.name || '')}&address=${encodeURIComponent(order.address || '')}` });
  },

  onShareAppMessage() {
    const order = this.data.order;
    const shop = this.data.guidanceShop;
    const techId = order && (order.techId || order.technicianId);
    if (!this.data.shopGuidance || !techId || !shop) return { title: '预约详情', path: `/pages/technician/order-detail/index?id=${this.orderId}` };
    return {
      title: `${shop.name || '美甲工作室'}到店指引`,
      path: `/pages/client/shop-guidance/index?techId=${techId}&shopName=${encodeURIComponent(shop.name || '')}&address=${encodeURIComponent(order.address || '')}`
    };
  },

  // ---------- 报价 ----------
  openQuote() {
    const status = this.data.order && this.data.order.status;
    this.setData({
      showQuote: true,
      quoteIsRevise: status !== 'pending_quote'
    });
  },
  closeQuote() { this.setData({ showQuote: false }); },

  onQuoteDateChange(e)    { this.setData({ quoteDate: e.detail.value }); },
  onQuoteTimeChange(e)    { this.setData({ quoteTime: e.detail.value }); },
  toggleQuoteService(e) {
    const id = String(e.currentTarget.dataset.id);
    const ids = this.data.quoteSelectedServiceIds.includes(id)
      ? this.data.quoteSelectedServiceIds.filter(item => item !== id)
      : this.data.quoteSelectedServiceIds.concat(id);
    this.setData({ quoteSelectedServiceIds: ids });
    this.recalculateQuote();
  },
  onQuoteDiscountInput(e) { this.setData({ quoteDiscount: e.detail.value }); this.recalculateQuote(e.detail.value); },
  recalculateQuote(discountValue) {
    const selected = this.data.quoteServices.filter(item => this.data.quoteSelectedServiceIds.includes(String(item.id)));
    const subtotal = selected.reduce((sum, item) => sum + Math.round(Number(item.price || 0) * 100), 0);
    const duration = selected.reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0);
    const discountFen = Math.max(0, Math.round(Number(discountValue !== undefined ? discountValue : this.data.quoteDiscount || 0) * 100));
    this.setData({ quoteSubtotalFen: subtotal, quoteFinalFen: Math.max(0, subtotal - discountFen), quoteTotalDuration: duration });
  },
  onQuoteRemarkInput(e)   { this.setData({ quoteRemark: e.detail.value }); },
  onQuoteDepositAmountInput(e) { this.setData({ quoteDepositAmount: e.detail.value }); },
  onQuoteDepositPaidChange(e) { this.setData({ quoteDepositPaid: e.detail.value }); },

  async submitQuote() {
    if (this.data.submitting) return;
    const { quoteDate, quoteTime, quoteRemark, quoteSelectedServiceIds, quoteDiscount, quoteSubtotalFen } = this.data;
    if (!quoteSelectedServiceIds.length) return wx.showToast({ title: '请选择至少一项基础服务', icon: 'none' });
    if (!quoteDate) return wx.showToast({ title: '请选择服务日期', icon: 'none' });
    if (!quoteTime) return wx.showToast({ title: '请选择服务时间', icon: 'none' });

    const discountAmountFen = Math.round(Number(quoteDiscount || 0) * 100);
    if (discountAmountFen < 0 || discountAmountFen > quoteSubtotalFen) return wx.showToast({ title: '优惠金额不能超过服务合计', icon: 'none' });

    const depositAmt = this.data.quoteDepositAmount;
    const depositFen = Math.round(Number(depositAmt || 0) * 100);
    if (this.data.quoteDepositPaid && (!depositAmt || !Number.isFinite(depositFen) || depositFen <= 0)) {
      return wx.showToast({ title: '定金已支付时，请填写大于 0 的定金金额', icon: 'none' });
    }

    this.setData({ submitting: true });
    try {
      const payload = {
        services: quoteSelectedServiceIds.map(servicePublicId => ({ servicePublicId, quantity: 1 })),
        serviceDate: quoteDate,
        startTime: quoteTime,
        discountAmountFen
      };
      if (quoteRemark) payload.remark = quoteRemark;
      // 定金数据
      if (depositAmt !== '' && depositAmt !== undefined) {
        payload.depositAmount = Number(depositAmt);
      }
      payload.isDepositPaid = !!this.data.quoteDepositPaid;
      await api.technician.orders.quote(this.orderId, payload);
      this.setData({ submitting: false, showQuote: false });
      wx.showToast({ title: '报价已发送', icon: 'success' });
      this.loadOrder();
    } catch (err) {
      this.setData({ submitting: false });
      wx.showToast({ title: err.message || '报价失败', icon: 'none' });
    }
  },

  // ---------- 确认 ----------
  async confirmOrder() {
    const r = await wx.showModal({
      title: '确认排期',
      content: '确认接此到店预约？实际付款由门店与客户线下完成。',
      confirmText: '已确认'
    });
    if (!r.confirm) return;
    await requestBookingReminder('technician');

    try {
      wx.showLoading({ title: '处理中...' });
      await api.technician.orders.confirm(this.orderId);
      wx.hideLoading();
      wx.showToast({ title: '已确认', icon: 'success' });
      this.loadOrder();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  // ---------- 报价调整 ----------
  openEditPrice() {
    var o = this.data.order;
    if (!o) return;
    var defaultPrice = o.price || (o.serviceSubtotalFen > 0 ? o.serviceSubtotalFen / 100 : '');
    this.setData({
      showEditPrice: true,
      editQuotePrice: defaultPrice ? String(defaultPrice) : '',
      editDepositAmount: o.depositAmount ? String(o.depositAmount) : '',
      editDepositPaid: !!o.depositPaid,
      editPriceSubmitting: false
    });
  },
  closeEditPrice() { this.setData({ showEditPrice: false }); },
  onEditQuotePriceInput(e) { this.setData({ editQuotePrice: e.detail.value }); },
  onEditDepositAmountInput(e) { this.setData({ editDepositAmount: e.detail.value }); },
  onEditDepositPaidChange(e) { this.setData({ editDepositPaid: e.detail.value }); },

  async submitEditPrice() {
    if (this.data.editPriceSubmitting) return;
    var priceStr = this.data.editQuotePrice;
    var priceFen = priceStr ? Math.round(Number(priceStr) * 100) : 0;
    if (priceStr && (isNaN(priceFen) || priceFen < 0)) {
      return wx.showToast({ title: '请输入有效的报价金额', icon: 'none' });
    }
    var depositStr = this.data.editDepositAmount;
    var depositFen = depositStr ? Math.round(Number(depositStr) * 100) : 0;
    if (depositStr && (isNaN(depositFen) || depositFen < 0)) {
      return wx.showToast({ title: '请输入有效的定金金额', icon: 'none' });
    }
    if (this.data.editDepositPaid && depositFen <= 0) {
      return wx.showToast({ title: '定金已支付时，请填写大于 0 的定金金额', icon: 'none' });
    }
    this.setData({ editPriceSubmitting: true });
    try {
      var payload = {
        price: priceFen / 100,
        depositAmount: Number(depositStr || 0),
        isDepositPaid: !!this.data.editDepositPaid
      };
      await api.technician.orders.update(this.orderId, payload);
      this.setData({ editPriceSubmitting: false, showEditPrice: false });
      wx.showToast({ title: '报价已更新', icon: 'success' });
      this.loadOrder();
    } catch (err) {
      this.setData({ editPriceSubmitting: false });
      wx.showToast({ title: err.message || '更新失败', icon: 'none' });
    }
  },

  // ---------- 确认完成 / 修改实际支付金额 ----------
  completeOrder() {
    const order = this.data.order;
    if (!order) return;
    wx.navigateTo({
      url: `/pages/technician/complete-service/index?id=${this.orderId}`
    });
  },
  openEditActualAmount() {
    const order = this.data.order;
    if (!order || order.status !== 'completed') return;
    this.setData({
      showActualAmount: true,
      actualAmountMode: 'edit',
      actualAmountInput: String(order.actualAmount == null ? (order.price || 0) : order.actualAmount)
    });
  },
  closeActualAmount() { this.setData({ showActualAmount: false }); },
  onActualAmountInput(e) { this.setData({ actualAmountInput: e.detail.value }); },
  async submitActualAmount() {
    if (this.data.submitting) return;
    const amount = Number(this.data.actualAmountInput);
    if (!Number.isFinite(amount) || amount < 0) return wx.showToast({ title: '请输入正确的实际支付金额', icon: 'none' });
    this.setData({ submitting: true });
    try {
      if (this.data.actualAmountMode === 'edit') {
        await api.technician.orders.updateActualAmount(this.orderId, amount);
      } else {
        await api.technician.orders.complete(this.orderId, { actualAmount: amount });
      }
      this.setData({ submitting: false, showActualAmount: false });
      wx.showToast({ title: this.data.actualAmountMode === 'edit' ? '金额已更新' : '预约已完成', icon: 'success' });
      this.loadOrder();
    } catch (err) {
      this.setData({ submitting: false });
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  },

  // ---------- 编辑预约时间（跳转日历页）----------
  editBookingTime() {
    var o = this.data.order;
    if (!o) return;
    var start = parseDate(o.startTime);
    var dateStr = start ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}` : '';
    var timeStr = start ? formatClock(o.startTime) : '';
    var params = [
      `id=${this.orderId}`,
      `date=${dateStr}`,
      `time=${timeStr}`,
      `duration=${o.durationMinutes || 120}`,
      `serviceType=${encodeURIComponent(o.serviceType || 'shop')}`,
      `shopName=${encodeURIComponent(o.shopName || '')}`,
      `address=${encodeURIComponent(o.address || '')}`
    ];
    wx.navigateTo({
      url: `/pages/technician/edit-booking-time/index?${params.join('&')}`
    });
  },

  // ---------- 编辑服务项目 ----------
  openServiceEdit() {
    var o = this.data.order;
    if (!o) return;
    // 统计当前预约中每个服务的数量
    var lineCounts = {};
    (o.serviceLines || []).forEach(function(line) {
      var key = line.servicePublicIdSnapshot || line.name;
      lineCounts[key] = (lineCounts[key] || 0) + 1;
    });
    // 构建全部服务列表，标记当前数量
    var allServices = (this.data.quoteServices || []).map(function(s) {
      var key = s.publicId || String(s.id);
      return {
        id: s.id,
        publicId: s.publicId || '',
        name: s.name,
        price: Number(s.price || 0),
        priceFen: Math.round(Number(s.price || 0) * 100),
        durationMinutes: Number(s.durationMinutes || 0),
        quantity: lineCounts[key] || lineCounts[s.name] || 0
      };
    });
    this._recalcServiceEdit(allServices);
    this.setData({ showServiceEdit: true, editAllServices: allServices });
  },
  closeServiceEdit() { this.setData({ showServiceEdit: false }); },

  svcIncrement(e) {
    var id = e.currentTarget.dataset.id;
    var list = this.data.editAllServices.map(function(s) {
      if (String(s.id) === String(id)) return Object.assign({}, s, { quantity: s.quantity + 1 });
      return s;
    });
    this._recalcServiceEdit(list);
    this.setData({ editAllServices: list });
  },

  svcDecrement(e) {
    var id = e.currentTarget.dataset.id;
    var list = this.data.editAllServices.map(function(s) {
      if (String(s.id) === String(id) && s.quantity > 0) return Object.assign({}, s, { quantity: s.quantity - 1 });
      return s;
    });
    this._recalcServiceEdit(list);
    this.setData({ editAllServices: list });
  },

  _recalcServiceEdit(list) {
    var subtotal = 0, duration = 0;
    list.forEach(function(s) {
      if (s.quantity > 0) {
        subtotal += s.priceFen * s.quantity;
        duration += s.durationMinutes * s.quantity;
      }
    });
    this.setData({ editSubtotalFen: subtotal, editTotalDuration: duration });
  },

  async submitServiceEdit() {
    if (this.data.serviceEditSubmitting) return;
    var services = [];
    this.data.editAllServices.forEach(function(s) {
      for (var i = 0; i < s.quantity; i++) {
        services.push({ servicePublicId: s.publicId || String(s.id), quantity: 1 });
      }
    });
    if (services.length === 0) return wx.showToast({ title: '请至少选择一项服务', icon: 'none' });
    this.setData({ serviceEditSubmitting: true });
    wx.showLoading({ title: '保存中...' });
    try {
      // 通过 review 端点更新服务组合（仅限 custom/legacy 类型且为 pending_quote/pending_agree 状态）
      var o = this.data.order;
      var canUseReview = (o.bookingType === 'custom' || o.bookingType === 'legacy') &&
        (o.status === 'pending_quote' || o.status === 'pending_agree');
      if (canUseReview) {
        await api.technician.orders.quote(this.orderId, { services: services });
      } else {
        // 其他状态/类型：通过 update 端点更新价格
        await api.technician.orders.update(this.orderId, { price: Math.round(this.data.editSubtotalFen / 100) });
      }
      wx.hideLoading();
      wx.showToast({ title: '服务已更新', icon: 'success' });
      this.setData({ showServiceEdit: false });
      this.loadOrder();
    } catch(err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ serviceEditSubmitting: false });
    }
  },

  // ---------- 取消 ----------
  openCancel() { this.setData({ showCancel: true, cancelReason: '', cancelRefundDeposit: null }); },
  closeCancel() { this.setData({ showCancel: false }); },
  onCancelReasonInput(e) { this.setData({ cancelReason: e.detail.value }); },
  onPickReason(e) {
    this.setData({ cancelReason: e.currentTarget.dataset.reason });
  },
  onPickRefundDeposit(e) {
    this.setData({ cancelRefundDeposit: e.currentTarget.dataset.value === 'true' });
  },

  async submitCancel() {
    if (this.data.submitting) return;
    if (this.data.order.depositPaid && this.data.cancelRefundDeposit == null) {
      return wx.showToast({ title: '请选择是否退还定金', icon: 'none' });
    }
    this.setData({ submitting: true });
    try {
      await api.technician.orders.cancel(this.orderId, {
        reason: this.data.cancelReason || undefined,
        refundDeposit: this.data.order.depositPaid ? this.data.cancelRefundDeposit : undefined
      });
      this.setData({ submitting: false, showCancel: false });
      wx.showToast({ title: '预约已取消', icon: 'success' });
      this.loadOrder();
    } catch (err) {
      this.setData({ submitting: false });
      wx.showToast({ title: err.message || '取消失败', icon: 'none' });
    }
  }
});
