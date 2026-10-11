const api = require('../services/api');
const uiColors = require('./colors');
const { parseDate, formatClock } = require('./format');

function eventId(event) {
  return event && event.detail && event.detail.id;
}

function pageOrders(page) {
  if (Array.isArray(page._allOrders)) return page._allOrders;
  if (Array.isArray(page.data.allOrders)) return page.data.allOrders;
  if (Array.isArray(page.data.orders)) return page.data.orders;
  if (page.data.customer && Array.isArray(page.data.customer.orders)) return page.data.customer.orders;
  return [];
}

function findOrder(page, id) {
  return pageOrders(page).find(item => String(item.id) === String(id));
}

async function reload(page) {
  if (typeof page.loadOrders === 'function') return page.loadOrders();
  if (typeof page.loadCustomer === 'function') return page.loadCustomer();
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function promptReason(title, placeholderText) {
  const result = await wx.showModal({
    title,
    content: '',
    editable: true,
    placeholderText,
    confirmText: '确认提交',
    confirmColor: uiColors.danger
  });
  if (!result.confirm) return '';
  const reason = String(result.content || '').trim();
  if (!reason) wx.showToast({ title: '请填写原因', icon: 'none' });
  return reason;
}

const technicianBookingCardHandlers = {
  onBookingCardOpen(event) {
    const id = eventId(event);
    if (id) wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  },

  onBookingCardQuote(event) {
    const id = eventId(event);
    if (id) wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}&action=quote` });
  },

  async onBookingCardWithdrawQuote(event) {
    const id = eventId(event);
    if (!id) return;
    const result = await wx.showModal({
      title: '取消报价',
      content: '撤回后客户将无法确认当前报价，你可以重新编辑并发送。',
      confirmText: '确认撤回',
      confirmColor: uiColors.danger
    });
    if (!result.confirm) return;
    try {
      wx.showLoading({ title: '处理中...' });
      await api.technician.orders.withdrawQuote(id);
      wx.hideLoading();
      wx.showToast({ title: '报价已撤回', icon: 'success' });
      await reload(this);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '撤回失败', icon: 'none' });
    }
  },

  onBookingCardEditBooking(event) {
    const id = eventId(event);
    const order = findOrder(this, id);
    if (!order) return;
    const start = parseDate(order.startTime);
    const end = parseDate(order.endTime);
    const duration = start && end && end > start ? Math.round((end - start) / 60000) : 120;
    const params = [
      `id=${id}`,
      `date=${start ? dateKey(start) : ''}`,
      `time=${start ? formatClock(start) : ''}`,
      `duration=${duration}`,
      `serviceType=${encodeURIComponent(order.serviceType || 'shop')}`,
      `shopName=${encodeURIComponent(order._shopName || order.shopName || '')}`,
      `address=${encodeURIComponent(order.address || '')}`
    ];
    wx.navigateTo({ url: `/pages/technician/edit-booking-time/index?${params.join('&')}` });
  },

  async onBookingCardReject(event) {
    const id = eventId(event);
    const reason = await promptReason('驳回预约', '请填写驳回原因');
    if (!id || !reason) return;
    try {
      wx.showLoading({ title: '提交中...' });
      await api.technician.orders.reject(id, reason);
      wx.hideLoading();
      wx.showToast({ title: '已驳回预约', icon: 'success' });
      await reload(this);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '驳回失败', icon: 'none' });
    }
  },

  async onBookingCardCancel(event) {
    const id = eventId(event);
    const order = findOrder(this, id);
    const reason = await promptReason('取消预约', '请填写取消原因');
    if (!id || !reason) return;
    let refundDeposit;
    if (order && order._depositPaid) {
      const result = await wx.showModal({
        title: '定金处理',
        content: '该预约已收取定金，请选择是否退还。',
        cancelText: '不退定金',
        confirmText: '退还定金'
      });
      refundDeposit = result.confirm;
    }
    try {
      wx.showLoading({ title: '处理中...' });
      await api.technician.orders.cancel(id, { reason, refundDeposit });
      wx.hideLoading();
      wx.showToast({ title: '已取消预约', icon: 'success' });
      await reload(this);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '取消失败', icon: 'none' });
    }
  },

  async onBookingCardComplete(event) {
    const id = eventId(event);
    if (!id) return;
    const result = await wx.showModal({
      title: '确认完成',
      content: '确认客户已完成本次美甲服务吗？',
      confirmText: '确认完成'
    });
    if (!result.confirm) return;
    try {
      wx.showLoading({ title: '处理中...' });
      await api.technician.orders.complete(id, {});
      wx.hideLoading();
      wx.showToast({ title: '预约已完成', icon: 'success' });
      await reload(this);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  onBookingCardRebook(event) {
    const id = eventId(event);
    if (id) wx.navigateTo({ url: `/pages/technician/edit-booking-time/index?id=${id}&mode=repeat` });
  }
};

module.exports = { technicianBookingCardHandlers };
