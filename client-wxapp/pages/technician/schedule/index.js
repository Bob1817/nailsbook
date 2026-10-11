const api = require('../../../services/api');
const { decorateTechnicianOrder } = require('../../../utils/order');
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
    selectedDate: '',
    days: [],
    dayOrders: [],
    loading: false,
    loadFailed: false
  },

  onLoad() {
    const today = this._formatDate(new Date());
    this.setData({ selectedDate: today });
    this._buildWeekDays(new Date());
    this.loadOrders(today);
  },

  _formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  _buildWeekDays(anchor) {
    const days = [];
    const DOW = ['日', '一', '二', '三', '四', '五', '六'];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(anchor);
      d.setDate(d.getDate() + i);
      days.push({
        date: this._formatDate(d),
        dayNum: d.getDate(),
        dow: DOW[d.getDay()]
      });
    }
    this.setData({ days });
  },

  selectDay(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ selectedDate: date });
    this.loadOrders(date);
  },

  async loadOrders(date) {
    const requestId = this._requestId = (this._requestId || 0) + 1;
    this.setData({ loading: true, loadFailed: false });
    try {
      const [res, technicianProfile] = await Promise.all([
        api.technician.orders.list({ date }),
        api.technician.auth && api.technician.auth.getUserInfo ? api.technician.auth.getUserInfo().catch(() => ({})) : Promise.resolve({})
      ]);
      if (requestId !== this._requestId) return;
      const all = Array.isArray(res) ? res : (res.list || res.data || []);
      const shops = Array.isArray(technicianProfile.shopAddresses) ? technicianProfile.shopAddresses : [];
      const dayOrders = all
        .map(order => decorateTechnicianOrder(order, shops))
        .filter(Boolean)
        .filter(o => o.status !== 'cancelled')
        .sort((a, b) => (a._clock > b._clock ? 1 : -1));
      this.setData({ dayOrders });
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

  retryLoad() {
    this.loadOrders(this.data.selectedDate);
  }
});
