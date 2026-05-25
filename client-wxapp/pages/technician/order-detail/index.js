const api = require('../../../services/api');

const STATUS_TEXT = {
  pending_quote: '待报价',
  quoted: '已报价',
  confirmed: '已确认',
  in_progress: '服务中',
  completed: '已完成',
  cancelled: '已取消',
  rejected: '已拒绝'
};

Page({
  data: {
    order: null,
    loading: true,
    // 报价表单
    showQuoteForm: false,
    quotePrice: '',
    quoteDate: '',
    quoteTime: '',
    quoteDuration: '120',
    quoteRemark: '',
    submitting: false
  },

  onLoad(options) {
    this.orderId = options.id;
    this.loadOrder();
  },

  onShow() {
    if (this.orderId) this.loadOrder();
  },

  async loadOrder() {
    try {
      const order = await api.technician.orders.detail(this.orderId);
      this.setData({
        order: {
          ...order,
          statusText: STATUS_TEXT[order.status] || order.status,
          quoteDate: order.serviceDate || '',
          quoteTime: order.startTime ? order.startTime.slice(0, 5) : ''
        },
        loading: false,
        // 预填报价表单日期时间
        quoteDate: order.serviceDate || '',
        quoteTime: order.startTime ? order.startTime.slice(0, 5) : ''
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  // -------- 报价 --------
  openQuoteForm() {
    this.setData({ showQuoteForm: true });
  },
  closeQuoteForm() {
    this.setData({ showQuoteForm: false });
  },
  onQuotePriceInput(e) { this.setData({ quotePrice: e.detail.value }); },
  onQuoteDateChange(e) { this.setData({ quoteDate: e.detail.value }); },
  onQuoteTimeChange(e) { this.setData({ quoteTime: e.detail.value }); },
  onQuoteDurationInput(e) { this.setData({ quoteDuration: e.detail.value }); },
  onQuoteRemarkInput(e) { this.setData({ quoteRemark: e.detail.value }); },

  async submitQuote() {
    const { quotePrice, quoteDate, quoteTime, quoteDuration, quoteRemark, submitting } = this.data;
    if (submitting) return;
    if (!quotePrice || isNaN(Number(quotePrice)) || Number(quotePrice) < 0) {
      wx.showToast({ title: '请输入正确的报价金额', icon: 'none' });
      return;
    }
    if (!quoteDate) {
      wx.showToast({ title: '请选择服务日期', icon: 'none' });
      return;
    }
    if (!quoteTime) {
      wx.showToast({ title: '请选择服务时间', icon: 'none' });
      return;
    }
    if (!quoteDuration || isNaN(Number(quoteDuration)) || Number(quoteDuration) < 1) {
      wx.showToast({ title: '请输入正确的服务时长', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });
    try {
      await api.technician.orders.review(this.orderId, {
        price: Number(quotePrice),
        serviceDate: quoteDate,
        startTime: quoteTime,
        durationMinutes: Number(quoteDuration),
        remark: quoteRemark || undefined
      });
      wx.hideLoading();
      wx.showToast({ title: '报价已发送', icon: 'success' });
      this.setData({ showQuoteForm: false, submitting: false });
      this.loadOrder();
    } catch (err) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({ title: err.message || '报价失败', icon: 'none' });
    }
  },

  // -------- 确认 --------
  confirmOrder() {
    wx.showModal({
      title: '确认订单',
      content: '确认接受该订单并开始服务准备？',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        try {
          await api.technician.orders.confirm(this.orderId);
          wx.hideLoading();
          wx.showToast({ title: '已确认', icon: 'success' });
          this.loadOrder();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        }
      }
    });
  },

  // -------- 完成 --------
  completeOrder() {
    wx.showModal({
      title: '完成订单',
      content: '确认服务已完成？',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        try {
          await api.technician.orders.complete(this.orderId);
          wx.hideLoading();
          wx.showToast({ title: '订单已完成', icon: 'success' });
          this.loadOrder();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        }
      }
    });
  },

  // -------- 取消 --------
  cancelOrder() {
    wx.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        try {
          await api.technician.orders.cancel(this.orderId);
          wx.hideLoading();
          wx.showToast({ title: '订单已取消', icon: 'success' });
          this.loadOrder();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        }
      }
    });
  }
});
