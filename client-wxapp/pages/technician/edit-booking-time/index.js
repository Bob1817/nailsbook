const api = require('../../../services/api');

function pad2(value) { return String(value).padStart(2, '0'); }
function localDate(value) { return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`; }
function sourceLabel(order) {
  if (order.isRepeatBooking || order.attributionChannel === 'repeat') return '再次预约';
  if (order.quickBooking) return '快速预约';
  if (order.sourceWorkId || order.sourceWork) return '预约同款';
  if (order.source === 'technician') return '美甲师代客预约';
  return '美甲师主页';
}

Page({
  data: {
    orderId: 0,
    repeatMode: false,
    techId: 0,
    originalDate: '',
    originalTime: '',
    selectedDate: '',
    selectedTime: '',
    serviceType: 'shop',
    selectedShopName: '',
    orderAddress: '',
    durationMinutes: 120,
    customerName: '',
    bookingSource: '',
    serviceName: '',
    note: '',
    saving: false,
    saved: false,
    loading: false,
    loadError: ''
  },

  onLoad(options) {
    this.orderId = parseInt(options.id) || 0;
    var repeatMode = options.mode === 'repeat';
    var origDate = options.date || '';
    var origTime = options.time || '';

    // 加载技师信息获取 techId 和店铺信息
    this.setData({
      orderId: this.orderId,
      repeatMode: repeatMode,
      originalDate: origDate,
      originalTime: origTime,
      selectedDate: repeatMode ? localDate(new Date()) : origDate,
      selectedTime: repeatMode ? '' : origTime,
      serviceType: options.serviceType || 'shop',
      selectedShopName: options.shopName || '',
      orderAddress: options.address || '',
      durationMinutes: Math.max(1, parseInt(options.duration) || 120)
    });
    if (repeatMode) this._loadRepeatOrder();
    else this._loadTechInfo();
  },

  async _loadRepeatOrder() {
    if (!this.orderId) {
      this.setData({ loadError: '预约参数无效' });
      return;
    }
    this.setData({ loading: true, loadError: '' });
    try {
      var order = await api.technician.orders.detail(this.orderId);
      var start = new Date(order.startTime);
      var end = new Date(order.endTime);
      var names = (order.serviceLines || []).map(function (line) { return line.nameSnapshot || line.name; }).filter(Boolean);
      var serviceName = (order.isRepeatBooking && order.customTitle) || (order.sourceWork && order.sourceWork.title) || order.customTitle || names.join('、') || (order.service && order.service.name) || order.remark || '预约服务';
      var duration = start.getTime() < end.getTime() ? Math.round((end - start) / 60000) : (order.totalDurationMinutes || 120);
      this.setData({
        originalDate: Number.isNaN(start.getTime()) ? '' : localDate(start),
        originalTime: Number.isNaN(start.getTime()) ? '' : `${pad2(start.getHours())}:${pad2(start.getMinutes())}`,
        serviceType: order.serviceType || '到店美甲',
        orderAddress: order.address || '',
        durationMinutes: Math.max(1, duration),
        customerName: (order.customer && order.customer.name) || '客户',
        bookingSource: sourceLabel(order),
        serviceName: serviceName,
        note: order.remark && order.remark !== serviceName ? order.remark : ''
      });
      await this._loadTechInfo();
    } catch (e) {
      this.setData({ loadError: e.message || '无法加载原预约，请重试' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async _loadTechInfo() {
    if (this._techInfoLoading) return;
    this._techInfoLoading = true;
    this.setData({ loading: true, loadError: '' });
    try {
      var userInfo = await api.technician.auth.getUserInfo();
      var shopAddrs = (userInfo.shopAddresses || []).filter(function (s) { return s.enabled !== false; });
      var selectedShopName = this.data.selectedShopName;
      if (!selectedShopName && this.data.orderAddress) {
        var normalizedAddress = this.data.orderAddress.replace(/\s+/g, '');
        var matched = shopAddrs.find(function (shop) {
          var full = [shop.province, shop.city, shop.district, shop.detailAddress].filter(Boolean).join('').replace(/\s+/g, '');
          return full === normalizedAddress || (shop.detailAddress && normalizedAddress.indexOf(shop.detailAddress.replace(/\s+/g, '')) >= 0);
        });
        selectedShopName = matched ? matched.name : '';
      }
      this.setData({
        techId: userInfo.id,
        selectedShopName: selectedShopName
      });
    } catch (e) {
      this.setData({ loadError: '无法加载可预约时间，请重试' });
    } finally {
      this._techInfoLoading = false;
      this.setData({ loading: false });
    }
  },

  onTimeChange(e) {
    if (this.data.saving || this.data.saved) return;
    var detail = e.detail;
    this.setData({
      selectedDate: detail.serviceDate,
      selectedTime: detail.startTime
    });
  },

  onServiceNameInput(e) { this.setData({ serviceName: e.detail.value }); },
  onNoteInput(e) { this.setData({ note: e.detail.value }); },

  goBack() {
    if (this.data.saving) return;
    wx.navigateBack();
  },

  onUnload() {
    if (this._returnTimer) clearTimeout(this._returnTimer);
  },

  async saveTime() {
    if (this.data.saving || this.data.saved || this.data.loading || this.data.loadError || !this.data.techId) return;
    if (!this.orderId || !this.data.selectedDate || !this.data.selectedTime) {
      wx.showToast({ title: '请选择有效的预约时间', icon: 'none' });
      return;
    }
    var start = new Date(this.data.selectedDate + 'T' + this.data.selectedTime + ':00');
    if (!Number.isFinite(start.getTime())) {
      wx.showToast({ title: '预约时间无效，请重新选择', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });
    try {
      var end = new Date(start.getTime() + this.data.durationMinutes * 60000);
      if (this.data.repeatMode) {
        await api.technician.orders.repeat(this.orderId, {
          startTime: start.toISOString(),
          serviceName: String(this.data.serviceName || '').trim(),
          note: String(this.data.note || '').trim()
        });
      } else {
        await api.technician.orders.update(this.orderId, {
          startTime: start.toISOString(),
          endTime: end.toISOString()
        });
      }
      this.setData({ saved: true });
      wx.hideLoading();
      wx.showToast({ title: this.data.repeatMode ? '已发起新预约' : '时间已更新', icon: 'success' });
      var pages = getCurrentPages();
      var prevPage = pages[pages.length - 2];
      if (prevPage && prevPage.loadOrder) prevPage.loadOrder();
      this._returnTimer = setTimeout(function () { wx.navigateBack(); }, 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
