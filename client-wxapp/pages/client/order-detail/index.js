const uiColors = require('../../../utils/colors');
const api = require('../../../services/api');
const { normalizeSourceWorkSummary } = require('../../../utils/normalize-work');
const { parseDate, formatClock, formatBookingDate, formatMoney } = require('../../../utils/format');
const { resolveOrderPresentation, getStatusLabel, getStatusTone } = require('../../../utils/order');
const { requestBookingReminder } = require('../../../utils/wechat-subscription');

const STATUS_DESC = {
  pending_quote: '美甲师正在为你准备报价，请稍候',
  pending_agree: '美甲师已报价，请确认是否接受',
  pending_client_confirm: '请确认本次预约信息',
  pending_confirm: '你已同意报价，等待美甲师确认排期',
  pending_shop: '已确认排期，请按时到店',
  in_progress: '服务进行中',
  completed: '服务已完成，期待再次为你服务',
  cancelled: '预约已取消'
};

const CANCELLABLE = ['pending_quote','pending_agree','pending_confirm','pending_shop'];
const EDITABLE = ['pending_quote','pending_agree','pending_confirm'];
const REJECT_REASONS = ['价格超出预算','时间不合适','想换个款式','其他'];
const TIME_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30'];

function timeToMin(t) { var p = t.split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]); }

function actionsForStatus(order) {
  const list = [];
  const s = order.status;
  if (s === 'pending_agree') {
    list.push({ key:'reject', label:'拒绝报价', style:'action-ghost' });
    list.push({ key:'agree', label:'同意报价', style:'action-primary' });
  }
  if (EDITABLE.indexOf(s) >= 0) list.push({ key:'edit', label:'修改预约', style:'action-ghost' });
  if (CANCELLABLE.indexOf(s) >= 0) list.push({ key:'cancel', label:'取消预约', style:'action-danger' });
  return list;
}

