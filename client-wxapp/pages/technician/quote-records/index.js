const api = require('../../../services/api');

function pad(n) { return String(n).padStart(2, '0'); }

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function money(fen) {
  return (Number(fen || 0) / 100).toFixed(2).replace(/\.00$/, '');
}

Page({
  data: {
    loading: true,
    refreshing: false,
    activeTab: 'all',
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待回复' },
      { key: 'booked', label: '已同意' },
      { key: 'declined', label: '已拒绝' }
    ],
    quotes: [],
    displayQuotes: [],
    stats: {
      all: 0,
      pending: 0,
      booked: 0,
      declined: 0
    }
  },

  onLoad(options = {}) {
    if (options.tab && ['all', 'pending', 'booked', 'declined'].includes(options.tab)) {
      this.setData({ activeTab: options.tab });
    }
    this.loadQuotes();
  },

  onPullDownRefresh() {
    this.loadQuotes(true);
  },

  async loadQuotes(isRefresh = false) {
    if (!isRefresh) this.setData({ loading: true });
    try {
      const res = await api.technician.bookingQuotes.list();
      const list = Array.isArray(res) ? res : (res && (res.list || res.data)) || [];
      const decorated = list.map(item => this.decorateItem(item));
      
      const stats = {
        all: decorated.length,
        pending: decorated.filter(q => q._category === 'pending').length,
        booked: decorated.filter(q => q._category === 'booked').length,
        declined: decorated.filter(q => q._category === 'declined').length
      };

      this.setData({
        quotes: decorated,
        stats,
        loading: false,
        refreshing: false
      });
      this.filterDisplayQuotes();
    } catch (err) {
      this.setData({ loading: false, refreshing: false });
      wx.showToast({ title: err.message || '加载报价记录失败', icon: 'none' });
    } finally {
      if (isRefresh) wx.stopPullDownRefresh();
    }
  },

  decorateItem(item) {
    const status = item.status;
    let category = 'pending';
    let statusLabel = '待回复';
    let statusTone = 'tone-pending';

    if (status === 'accepted_pending_schedule') {
      category = 'booked';
      statusLabel = '待选时间';
      statusTone = 'tone-booked';
    } else if (status === 'booked') {
      category = 'booked';
      statusLabel = '已成单';
      statusTone = 'tone-booked';
    } else if (status === 'declined') {
      category = 'declined';
      statusLabel = '已拒绝';
      statusTone = 'tone-declined';
    } else if (status === 'expired') {
      category = 'declined';
      statusLabel = '已过期';
      statusTone = 'tone-expired';
    } else if (status === 'withdrawn') {
      category = 'declined';
      statusLabel = '已撤回';
      statusTone = 'tone-expired';
    }

    const lines = item.lines || [];
    const linesSummary = lines.map(l => `${l.nameSnapshot} × ${l.quantity}`).join('、');
    const order = item.order || null;
    if (order && order.startTime) {
      order._displayTime = formatDateTime(order.startTime);
    }

    return {
      ...item,
      _category: category,
      _statusLabel: statusLabel,
      _statusTone: statusTone,
      _createdTimeText: formatDateTime(item.createdAt),
      _priceText: money(item.finalPriceFen),
      _linesTotalText: money(item.serviceSubtotalFen + item.materialSubtotalFen + item.surchargeSubtotalFen),
      _hasDiscount: Number(item.discountAmountFen || 0) > 0,
      _discountText: money(item.discountAmountFen),
      _linesSummary: linesSummary || '美甲服务方案',
      _order: order,
      _clientName: item.clientName || (item.customer && item.customer.name) || '客户'
    };
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key;
    if (key === this.data.activeTab) return;
    this.setData({ activeTab: key }, () => {
      this.filterDisplayQuotes();
    });
  },

  filterDisplayQuotes() {
    const { activeTab, quotes } = this.data;
    let displayQuotes = quotes;
    if (activeTab !== 'all') {
      displayQuotes = quotes.filter(item => item._category === activeTab);
    }
    this.setData({ displayQuotes });
  },

  openQuoteDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/client/quote-confirm/index?id=${id}`
    });
  },

  openOrderDetail(e) {
    const orderId = e.currentTarget.dataset.orderId;
    if (!orderId) return;
    wx.navigateTo({
      url: `/pages/technician/order-detail/index?id=${orderId}`
    });
  },

  createNewQuote() {
    wx.navigateTo({
      url: '/pages/technician/quick-quote/index'
    });
  }
});
