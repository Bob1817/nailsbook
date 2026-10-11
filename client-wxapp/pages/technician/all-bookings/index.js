const api = require('../../../services/api');
const {
  decorateTechnicianOrder,
  ORDER_TABS
} = require('../../../utils/order');
const { technicianBookingCardHandlers = {} } = require('../../../utils/technician-booking-actions');

Page({
  onBookingCardOpen: technicianBookingCardHandlers.onBookingCardOpen,
  onBookingCardQuote: technicianBookingCardHandlers.onBookingCardQuote,
  onBookingCardWithdrawQuote: technicianBookingCardHandlers.onBookingCardWithdrawQuote,
  onBookingCardEditBooking: technicianBookingCardHandlers.onBookingCardEditBooking,
  onBookingCardReject: technicianBookingCardHandlers.onBookingCardReject,
  onBookingCardCancel: technicianBookingCardHandlers.onBookingCardCancel,
  onBookingCardComplete: technicianBookingCardHandlers.onBookingCardComplete,
  onBookingCardRebook: technicianBookingCardHandlers.onBookingCardRebook,
  data: {
    activeFilter: '',
    filterTabs: ORDER_TABS,
    allOrders: [],
    filteredOrders: [],
    tradeView: false,
    loading: false,
    loadFailed: false
  },

  onLoad(options) {
    const tradeView = options && options.view === 'trade';
    const depositOnly = options && options.filter === 'unpaid_deposit';
    this.setData({
      tradeView,
      filterTabs: depositOnly
        ? [{ label: '待支付定金', value: 'unpaid_deposit' }, ...ORDER_TABS]
        : ORDER_TABS
    });
    if (depositOnly) {
      this.setData({ activeFilter: 'unpaid_deposit' });
    } else if (options && options.status) {
      this.setData({ activeFilter: options.status });
    }
    this.loadOrders();
  },

  async loadOrders() {
    const requestId = this._requestId = (this._requestId || 0) + 1;
    this.setData({ loading: true, loadFailed: false });
    try {
      const [res, technicianProfile] = await Promise.all([
        api.technician.orders.list({}),
        api.technician.auth && api.technician.auth.getUserInfo ? api.technician.auth.getUserInfo().catch(() => ({})) : Promise.resolve({})
      ]);
      if (requestId !== this._requestId) return;
      const raw = Array.isArray(res) ? res : (res.list || res.data || []);
      const shops = Array.isArray(technicianProfile.shopAddresses) ? technicianProfile.shopAddresses : [];
      const allOrders = raw
        .filter(o => !this.data.tradeView || Boolean(o.tradeCreatedAt || o.tradeStatus))
        .map(o => decorateTechnicianOrder(o, shops))
        .filter(Boolean)
        .sort((a, b) => String(b.startTime).localeCompare(String(a.startTime)));
      this.setData({ allOrders });
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
    const { allOrders } = this.data;
    const filtered = !value
      ? allOrders
      : allOrders.filter(o => value === 'unpaid_deposit'
        ? Number(o.depositAmount || 0) > 0 && !o.depositPaid && !['completed', 'cancelled', 'expired'].includes(o.status)
        : o.status === value);
    this.setData({ filteredOrders: filtered });
  },


});
