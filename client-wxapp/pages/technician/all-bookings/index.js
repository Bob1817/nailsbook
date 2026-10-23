const api = require('../../../services/api');
const {
  decorateTechnicianOrder,
  ORDER_TABS
} = require('../../../utils/order');
const { technicianBookingCardHandlers = {} } = require('../utils/technician-booking-actions');

const PRE_BOOKING_FILTER = { value: 'pre_booking', label: '待成单' };
const QUOTE_STATUS_LABELS = {
  issued: '待客户查看',
  viewed: '待客户确认',
  accepted_pending_schedule: '待客户选时间',
  booked: '已形成预约',
  withdrawn: '已撤回',
  expired: '已过期'
};

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function decorateQuote(item) {
  const declined = Boolean(item.declinedAt);
  return {
    ...item,
    _key: `quote-${item.id}`,
    _sourceType: 'quote',
    _kindText: '快速报价',
    _statusText: declined ? '客户暂不预约' : (QUOTE_STATUS_LABELS[item.status] || '状态待确认'),
    _statusKind: declined || ['withdrawn', 'expired'].includes(item.status) ? 'muted' : (item.status === 'booked' ? 'done' : 'pending'),
    _priceText: (Number(item.finalPriceFen || 0) / 100).toFixed(2),
    _createdText: formatDate(item.createdAt || item.issuedAt),
    _customerText: (item.customer && item.customer.name) || item.clientName || '待客户确认',
    _summaryText: (item.lines || []).map(line => line.nameSnapshot).filter(Boolean).join('、') || item.requirement || '美甲服务报价'
  };
}

const DESIGN_STATUS_LABELS = {
  pending_quote: '待我报价',
  quoted: '待客户确认',
  accepted: '待客户预约',
  rejected: '客户要求重报'
};

const CUSTOM_STATUS_LABELS = {
  pending_quote: '待我报价',
  quoted: '待客户确认'
};

function decorateDesign(item) {
  return {
    ...item,
    _key: `design-${item.id}`,
    _sourceType: 'design',
    _kindText: '客户设计',
    _statusText: DESIGN_STATUS_LABELS[item.status] || '状态待确认',
    _statusKind: item.status === 'accepted' ? 'done' : 'pending',
    _priceText: item.quotePrice == null ? '' : Number(item.quotePrice).toFixed(2),
    _createdText: formatDate(item.createdAt),
    _customerText: (item.client && (item.client.nickname || item.client.phone)) || '客户',
    _summaryText: item.title || item.description || '客户提交的美甲设计需求',
    _images: item.imageUrls || [],
    _canQuote: ['pending_quote', 'quoted', 'rejected'].includes(item.status)
  };
}

function decorateCustomRequest(item) {
  return {
    ...item,
    _key: `custom-${item.id}`,
    _sourceType: 'custom',
    _kindText: '定制需求',
    _statusText: CUSTOM_STATUS_LABELS[item.status] || '状态待确认',
    _statusKind: 'pending',
    _priceText: item.quotePrice == null ? '' : Number(item.quotePrice).toFixed(2),
    _createdText: formatDate(item.createdAt),
    _customerText: (item.client && (item.client.nickname || item.client.phone)) || '客户',
    _summaryText: item.title || item.description || '客户提交的定制服务需求',
    _images: item.images || [],
    _canQuote: item.status === 'pending_quote'
  };
}

