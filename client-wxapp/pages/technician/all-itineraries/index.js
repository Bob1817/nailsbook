const api = require('../../../services/api');
const {
  decorateTechnicianOrder
} = require('../../../utils/order');
const { technicianBookingCardHandlers = {} } = require('../../../utils/technician-booking-actions');

const TRIP_STATUSES = ['pending_shop', 'in_progress'];

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
    orders: [],
    loading: false,
    loadFailed: false
  },

  onLoad() {
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true, loadFailed: false });
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
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },


});
