const api = require('../../../services/api');

const TABS = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待支付' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
];

function money(value) { return Number(value || 0).toFixed(2); }
function decorate(item) {
  const booking = item.booking || {};
  const remaining = Math.max(0, Number(item.totalAmount || 0) - Number(item.paidAmount || 0));
  const payStage = item.currentPayStage === 'deposit' ? '待支付定金' : '待支付尾款';
  return {
    ...item,
    booking,
    _total: money(item.totalAmount),
    _deposit: money(item.depositAmount),
    _balance: money(item.balanceAmount),
    _paid: money(item.paidAmount),
    _remaining: money(remaining),
    _statusText: item.status === 'completed' ? '已完成' : item.status === 'cancelled' ? '已取消' : payStage,
    _statusClass: `status-${item.status}`,
    _title: booking.customTitle || '美甲服务订单',
    _artist: booking.technician?.name || '美甲师',
    _created: item.createdAt ? String(item.createdAt).slice(0, 16).replace('T', ' ') : ''
  };
}

Page({
  data: { tabs: TABS, active: 'all', all: [], list: [], loading: true },
  onShow() { this.load(); },
  async load() {
    this.setData({ loading: true });
    try {
      const rows = await api.client.tradeOrders.list();
      const all = (Array.isArray(rows) ? rows : rows.data || []).map(decorate);
      this.setData({ all, loading: false });
      this.apply(this.data.active);
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: error.message || '订单加载失败', icon: 'none' });
    }
  },
  switchTab(e) { const active = e.currentTarget.dataset.value; this.setData({ active }); this.apply(active); },
  apply(active) { this.setData({ list: active === 'all' ? this.data.all : this.data.all.filter(item => item.status === active) }); },
  openOrder(e) { wx.navigateTo({ url: `/pages/client/order-detail/index?id=${e.currentTarget.dataset.id}` }); }
});
