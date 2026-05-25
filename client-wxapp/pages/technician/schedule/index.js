const api = require('../../../services/api');

const STATUS_LABEL = {
  pending_quote: '待报价',
  quoted: '已报价',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消'
};

Page({
  data: {
    selectedDate: '',
    days: [],
    dayOrders: [],
    loading: false
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
    this.setData({ loading: true });
    try {
      const res = await api.technician.orders.list({ date });
      const all = Array.isArray(res) ? res : (res.data || []);
      const dayOrders = all
        .filter(o => o.status !== 'cancelled')
        .map(o => ({
          ...o,
          statusLabel: STATUS_LABEL[o.status] || o.status,
          timeStr: o.scheduledTime
            ? o.scheduledTime.slice(11, 16)
            : (o.preferredTime || '--:--')
        }))
        .sort((a, b) => (a.timeStr > b.timeStr ? 1 : -1));
      this.setData({ dayOrders });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goOrderDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  }
});