Page({
  onBookingCardOpen: technicianBookingCardHandlers.onBookingCardOpen,
  onBookingCardQuote: technicianBookingCardHandlers.onBookingCardQuote,
  onBookingCardWithdrawQuote: technicianBookingCardHandlers.onBookingCardWithdrawQuote,
  onBookingCardEditBooking: technicianBookingCardHandlers.onBookingCardEditBooking,
  onBookingCardReject: technicianBookingCardHandlers.onBookingCardReject,
  onBookingCardCancel: technicianBookingCardHandlers.onBookingCardCancel,
  onBookingCardComplete: technicianBookingCardHandlers.onBookingCardComplete,
  onBookingCardRebook: technicianBookingCardHandlers.onBookingCardRebook,
  onBookingCardConfirmed: technicianBookingCardHandlers.onBookingCardConfirmed,
  data: {
    activeFilter: '',
    filterTabs: ORDER_TABS,
    allOrders: [],
    filteredOrders: [],
    preBookingItems: [],
    filteredPreBookingItems: [],
    tradeView: false,
    loading: false,
    loadFailed: false,
    preBookingLoadFailed: false,
    preBookingPartialFailed: false,
    showRequestQuote: false,
    quotingItem: null,
    requestQuotePrice: '',
    requestQuoteRemark: '',
    submittingRequestQuote: false
  },

  onLoad(options) {
    const tradeView = options && options.view === 'trade';
    const preBookingView = options && ['quotes', 'requests', 'pre_booking'].includes(options.view);
    const depositOnly = options && options.filter === 'unpaid_deposit';
    const bookingTabs = [...ORDER_TABS, PRE_BOOKING_FILTER];
    this.setData({
      tradeView,
      filterTabs: depositOnly
        ? [{ label: '待支付定金', value: 'unpaid_deposit' }, ...bookingTabs]
        : (tradeView ? ORDER_TABS : bookingTabs)
    });
    if (depositOnly) {
      this.setData({ activeFilter: 'unpaid_deposit' });
    } else if (preBookingView) {
      this.setData({ activeFilter: 'pre_booking' });
    } else if (options && options.status) {
      this.setData({ activeFilter: options.status });
    }
  },

  onShow() {
    this.loadOrders();
  },

  async loadOrders() {
    const requestId = this._requestId = (this._requestId || 0) + 1;
    this.setData({ loading: true, loadFailed: false, preBookingLoadFailed: false, preBookingPartialFailed: false });
    try {
      const [res, technicianProfile, quoteResult, designResult, customResult] = await Promise.all([
        api.technician.orders.list({}),
        api.technician.auth && api.technician.auth.getUserInfo ? api.technician.auth.getUserInfo().catch(() => ({})) : Promise.resolve({}),
        this.data.tradeView ? Promise.resolve([]) : api.technician.bookingQuotes.list().catch(() => null),
        this.data.tradeView ? Promise.resolve([]) : api.technician.designs.list().catch(() => null),
        this.data.tradeView ? Promise.resolve([]) : api.technician.customService.list().catch(() => null)
      ]);
      if (requestId !== this._requestId) return;
      const raw = Array.isArray(res) ? res : (res.list || res.data || []);
      const shops = Array.isArray(technicianProfile.shopAddresses) ? technicianProfile.shopAddresses : [];
      const allOrders = raw
        .filter(o => !this.data.tradeView || Boolean(o.tradeCreatedAt || o.tradeStatus))
        .map(o => decorateTechnicianOrder(o, shops))
        .filter(Boolean)
        .sort((a, b) => String(b.startTime).localeCompare(String(a.startTime)));
      const sourceLoadFailed = [quoteResult, designResult, customResult].some(result => result === null);
      const preBookingItems = [
        ...(Array.isArray(quoteResult) ? quoteResult : [])
          .filter(item => ['issued', 'viewed', 'accepted_pending_schedule'].includes(item.status) && !item.declinedAt)
          .map(decorateQuote),
        ...(Array.isArray(designResult) ? designResult : [])
          .filter(item => ['pending_quote', 'quoted', 'accepted', 'rejected'].includes(item.status))
          .map(decorateDesign),
        ...(Array.isArray(customResult) ? customResult : [])
          .filter(item => ['pending_quote', 'quoted'].includes(item.status))
          .map(decorateCustomRequest)
      ].sort((a, b) => String(b.createdAt || b.issuedAt).localeCompare(String(a.createdAt || a.issuedAt)));
      this.setData({
        allOrders,
        preBookingItems,
        preBookingLoadFailed: sourceLoadFailed && !preBookingItems.length,
        preBookingPartialFailed: sourceLoadFailed && Boolean(preBookingItems.length)
      });
      this.applyFilter(this.data.activeFilter);
    } catch (err) {
      if (requestId !== this._requestId) return;
      this.setData({ loadFailed: true });
    } finally {
      if (requestId === this._requestId) this.setData({ loading: false });
    }
  },

  onUnload() {
    this._requestId = (this._requestId || 0) + 1;
  },

  selectFilter(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ activeFilter: value });
    this.applyFilter(value);
  },

  applyFilter(value) {
    const { allOrders, preBookingItems } = this.data;
    const filtered = !value
      ? allOrders
      : allOrders.filter(o => value === 'unpaid_deposit'
        ? Number(o.depositAmount || 0) > 0 && !o.depositPaid && !['completed', 'cancelled', 'expired'].includes(o.status)
        : o.status === value);
    this.setData({
      filteredOrders: value === 'pre_booking' ? [] : filtered,
      filteredPreBookingItems: value === 'pre_booking' ? preBookingItems : []
    });
  },

  openQuickQuote() {
    wx.navigateTo({ url: '/pages/technician/quick-quote/index' });
  },

  openPreBookingItem(e) {
    const item = this.data.preBookingItems.find(entry => entry._key === e.currentTarget.dataset.key);
    if (!item) return;
    if (item._sourceType === 'quote') {
      wx.navigateTo({ url: `/pages/client/quote-confirm/index?id=${item.id}` });
    } else if (item._images && item._images.length) {
      wx.previewImage({ current: item._images[0], urls: item._images });
    }
  },

  openQuoteOrder(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  },

  openRequestQuote(e) {
    const item = this.data.preBookingItems.find(entry => entry._key === e.currentTarget.dataset.key);
    if (!item || !item._canQuote) return;
    this.setData({
      showRequestQuote: true,
      quotingItem: item,
      requestQuotePrice: item._priceText,
      requestQuoteRemark: item.quoteRemark || ''
    });
  },

  closeRequestQuote() {
    if (!this.data.submittingRequestQuote) this.setData({ showRequestQuote: false, quotingItem: null });
  },

  onRequestQuoteInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  async submitRequestQuote() {
    const item = this.data.quotingItem;
    const price = Number(this.data.requestQuotePrice);
    if (!item || this.data.submittingRequestQuote) return;
    if (!Number.isFinite(price) || price <= 0) return wx.showToast({ title: '请输入有效报价', icon: 'none' });
    this.setData({ submittingRequestQuote: true });
    try {
      const data = { price, remark: this.data.requestQuoteRemark.trim() };
      if (item._sourceType === 'design') await api.technician.designs.quote(item.id, data);
      else await api.technician.customService.quote(item.id, data);
      this.setData({ showRequestQuote: false, quotingItem: null });
      await this.loadOrders();
      wx.showToast({ title: '报价已发送', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '报价失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submittingRequestQuote: false });
    }
  },

  noop() {},


});
