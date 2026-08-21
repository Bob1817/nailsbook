const api = require('../../../services/api');
const { formatClock } = require('../../../utils/format');
const {
  normalizeOrder,
  resolveOrderPresentation,
  getStatusLabel,
  getStatusTone
} = require('../../../utils/order');

Page({
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
    this.setData({ loading: true, loadFailed: false });
    try {
      const res = await api.technician.orders.list({ date });
      const all = Array.isArray(res) ? res : (res.list || res.data || []);
      const dayOrders = all
        .map(normalizeOrder)
        .filter(Boolean)
        .filter(o => o.status !== 'cancelled')
        .map(o => {
          const presentation = resolveOrderPresentation(o);
          return {
            ...o,
            statusLabel: getStatusLabel(o.status),
            statusTone: getStatusTone(o.status),
            timeStr: formatClock(o.startTime),
            typeLabel: presentation.typeLabel
          };
        })
        .sort((a, b) => (a.timeStr > b.timeStr ? 1 : -1));
      this.setData({ dayOrders });
    } catch (err) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  retryLoad() {
    this.loadOrders(this.data.selectedDate);
  },

  goOrderDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  }
});
