const api = require('../../../services/api');
const {
  parseDate,
  formatClock,
  formatBookingDate,
  formatMoney
} = require('../../../utils/format');
const {
  normalizeOrder,
  resolveOrderPresentation,
  getStatusLabel,
  getStatusTone
} = require('../../../utils/order');

// 状态描述 - 帮助技师理解预约当前阶段
const STATUS_DESC = {
  pending_quote:   '客户已发起预约，请尽快给出报价',
  pending_agree:   '已发送报价，等待客户确认',
  pending_client_confirm: '预约链接已发送，等待客户确认',
  pending_confirm: '客户已同意报价，请确认此单并核实定金',
  pending_home:    '已确认排期，记得准时上门',
  pending_shop:    '已确认排期，记得准时到店',
  in_progress:     '服务进行中',
  completed:       '预约已完成',
  cancelled:       '预约已取消'
};

// 按状态返回详情页底部应显示的动作
function actionsForStatus(status) {
  const QUOTE  = { key: 'quote',   label: '发送报价', style: 'action-primary' };
  const REVISE = { key: 'quote',   label: '修改报价', style: 'action-ghost' };
  const CONFIRM= { key: 'confirm', label: '确认排期', style: 'action-primary' };
  const COMPLETE={ key: 'complete',label: '标记完成', style: 'action-primary' };
  const CANCEL = { key: 'cancel',  label: '取消预约', style: 'action-danger' };

  switch (status) {
    case 'pending_quote':   return [QUOTE, CANCEL];
    case 'pending_agree':   return [REVISE, CANCEL];
    case 'pending_client_confirm': return [CANCEL];
    case 'pending_confirm': return [REVISE, CANCEL, CONFIRM];
    case 'pending_home':
    case 'pending_shop':    return [CANCEL];
    case 'in_progress':     return [COMPLETE];
    default:                return [];
  }
}

// 取消原因常用项
const CANCEL_REASONS = ['客户临时取消', '档期冲突', '客户未支付定金', '其他'];

function maskPhone(phone) {
  if (!phone) return '';
  const p = String(phone);
  if (p.length < 7) return p;
  return p.slice(0, 3) + '****' + p.slice(-4);
}

