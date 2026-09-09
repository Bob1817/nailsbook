const api = require('../../../services/api');

Page({
  data: {
    orderId: 0,
    techId: 0,
    originalDate: '',
    originalTime: '',
    selectedDate: '',
    selectedTime: '',
    serviceType: 'shop',
    selectedShopName: '',
    orderAddress: '',
    durationMinutes: 120,
    saving: false,
    saved: false,
    loading: false,
    loadError: ''
  },

  onLoad(options) {
    this.orderId = parseInt(options.id) || 0;
    var origDate = options.date || '';
    var origTime = options.time || '';

    // 加载技师信息获取 techId 和店铺信息
    this.setData({
      orderId: this.orderId,
      originalDate: origDate,
      originalTime: origTime,
      selectedDate: origDate,
      selectedTime: origTime,
      serviceType: options.serviceType || 'shop',
      selectedShopName: options.shopName || '',
      orderAddress: options.address || '',
      durationMinutes: Math.max(1, parseInt(options.duration) || 120)
    });
    this._loadTechInfo();
  },

  async _loadTechInfo() {
    if (this.data.loading) return;
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
      await api.technician.orders.update(this.orderId, {
        startTime: start.toISOString(),
        endTime: end.toISOString()
      });
      this.setData({ saved: true });
      wx.hideLoading();
      wx.showToast({ title: '时间已更新', icon: 'success' });
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