Page({
  data: {
    order: null, orderId: '', loading: true, loadFailed: false, loadErrorText: '',
    shopLocation: null,
    shopGuidance: null,
    showReject: false, rejectReason: '', rejectReasons: REJECT_REASONS, submitting: false,
    showEdit: false, editDate: '', editTime: '', editAddresses: [], editAddressId: null, savingEdit: false,
    reviewRating: 5, reviewContent: '', reviewPhotos: [], photoUseAuthorized: false, savingReview: false,
    actionSubmitting: '',
    showActions: false
  },

  onLoad(options) {
    this.orderId = options.id;
    this.setData({ orderId: this.orderId || '' });
    if (this.orderId) this.prepareAndLoad();
    else this.setData({ loading: false, loadFailed: true, loadErrorText: '预约参数无效' });
  },
  async prepareAndLoad() {
    return this.loadOrder();
  },
  openServiceRecord() {
    if (!this.data.order || this.data.order.status !== 'completed') return;
    wx.navigateTo({ url: '/pages/client/beauty-archive/index?orderId=' + encodeURIComponent(this.orderId) });
  },
  onShow() { if (this.orderId && !this.data.loading) this.loadOrder(); },
  onPullDownRefresh() { this.loadOrder().finally(() => wx.stopPullDownRefresh()); },

  async loadOrder() {
    if (this._loadingOrder || !this.orderId) return;
    this._loadingOrder = true;
    this.setData({ loading: true, loadFailed: false, loadErrorText: '' });
    try {
      const raw = await api.client.orders.detail(this.orderId);
      let sourceWork = raw.sourceWork || null;
      const sourceWorkId = raw.sourceWorkId || (sourceWork && sourceWork.id);
      if (sourceWorkId && (!sourceWork || !normalizeSourceWorkSummary(sourceWork)._priceFen)) {
        try { sourceWork = await api.client.works.detail(sourceWorkId); } catch (e) {}
      }
      sourceWork = normalizeSourceWorkSummary(sourceWork);
      const isShop = raw.serviceType === 'shop' || raw.serviceType === '到店美甲';
      let address = '';
      if (typeof raw.address === 'string') address = raw.address;
      else if (raw.address) { const a = raw.address; address = `${a.province||''}${a.city||''}${a.district||''}${a.detail||a.detailAddress||''}`; }
      else if (raw.clientAddress) { const a = raw.clientAddress; address = `${a.province||''}${a.city||''}${a.district||''}${a.detailAddress||''}`; }
      const start = parseDate(raw.startTime), end = parseDate(raw.endTime);
      const durationMinutes = start && end ? Math.round((end.getTime()-start.getTime())/60000) : 0;
      const price = raw.quotePrice || raw.price || 0;
      const serviceSubtotalFen = Number(raw.serviceSubtotalFen || 0);
      const finalPriceFen = raw.finalPriceFen == null ? Math.round(price * 100) : Number(raw.finalPriceFen);
      const priceDifferenceFen = finalPriceFen - serviceSubtotalFen;
      const workPriceFen = sourceWork && sourceWork.standardPriceFen ? Number(sourceWork.standardPriceFen) : 0;
      const hasTechnicianQuote = !!raw.quotedAt;
      const depositAmount = raw.depositAmount || 0;
      const depositPaid = !!raw.isDepositPaid;
      const pres = resolveOrderPresentation({ serviceType: isShop ? 'shop' : 'home', address });
      const order = {
        id: raw.id, orderNo: raw.orderNo, status: raw.status, address,
        bookingPhase: raw.bookingPhase || 'application', bookingType: raw.bookingType || 'legacy',
        serviceName: raw.customTitle || raw.customServiceRequest?.title || raw.designRequest?.title || '预约服务',
        remark: raw.remark || raw.note || '', durationMinutes, price, depositAmount, depositPaid,
        techName: raw.technician?.name || '美甲师', techAvatar: raw.technician?.avatarUrl || '',
        techPhone: raw.technician?.phone || '', techId: raw.technician?.id || raw.technicianId,
        startTime: raw.startTime, endTime: raw.endTime, durationPending: raw.durationPending === true,
        shopName: raw.shopAddress?.name || '',
        _isShop: isShop, _statusLabel: getStatusLabel(raw.status), _statusTone: getStatusTone(raw.status),
        _statusDesc: STATUS_DESC[raw.status] || '', _typeLabel: pres.typeLabel,
        _dateLabel: formatBookingDate(raw.startTime),
        _timeRange: start && end ? `${formatClock(raw.startTime)} - ${formatClock(raw.endTime)}` : formatClock(raw.startTime),
        _priceText: price ? formatMoney(price) : '待报价',
        _actualAmountText: formatMoney(raw.actualAmount == null ? price : Number(raw.actualAmount)),
        _showPriceCard: price > 0 || depositAmount > 0, _actions: null,
        review: raw.review || null,
        sourceWork,
        quoteVersion: raw.quoteVersion || 0,
        acceptedProposal: raw.acceptedProposal,
        pricingDetails: raw.pricingDetails,
        serviceLines: raw.serviceLines || [],
        serviceSubtotalFen,
        discountAmountFen: Number(raw.discountAmountFen || 0),
        finalPriceFen,
        priceDifferenceFen,
        workPriceFen,
        hasTechnicianQuote,
        priceLabel: hasTechnicianQuote ? '最终报价' : (raw.bookingType === 'work' ? '作品报价' : raw.bookingType === 'standard' ? '组合价格' : '待报价'),
        servicePriceSuperseded: finalPriceFen > 0 && finalPriceFen !== serviceSubtotalFen,
        workPriceSuperseded: hasTechnicianQuote && workPriceFen > 0 && finalPriceFen !== workPriceFen
      };
      order._actions = actionsForStatus(order);

      // 店铺订单：拉取美甲师公开信息，获取坐标与指引
      let shopLocation = null;
      let shopGuidance = null;
      if (order.techId) {
        try {
          const publicGuidance = await api.public.artists.shopGuidance(order.techId, { address: order.address || '' });
          const matchedShop = publicGuidance.shop || {};
          order.shopName = matchedShop.name || '';
          if (matchedShop.latitude && matchedShop.longitude) {
              shopLocation = {
                latitude: parseFloat(matchedShop.latitude),
                longitude: parseFloat(matchedShop.longitude),
                name: matchedShop.name || order.techName,
                address: order.address
              };
          }
          shopGuidance = publicGuidance.guidance || null;
        } catch(e) { /* non-critical */ }
      }

      this.setData({
        order, loading: false, loadFailed: false,
        shopLocation, shopGuidance,
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

  onAction(e) {
    const key = e.currentTarget.dataset.key;
    this.handleAction(key);
  },

  handleAction(key) {
    if (this.data.actionSubmitting) return;
    this.setData({ showActions: false });
    if (key === 'agree') return this.agreeQuote();
    if (key === 'reject') return this.openReject();
    if (key === 'cancel') return this.cancelOrder();
    if (key === 'edit') return this.openEdit();
  },

  openActionsSheet() {
    if (this.data.actionSubmitting) return;
    this.setData({ showActions: true });
  },

  closeActions() {
    this.setData({ showActions: false });
  },

  callTech() {
    const phone = this.data.order?.techPhone;
    if (!phone) { wx.showToast({ title: '暂无电话', icon: 'none' }); return; }
    wx.makePhoneCall({ phoneNumber: String(phone) });
  },

  viewArtist() {
    const id = this.data.order?.techId;
    if (id) wx.navigateTo({ url: `/pages/client/artist-home/index?id=${id}` });
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

  navigateToShop() {
    const loc = this.data.shopLocation;
    if (loc && loc.latitude && loc.longitude) {
      wx.openLocation({
        latitude: loc.latitude,
        longitude: loc.longitude,
        name: loc.name || '店铺位置',
        address: loc.address || '',
        scale: 18
      });
    } else {
      // 无坐标时复制地址，用户可粘贴到导航 app
      const addr = this.data.order?.address;
      if (addr) {
        wx.setClipboardData({ data: addr, success: () => wx.showToast({ title: '地址已复制，请打开导航 App 粘贴', icon: 'none', duration: 2500 }) });
      } else {
        wx.showToast({ title: '暂无地址信息', icon: 'none' });
      }
    }
  },

  openShopGuidance() {
    const o = this.data.order;
    if (!o?.techId) return;
    wx.navigateTo({
      url: `/pages/client/shop-guidance/index?techId=${o.techId}&shopName=${encodeURIComponent(o.shopName || '')}&address=${encodeURIComponent(o.address || '')}`
    });
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
    const r = await wx.showModal({ title: '同意报价', content: `确认接受报价 ${this.data.order._priceText}？实际付款由你与门店线下完成。`, confirmText: '同意' });
    if (!r.confirm) return;
    await requestBookingReminder('client');
    this.setData({ actionSubmitting: 'agree' });
    try {
      wx.showLoading({ title: '处理中...' });
      await api.client.orders.acceptQuote(this.orderId, 0, this.data.order.quoteVersion);
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
      await api.client.orders.rejectQuote(this.orderId, this.data.rejectReason || '用户拒绝', this.data.order.quoteVersion);
      this.setData({ submitting: false, showReject: false });
      wx.showToast({ title: '已拒绝报价', icon: 'success' }); this.loadOrder();
    } catch (err) { this.setData({ submitting: false }); wx.showToast({ title: err.message || '操作失败', icon: 'none' }); }
  },

  // ---- 取消 ----
  async cancelOrder() {
    const r = await wx.showModal({
      title: '取消预约',
      content: '确定要取消这个预约吗？如已与门店线下结算，请同时与门店沟通处理。',
      confirmText: '确认取消',
      confirmColor: uiColors.danger
    });
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
    if (o._isShop) return;
    try {
      const res = await api.client.addresses.list();
      const addrs = res.list || res.data || res || [];
      this.setData({ editAddresses: addrs, editAddressId: addrs.find(a => a.isDefault)?.id || addrs[0]?.id || null });
    } catch(e) {}
  },
  closeEdit() { this.setData({ showEdit: false }); },
  onEditTimeChange(e) {
    var detail = e.detail;
    this.setData({ editDate: detail.serviceDate, editTime: detail.startTime });
  },
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
