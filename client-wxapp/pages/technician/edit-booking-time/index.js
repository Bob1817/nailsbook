const api = require('../../../services/api');
const { parseDate, formatClock } = require('../../../utils/format');

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
    saving: false
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
      console.error('loadTechInfo failed:', e);
    }
  },

  onTimeChange(e) {
    var detail = e.detail;
    this.setData({
      selectedDate: detail.serviceDate,
      selectedTime: detail.startTime
    });
  },

  goBack() {
    wx.navigateBack();
  },

  async saveTime() {
    if (this.data.saving || !this.data.selectedDate || !this.data.selectedTime) return;
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });
    try {
      var start = new Date(this.data.selectedDate + 'T' + this.data.selectedTime + ':00');
      var end = new Date(start.getTime() + this.data.durationMinutes * 60000);
      await api.technician.orders.update(this.orderId, {
        startTime: start.toISOString(),
        endTime: end.toISOString()
      });
      wx.hideLoading();
      wx.showToast({ title: '时间已更新', icon: 'success' });
      var pages = getCurrentPages();
      var prevPage = pages[pages.length - 2];
      if (prevPage && prevPage.loadOrder) prevPage.loadOrder();
      setTimeout(function () { wx.navigateBack(); }, 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
