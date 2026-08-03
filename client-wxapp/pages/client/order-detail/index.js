const api = require('../../../services/api');
const { parseDate, formatClock, formatBookingDate, formatMoney } = require('../../../utils/format');
const { resolveOrderPresentation, getStatusLabel, getStatusTone } = require('../../../utils/order');

const STATUS_DESC = {
  pending_quote: '美甲师正在为你准备报价，请稍候',
  pending_agree: '美甲师已报价，请确认是否接受',
  pending_client_confirm: '请确认本次预约信息',
  pending_confirm: '你已同意报价，等待美甲师确认排期',
  pending_home: '已确认排期，美甲师将按时上门服务',
  pending_shop: '已确认排期，请按时到店',
  in_progress: '服务进行中',
  completed: '服务已完成，期待再次为你服务',
  cancelled: '预约已取消'
};

const CANCELLABLE = ['pending_quote','pending_agree','pending_confirm','pending_home','pending_shop'];
const EDITABLE = ['pending_quote','pending_agree','pending_confirm'];
const REJECT_REASONS = ['价格超出预算','时间不合适','想换个款式','其他'];
const TIME_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30'];

function actionsForStatus(order, wechatPayAvailable) {
  const list = [];
  const s = order.status;
  if (s === 'pending_agree') list.push({ key:'reject', label:'拒绝报价', style:'action-ghost' }, { key:'agree', label:'同意报价', style:'action-primary' });
  if (wechatPayAvailable && s === 'pending_confirm' && order.depositAmount > 0 && !order.depositPaid) list.push({ key:'payDeposit', label:'支付定金', style:'action-primary' });
  if (wechatPayAvailable && (s === 'in_progress' || s === 'completed') && order.remainingAmount > 0) list.push({ key:'payFinal', label:'支付尾款', style:'action-primary' });
  if (CANCELLABLE.indexOf(s) >= 0 || EDITABLE.indexOf(s) >= 0) list.unshift({ key:'more', label:'更多操作', style:'action-ghost' });
  return list;
}

