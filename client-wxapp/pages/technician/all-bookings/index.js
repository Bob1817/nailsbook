const api = require('../../../services/api');
const { formatClock } = require('../../../utils/format');
const {
  normalizeOrder,
  resolveOrderPresentation,
  getStatusLabel,
  getStatusTone,
  ORDER_TABS
} = require('../../../utils/order');

Page({
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
    this.setData({ tradeView });
    if (options && options.status) {
      this.setData({ activeFilter: options.status });
    }
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const res = await api.technician.orders.list({});
      const raw = Array.isArray(res) ? res : (res.list || res.data || []);
      const allOrders = raw
        .filter(o => !this.data.tradeView || Boolean(o.tradeCreatedAt || o.tradeStatus))
        .map(normalizeOrder)
        .filter(Boolean)
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
        .sort((a, b) => String(b.startTime).localeCompare(String(a.startTime)));
      this.setData({ allOrders });
      this.applyFilter(this.data.activeFilter);
    } catch (err) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
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
      : allOrders.filter(o => o.status === value);
    this.setData({ filteredOrders: filtered });
  },

  viewOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  },

  navigateToAddress(e) {
    const id = e.currentTarget.dataset.id;
    const o = (this.data.filteredOrders || []).find(x => x.id === id);
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