function todayISO() {
  const d = new Date();
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

Page({
  data: {
    order: null,
    loading: true,

    todayDate: todayISO(),

    // 报价 sheet
    showQuote: false,
    quoteIsRevise: false,
    quotePrice: '',
    quoteDate: '',
    quoteTime: '',
    quoteDuration: '120',
    quoteDeposit: '',
    quoteRemark: '',

    // 取消 sheet
    showCancel: false,
    cancelReason: '',
    cancelReasons: CANCEL_REASONS,

    submitting: false
  },

  onLoad(options) {
    this.orderId = options.id;
    this.pendingAction = options.action || ''; // 来自列表传参，例如 quote
    this.loadOrder();
  },

  onShow() {
    if (!this.orderId) return;
    if (!this.data.loading) this.loadOrder();
  },

  onPullDownRefresh() {
    this.loadOrder().finally(() => wx.stopPullDownRefresh());
  },

  // ---------- 数据加载 ----------
  async loadOrder() {
    try {
      const raw = await api.technician.orders.detail(this.orderId);
      const o = normalizeOrder(raw);

      // 补充详情页专有字段
      o.orderNo = raw.orderNo;
      o.depositAmount = raw.depositAmount || 0;
      o.remark = raw.remark || raw.note || '';

      const start = parseDate(o.startTime);
      const end = parseDate(o.endTime);
      o.durationMinutes = start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0;

      const pres = resolveOrderPresentation(o);

      // 是否显示价格卡
      const showPriceCard = o.price > 0 || o.depositAmount > 0;

      const decorated = {
        ...o,
        _statusLabel: getStatusLabel(o.status),
        _statusTone:  getStatusTone(o.status),
        _statusDesc:  STATUS_DESC[o.status] || '',
        _typeLabel:   pres.typeLabel,
        _typeClass:   pres.typeClass,
        _dateLabel:   formatBookingDate(o.startTime),
        _timeRange:   start && end
          ? `${formatClock(o.startTime)} - ${formatClock(o.endTime)}`
          : formatClock(o.startTime),
        _priceText:   o.price ? formatMoney(o.price) : '待报价',
        _customerPhoneMasked: maskPhone(o.customerPhone),
        _showPriceCard: showPriceCard,
        _actions: actionsForStatus(o.status)
      };

      // 用拉到的数据预填报价表单
      const sd = start ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}` : '';
      const st = start ? formatClock(o.startTime) : '14:00';

      this.setData({
        order: decorated,
        loading: false,
        quotePrice: o.price ? String(o.price) : '',
        quoteDate: sd,
        quoteTime: st,
        quoteDuration: decorated.durationMinutes > 0 ? String(decorated.durationMinutes) : '120',
        quoteDeposit: o.depositAmount ? String(o.depositAmount) : '',
        quoteRemark: o.remark || ''
      });

      // 从列表跳来时如果带 action=quote，直接打开报价 sheet
      if (this.pendingAction === 'quote' && actionsForStatus(o.status).some((a) => a.key === 'quote')) {
        this.pendingAction = '';
        setTimeout(() => this.openQuote(), 100);
      }
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  // ---------- 操作分发 ----------
  onAction(e) {
    const key = e.currentTarget.dataset.key;
    switch (key) {
      case 'quote':    return this.openQuote();
      case 'confirm':  return this.confirmOrder();
      case 'complete': return this.completeOrder();
      case 'cancel':   return this.openCancel();
    }
  },

  // ---------- 客户操作 ----------
  callCustomer() {
    const phone = this.data.order && this.data.order.customerPhone;
    if (!phone) {
      wx.showToast({ title: '暂无电话', icon: 'none' });
      return;
    }
    wx.makePhoneCall({ phoneNumber: String(phone) });
  },

  copyAddress() {
    const addr = this.data.order && this.data.order.address;
    if (!addr) return;
    wx.setClipboardData({
      data: addr,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    });
  },

  // ---------- 报价 ----------
  openQuote() {
    const status = this.data.order && this.data.order.status;
    this.setData({
      showQuote: true,
      quoteIsRevise: status !== 'pending_quote'
    });
  },
  closeQuote() { this.setData({ showQuote: false }); },

  onQuotePriceInput(e)    { this.setData({ quotePrice: e.detail.value }); },
  onQuoteDateChange(e)    { this.setData({ quoteDate: e.detail.value }); },
  onQuoteTimeChange(e)    { this.setData({ quoteTime: e.detail.value }); },
  onQuoteDurationInput(e) { this.setData({ quoteDuration: e.detail.value }); },
  onQuoteDepositInput(e)  { this.setData({ quoteDeposit: e.detail.value }); },
  onQuoteRemarkInput(e)   { this.setData({ quoteRemark: e.detail.value }); },

  async submitQuote() {
    if (this.data.submitting) return;
    const { quotePrice, quoteDate, quoteTime, quoteDuration, quoteDeposit, quoteRemark } = this.data;

    const price = Number(quotePrice);
    if (!quotePrice || Number.isNaN(price) || price < 0) {
      return wx.showToast({ title: '请输入正确的报价金额', icon: 'none' });
    }
    if (!quoteDate) return wx.showToast({ title: '请选择服务日期', icon: 'none' });
    if (!quoteTime) return wx.showToast({ title: '请选择服务时间', icon: 'none' });

    const duration = Number(quoteDuration);
    if (!quoteDuration || Number.isNaN(duration) || duration < 1) {
      return wx.showToast({ title: '请输入正确的服务时长', icon: 'none' });
    }

    let deposit;
    if (quoteDeposit !== '') {
      deposit = Number(quoteDeposit);
      if (Number.isNaN(deposit) || deposit < 0) {
        return wx.showToast({ title: '定金金额不正确', icon: 'none' });
      }
      if (deposit > price) {
        return wx.showToast({ title: '定金不能高于总价', icon: 'none' });
      }
    }

    this.setData({ submitting: true });
    try {
      const payload = {
        price,
        serviceDate: quoteDate,
        startTime: quoteTime,
        durationMinutes: duration
      };
      if (quoteRemark) payload.remark = quoteRemark;
      if (deposit != null) payload.depositAmount = deposit;

      await api.technician.orders.quote(this.orderId, payload);
      this.setData({ submitting: false, showQuote: false });
      wx.showToast({ title: '报价已发送', icon: 'success' });
      this.loadOrder();
    } catch (err) {
      this.setData({ submitting: false });
      wx.showToast({ title: err.message || '报价失败', icon: 'none' });
    }
  },

  // ---------- 确认 ----------
  async confirmOrder() {
    const order = this.data.order;
    const depositInfo = order.depositAmount > 0 && !order.depositPaid
      ? `\n请先确认客户已支付定金 ¥${order.depositAmount}`
      : '';

    const r = await wx.showModal({
      title: '确认排期',
      content: `确认接此预约？${depositInfo}`,
      confirmText: '已确认'
    });
    if (!r.confirm) return;

    try {
      wx.showLoading({ title: '处理中...' });
      await api.technician.orders.confirm(this.orderId);
      wx.hideLoading();
      wx.showToast({ title: '已确认', icon: 'success' });
      this.loadOrder();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  // ---------- 完成 ----------
  async completeOrder() {
    const r = await wx.showModal({
      title: '标记完成',
      content: '确认本次服务已完成？'
    });
    if (!r.confirm) return;

    try {
      wx.showLoading({ title: '处理中...' });
      await api.technician.orders.complete(this.orderId);
      wx.hideLoading();
      wx.showToast({ title: '预约已完成', icon: 'success' });
      this.loadOrder();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  // ---------- 取消 ----------
  openCancel() { this.setData({ showCancel: true, cancelReason: '' }); },
  closeCancel() { this.setData({ showCancel: false }); },
  onCancelReasonInput(e) { this.setData({ cancelReason: e.detail.value }); },
  onPickReason(e) {
    this.setData({ cancelReason: e.currentTarget.dataset.reason });
  },

  async submitCancel() {
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      await api.technician.orders.cancel(this.orderId, this.data.cancelReason || undefined);
      this.setData({ submitting: false, showCancel: false });
      wx.showToast({ title: '预约已取消', icon: 'success' });
      this.loadOrder();
    } catch (err) {
      this.setData({ submitting: false });
      wx.showToast({ title: err.message || '取消失败', icon: 'none' });
    }
  }
});
