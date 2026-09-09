const api = require('../../../services/api');
const { formatClock, formatMoney } = require('../../../utils/format');
const {
  normalizeOrder,
  resolveOrderPresentation,
  getStatusLabel,
  getStatusTone
} = require('../../../utils/order');

const TRIP_STATUSES = ['pending_shop', 'in_progress'];

Page({
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
            _fullAddress: pres.fullAddress,
            _statusLabel: getStatusLabel(o.status),
            _statusTone: getStatusTone(o.status),
            _priceText: Number(o.price) > 0 ? formatMoney(o.price) : ''
          };
        })
        .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
      this.setData({ orders });
    } catch (err) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
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
  },

  onBookingCardOpen(e) {
    const id = e.detail && e.detail.id;
    if (id) wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  },

  onBookingCardNavigate(e) {
    this.navigateToAddress({ currentTarget: { dataset: { id: e.detail && e.detail.id } } });
  },

  onBookingCardMessage(e) {
    const clientId = e.detail && e.detail.clientId;
    if (!clientId) return wx.showToast({ title: '客户尚未关联小程序账号，请拨打电话', icon: 'none' });
    wx.navigateTo({ url: `/pages/technician/chat-detail/index?clientId=${clientId}` });
  },

  onBookingCardContact(e) {
    this.contactCustomer({ currentTarget: { dataset: { phone: e.detail && e.detail.phone } } });
  }
});
