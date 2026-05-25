const api = require('../../../services/api');

Page({
  data: {
    technician: null,
    serviceItems: [],
    selectedServiceIds: [],
    serviceType: '上门',
    addresses: [],
    selectedAddressId: null,
    serviceDate: '',
    startTime: '',
    remark: '',
    submitting: false,
    minDate: ''
  },

  onLoad() {
    const today = new Date();
    const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.setData({ minDate, serviceDate: minDate });
    this.loadTechnicianInfo();
    this.loadAddresses();
  },

  onShow() {
    this.loadAddresses();
  },

  loadTechnicianInfo() {
    const bindings = wx.getStorageSync('client_bindings') || [];
    if (bindings.length === 0) return;
    const tech = bindings[0].technician || bindings[0];
    this.setData({
      technician: tech,
      serviceItems: tech.serviceItems || []
    });
  },

  async loadAddresses() {
    try {
      const res = await api.client.addresses.list();
      const addresses = res.list || res.data || res || [];
      const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
      this.setData({
        addresses,
        selectedAddressId: defaultAddr ? defaultAddr.id : null
      });
    } catch (e) {}
  },

  onServiceTypeChange(e) {
    this.setData({ serviceType: e.currentTarget.dataset.type });
  },

  onAddressTap(e) {
    this.setData({ selectedAddressId: e.currentTarget.dataset.id });
  },

  onDateChange(e) {
    this.setData({ serviceDate: e.detail.value });
  },

  onTimeChange(e) {
    this.setData({ startTime: e.detail.value });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  toggleService(e) {
    const id = e.currentTarget.dataset.id;
    let ids = [...this.data.selectedServiceIds];
    const idx = ids.indexOf(id);
    if (idx >= 0) ids.splice(idx, 1);
    else ids.push(id);
    this.setData({ selectedServiceIds: ids });
  },

  goToAddAddress() {
    wx.navigateTo({ url: '/pages/client/address-edit/index' });
  },

  async handleSubmit() {
    const { technician, serviceType, selectedAddressId, serviceDate, startTime, remark, selectedServiceIds, submitting } = this.data;
    if (submitting) return;

    if (!technician) {
      wx.showToast({ title: '未绑定美甲师', icon: 'none' });
      return;
    }
    if (!serviceDate) {
      wx.showToast({ title: '请选择预约日期', icon: 'none' });
      return;
    }
    if (!startTime) {
      wx.showToast({ title: '请选择预约时间', icon: 'none' });
      return;
    }
    if (serviceType === '上门' && !selectedAddressId) {
      wx.showToast({ title: '请先添加上门地址', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      const payload = {
        techId: technician.id,
        serviceDate,
        startTime,
        serviceType,
      };
      if (remark) payload.remark = remark;
      if (selectedServiceIds.length > 0) payload.selectedServiceIds = selectedServiceIds;
      if (serviceType === '上门') payload.addressId = selectedAddressId;

      await api.client.orders.create(payload);
      wx.hideLoading();
      wx.showToast({ title: '预约成功', icon: 'success' });
      setTimeout(() => wx.navigateTo({ url: '/pages/client/orders/index' }), 1200);
    } catch (err) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({ title: err.message || '提交失败，请重试', icon: 'none' });
    }
  }
});