Page({
  data: {
    order: null, orderId: '', loading: true, loadFailed: false, loadErrorText: '',
    showReject: false, rejectReason: '', rejectReasons: REJECT_REASONS, submitting: false,
    showEdit: false, editDate: '', editTime: '', editAddresses: [], editAddressId: null, editTimeSlots: TIME_SLOTS, savingEdit: false,
    reviewRating: 5, reviewContent: '', reviewPhotos: [], photoUseAuthorized: false, savingReview: false,
    actionSubmitting: '', availableFund: 0, fundAmount: 0, payments: [], wechatPayAvailable: false
  },

  onLoad(options) {
    this.orderId = options.id;
    this.setData({ orderId: this.orderId || '' });
    if (this.orderId) this.prepareAndLoad();
    else this.setData({ loading: false, loadFailed: true, loadErrorText: '预约参数无效' });
  },
  async prepareAndLoad() {
    const capabilities = await getApp().loadCapabilities();
    this.setData({ wechatPayAvailable: !!capabilities.wechatPay });
    return this.loadOrder();
  },
  onShow() { if (this.orderId && !this.data.loading) this.loadOrder(); },
  onPullDownRefresh() { this.loadOrder().finally(() => wx.stopPullDownRefresh()); },

  async loadOrder() {
    if (this._loadingOrder || !this.orderId) return;
    this._loadingOrder = true;
    this.setData({ loading: true, loadFailed: false, loadErrorText: '' });
    try {
      const results = await Promise.all([
        api.client.orders.detail(this.orderId),
        api.client.payments.listOrder(this.orderId).catch(() => [])
      ]);
      const raw = results[0];
      const payments = results[1] || [];
      const isShop = raw.serviceType === 'shop' || raw.serviceType === '到店美甲';
      let address = '';
      if (typeof raw.address === 'string') address = raw.address;
      else if (raw.address) { const a = raw.address; address = `${a.province||''}${a.city||''}${a.district||''}${a.detail||a.detailAddress||''}`; }
      else if (raw.clientAddress) { const a = raw.clientAddress; address = `${a.province||''}${a.city||''}${a.district||''}${a.detailAddress||''}`; }
      const start = parseDate(raw.startTime), end = parseDate(raw.endTime);
      const durationMinutes = start && end ? Math.round((end.getTime()-start.getTime())/60000) : 0;
      const price = raw.quotePrice || raw.price || 0;
      const depositAmount = raw.depositAmount || 0;
      const depositPaid = !!raw.isDepositPaid;
      const pres = resolveOrderPresentation({ serviceType: isShop ? 'shop' : 'home', address });
      const paidAmount = Number(raw.paidAmount || payments.filter(item => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount || 0), 0));
      const totalPayable = Math.max(0, price - Number(raw.fundDiscountAmount || 0));
      const order = {
        id: raw.id, orderNo: raw.orderNo, status: raw.status, address,
        serviceName: raw.customTitle || raw.customServiceRequest?.title || raw.designRequest?.title || '预约服务',
        remark: raw.remark || raw.note || '', durationMinutes, price, depositAmount, depositPaid,
        fundDiscountAmount: Number(raw.fundDiscountAmount || 0),
        paymentStatus: raw.paymentStatus || 'unpaid', paidAmount,
        totalPayable, remainingAmount: Math.max(0, totalPayable - paidAmount),
        techName: raw.technician?.name || '美甲师', techAvatar: raw.technician?.avatarUrl || '',
        techPhone: raw.technician?.phone || '', techId: raw.technician?.id || raw.technicianId,
        startTime: raw.startTime, endTime: raw.endTime,
        _isShop: isShop, _statusLabel: getStatusLabel(raw.status), _statusTone: getStatusTone(raw.status),
        _statusDesc: STATUS_DESC[raw.status] || '', _typeLabel: pres.typeLabel,
        _dateLabel: formatBookingDate(raw.startTime),
        _timeRange: start && end ? `${formatClock(raw.startTime)} - ${formatClock(raw.endTime)}` : formatClock(raw.startTime),
        _priceText: price ? formatMoney(price) : '待报价',
        _showPriceCard: price > 0 || depositAmount > 0, _actions: null,
        review: raw.review || null,
        sourceWork: raw.sourceWork || null
      };
      order._actions = actionsForStatus(order, this.data.wechatPayAvailable);
      let availableFund = 0;
      try {
        const funds = await api.client.referrals.funds();
        const account = (funds.accounts || []).find(item =>
          String(item.technician.id) === String(order.techId)
        );
        availableFund = account ? Number(account.totals.available || 0) : 0;
      } catch (e) {
        availableFund = 0;
      }
      this.setData({
        order, payments, loading: false, loadFailed: false,
        availableFund,
        fundAmount: Math.min(Number(raw.fundDiscountAmount || 0), availableFund, price),
        reviewRating: raw.review ? raw.review.rating : 5,
        reviewContent: raw.review ? raw.review.content : '',
        reviewPhotos: raw.review ? (raw.review.photos || []) : [],
        photoUseAuthorized: raw.review ? !!raw.review.photoUseAuthorized : false
      });
    } catch (err) {
      this.setData({ loading: false, loadFailed: true, loadErrorText: '预约暂时无法加载' });
    } finally {
      this._loadingOrder = false;
    }
  },

  onFundAmountInput(e) {
    const value = Number(e.detail.value || 0);
    const maximum = Math.min(this.data.availableFund, this.data.order.price);
    this.setData({ fundAmount: Math.max(0, Math.min(value, maximum)) });
  },

  useMaximumFund() {
    this.setData({
      fundAmount: Math.min(this.data.availableFund, this.data.order.price)
    });
  },

  onAction(e) {
    if (this.data.actionSubmitting) return;
    const key = e.currentTarget.dataset.key;
    if (key === 'agree') return this.agreeQuote();
    if (key === 'reject') return this.openReject();
    if (key === 'payDeposit') return this.startPayment('deposit');
    if (key === 'payFinal') return this.startPayment('final');
    if (key === 'cancel') return this.cancelOrder();
    if (key === 'edit') return this.openEdit();
    if (key === 'more') return this.showMoreActions();
  },

  async startPayment(paymentType) {
    if (this.data.actionSubmitting) return;
    this.setData({ actionSubmitting: paymentType });
    try {
      const key = `${this.orderId}-${paymentType}-${Date.now()}`;
      const payment = await api.client.payments.createOrder(this.orderId, paymentType, key);
      if (!payment.channelReady) {
        await wx.showModal({
          title: '微信支付待开通',
          content: payment.unavailableReason || '企业资质完成后即可使用微信支付。支付单已保存，不会重复扣款。',
          showCancel: false,
          confirmText: '知道了'
        });
        await this.loadOrder();
        return;
      }
      const payload = payment.providerPayload || {};
      if (!payload.timeStamp || !payload.nonceStr || !payload.package || !payload.paySign) {
        wx.showToast({ title: '支付渠道正在联调，请稍后再试', icon: 'none' });
        return;
      }
      await wx.requestPayment(payload);
      wx.showToast({ title: '支付成功', icon: 'success' });
      await this.loadOrder();
    } catch (err) {
      const cancelled = String(err && err.errMsg || '').indexOf('cancel') >= 0;
      wx.showToast({ title: cancelled ? '已取消支付' : (err.message || '支付发起失败'), icon: 'none' });
    } finally {
      this.setData({ actionSubmitting: '' });
    }
  },

  showMoreActions() {
    const status = this.data.order.status;
    const actions = [];
    if (EDITABLE.indexOf(status) >= 0) actions.push({ key: 'edit', label: '修改预约' });
    if (CANCELLABLE.indexOf(status) >= 0) actions.push({ key: 'cancel', label: '取消预约' });
    if (!actions.length) return;
    wx.showActionSheet({
      itemList: actions.map(item => item.label),
      success: result => {
        const action = actions[result.tapIndex];
        if (action && action.key === 'edit') this.openEdit();
        if (action && action.key === 'cancel') this.cancelOrder();
      }
    });
  },

  callTech() {
    const phone = this.data.order?.techPhone;
    if (!phone) { wx.showToast({ title: '暂无电话', icon: 'none' }); return; }
    wx.makePhoneCall({ phoneNumber: String(phone) });
  },

  goChat() {
    const o = this.data.order;
    if (!o?.techId) return;
    wx.navigateTo({ url: `/pages/client/chat-detail/index?techId=${o.techId}&techName=${encodeURIComponent(o.techName)}` });
  },

  copyAddress() {
    const addr = this.data.order?.address;
    if (addr) wx.setClipboardData({ data: addr, success: () => wx.showToast({ title: '已复制', icon: 'success' }) });
  },

  viewSourceWork() {
    const sourceWork = this.data.order?.sourceWork;
    if (!sourceWork?.id) return;
    wx.navigateTo({ url: `/pages/client/work-detail/index?id=${sourceWork.id}` });
  },

  selectReviewRating(e) { this.setData({ reviewRating: Number(e.currentTarget.dataset.rating) }); },
  onReviewInput(e) { this.setData({ reviewContent: e.detail.value }); },
  onPhotoAuthorizationChange(e) { this.setData({ photoUseAuthorized: e.detail.value }); },
  chooseReviewPhotos() {
    const remaining = 6 - this.data.reviewPhotos.length;
    if (remaining <= 0) return wx.showToast({ title: '最多上传6张照片', icon: 'none' });
    wx.chooseMedia({
      count: remaining, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: async (res) => {
        wx.showLoading({ title: '上传中...' });
        try {
          const urls = [];
          for (const file of res.tempFiles) {
            const uploaded = await api.upload.image(file.tempFilePath, 'client');
            urls.push(uploaded.url);
          }
          this.setData({ reviewPhotos: this.data.reviewPhotos.concat(urls) });
        } catch (err) { wx.showToast({ title: '照片上传失败', icon: 'none' }); }
        finally { wx.hideLoading(); }
      }
    });
  },
  removeReviewPhoto(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ reviewPhotos: this.data.reviewPhotos.filter((_, i) => i !== index) });
  },
  async saveReview() {
    if (this.data.savingReview) return;
    this.setData({ savingReview: true });
    try {
      await api.client.orders.saveReview(this.orderId, {
        rating: this.data.reviewRating,
        content: this.data.reviewContent.trim(),
        photos: this.data.reviewPhotos,
        photoUseAuthorized: this.data.photoUseAuthorized
      });
      wx.showToast({ title: this.data.order.review ? '评价已更新' : '感谢你的评价', icon: 'success' });
      this.loadOrder();
    } catch (err) { wx.showToast({ title: err.message || '评价保存失败', icon: 'none' }); }
    finally { this.setData({ savingReview: false }); }
  },

  // ---- 同意报价 ----
  async agreeQuote() {
    const payable = Math.max(0, this.data.order.price - this.data.fundAmount);
    const r = await wx.showModal({ title: '同意报价', content: `报价 ${this.data.order._priceText}，基金抵扣 ¥${this.data.fundAmount}，预计支付 ¥${payable}。`, confirmText: '同意' });
    if (!r.confirm) return;
    this.setData({ actionSubmitting: 'agree' });
    try {
      wx.showLoading({ title: '处理中...' });
      await api.client.orders.acceptQuote(this.orderId, this.data.fundAmount);
      wx.hideLoading(); wx.showToast({ title: '已同意报价', icon: 'success' });
      this.loadOrder();
    } catch (err) { wx.hideLoading(); wx.showToast({ title: err.message || '操作失败', icon: 'none' }); }
    finally { this.setData({ actionSubmitting: '' }); }
  },

  // ---- 拒绝报价 ----
  openReject() { this.setData({ showReject: true, rejectReason: '' }); },
  closeReject() { this.setData({ showReject: false }); },
  onRejectReasonInput(e) { this.setData({ rejectReason: e.detail.value }); },
  onPickReason(e) { this.setData({ rejectReason: e.currentTarget.dataset.reason }); },
  async submitReject() {
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      await api.client.orders.rejectQuote(this.orderId, this.data.rejectReason || '用户拒绝');
      this.setData({ submitting: false, showReject: false });
      wx.showToast({ title: '已拒绝报价', icon: 'success' }); this.loadOrder();
    } catch (err) { this.setData({ submitting: false }); wx.showToast({ title: err.message || '操作失败', icon: 'none' }); }
  },

  // ---- 定金 ----
  async markDepositPaid() {
    const r = await wx.showModal({ title: '确认已支付定金', content: `请确认你已通过线下方式向美甲师支付定金 ¥${this.data.order.depositAmount}`, confirmText: '已支付' });
    if (!r.confirm) return;
    this.setData({ actionSubmitting: 'deposit' });
    try {
      wx.showLoading({ title: '处理中...' });
      await api.client.orders.markDepositPaid(this.orderId);
      wx.hideLoading(); wx.showToast({ title: '已确认定金', icon: 'success' }); this.loadOrder();
    } catch (err) { wx.hideLoading(); wx.showToast({ title: err.message || '操作失败', icon: 'none' }); }
    finally { this.setData({ actionSubmitting: '' }); }
  },

  // ---- 取消 ----
  async cancelOrder() {
    const r = await wx.showModal({ title: '取消预约', content: '确定要取消这个预约吗？', confirmText: '取消预约', confirmColor: '#DC4C58' });
    if (!r.confirm) return;
    this.setData({ actionSubmitting: 'cancel' });
    try {
      wx.showLoading({ title: '处理中...' });
      await api.client.orders.cancel(this.orderId);
      wx.hideLoading(); wx.showToast({ title: '预约已取消', icon: 'success' }); this.loadOrder();
    } catch (err) { wx.hideLoading(); wx.showToast({ title: err.message || '操作失败', icon: 'none' }); }
    finally { this.setData({ actionSubmitting: '' }); }
  },

  // ---- 编辑预约 ----
  async openEdit() {
    const o = this.data.order;
    const d = new Date(o.startTime);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const timeStr = formatClock(o.startTime);
    this.setData({ showEdit: true, editDate: dateStr, editTime: timeStr, editAddressId: null });
    try {
      const res = await api.client.addresses.list();
      const addrs = res.list || res.data || res || [];
      this.setData({ editAddresses: addrs, editAddressId: addrs.find(a => a.isDefault)?.id || addrs[0]?.id || null });
    } catch(e) {}
  },
  closeEdit() { this.setData({ showEdit: false }); },
  onEditDateChange(e) { this.setData({ editDate: e.detail.value }); },
  onEditTimeChange(e) { this.setData({ editTime: this.data.editTimeSlots[e.detail.value] }); },
  onEditAddressSelect(e) { this.setData({ editAddressId: e.currentTarget.dataset.id }); },
  async saveEdit() {
    if (this.data.savingEdit) return;
    const { editDate, editTime, editAddressId } = this.data;
    if (!editDate) { wx.showToast({ title: '请选择日期', icon: 'none' }); return; }
    if (!editTime) { wx.showToast({ title: '请选择时间', icon: 'none' }); return; }
    this.setData({ savingEdit: true });
    wx.showLoading({ title: '保存中...' });
    try {
      await api.client.orders.update(this.orderId, {
        serviceDate: editDate, startTime: editTime,
        addressId: editAddressId || undefined
      });
      wx.hideLoading(); wx.showToast({ title: '修改成功', icon: 'success' });
      this.setData({ showEdit: false }); this.loadOrder();
    } catch (err) {
      wx.hideLoading(); wx.showToast({ title: err.message || '修改失败', icon: 'none' });
    } finally { this.setData({ savingEdit: false }); }
  }
});
