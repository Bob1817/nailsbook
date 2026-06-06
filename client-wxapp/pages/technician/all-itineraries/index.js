const api = require('../../../services/api');
const { formatClock } = require('../../../utils/format');
const {
  normalizeOrder,
  resolveOrderPresentation,
  getStatusLabel,
  getStatusTone
} = require('../../../utils/order');

const TRIP_STATUSES = ['pending_home', 'pending_shop', 'in_progress'];

Page({
  data: {
    orders: [],
    loading: false
  },

  onLoad() {
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true });
    try {
      const res = await api.technician.orders.list({});
      const raw = Array.isArray(res) ? res : (res.list || res.data || []);
      const orders = raw
        .map(normalizeOrder)
        .filter(Boolean)
        .filter(o => TRIP_STATUSES.indexOf(o.status) >= 0)
        .map(o => {
          const pres = resolveOrderPresentation(o);
          return {
            ...o,
            _clock: formatClock(o.startTime),
            _typeLabel: pres.typeLabel,
            _statusLabel: getStatusLabel(o.status),
            _statusTone: getStatusTone(o.status),
            _avatarChar: (o.customerName && o.customerName[0]) || '客'
          };
        })
        .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
      this.setData({ orders });
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  viewOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  },

  navigateToAddress(e) {
    const id = e.currentTarget.dataset.id;
    const o = (this.data.orders || []).find(x => x.id === id);
    if (!o) return;
    if (o.latitude && o.longitude) {
      wx.openLocation({
        latitude: Number(o.latitude),
        longitude: Number(o.longitude),
        name: o.shopName || '预约地点',
        address: o.address || '',
        scale: 16
      });
      return;
    }
    if (!o.address) return wx.showToast({ title: '暂无地址', icon: 'none' });
    wx.setClipboardData({
      data: o.address,
      success: () => wx.showToast({ title: '地址已复制', icon: 'none' })
    });
  },

  contactCustomer(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) return wx.showToast({ title: '客户暂无电话', icon: 'none' });
    wx.makePhoneCall({ phoneNumber: String(phone) });
  }
});
