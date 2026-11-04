const bookingRealtime = require('../../../utils/booking-realtime');
const api = require('../../../services/api');
const {
  decorateTechnicianOrder
} = require('../../../utils/order');
const { technicianBookingCardHandlers = {} } = require('../utils/technician-booking-actions');

const TRIP_STATUSES = ['pending_shop', 'in_progress'];

Page({
  onBookingChanged() { return this.loadOrders({ silent: true }); },
  onBookingCardOpen: technicianBookingCardHandlers.onBookingCardOpen,
  onBookingCardQuote: technicianBookingCardHandlers.onBookingCardQuote,
  onBookingCardWithdrawQuote: technicianBookingCardHandlers.onBookingCardWithdrawQuote,
  onBookingCardEditBooking: technicianBookingCardHandlers.onBookingCardEditBooking,
  onBookingCardReject: technicianBookingCardHandlers.onBookingCardReject,
  onBookingCardCancel: technicianBookingCardHandlers.onBookingCardCancel,
  onBookingCardComplete: technicianBookingCardHandlers.onBookingCardComplete,
  onBookingCardRebook: technicianBookingCardHandlers.onBookingCardRebook,
  onBookingCardConfirmed: technicianBookingCardHandlers.onBookingCardConfirmed,
  onBookingCardRecord: technicianBookingCardHandlers.onBookingCardRecord,
  onBookingCardUploadWork: technicianBookingCardHandlers.onBookingCardUploadWork,
  onBookingCardViewWork: technicianBookingCardHandlers.onBookingCardViewWork,
  data: {
    orders: [],
    loading: false,
    loadFailed: false
  },

  onShow() {
    bookingRealtime.start();
    if (!this.data.loading) this.loadOrders();
  },

  onLoad() {
    this.loadOrders();
  },

  async loadOrders(options = {}) {
    if (!options.silent) this.setData({ loading: true, loadFailed: false });
    try {
      const [res, technicianProfile] = await Promise.all([
        api.technician.orders.list({}),
        api.technician.auth && api.technician.auth.getUserInfo ? api.technician.auth.getUserInfo().catch(() => ({})) : Promise.resolve({})
      ]);
      const raw = Array.isArray(res) ? res : (res.list || res.data || []);
      const shops = Array.isArray(technicianProfile.shopAddresses) ? technicianProfile.shopAddresses : [];
      const orders = raw
        .map(o => decorateTechnicianOrder(o, shops))
        .filter(Boolean)
        .filter(o => TRIP_STATUSES.indexOf(o.status) >= 0)
        .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
      this.setData({ orders });
    } catch (err) {
      if (options.silent) throw err;
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },


});
