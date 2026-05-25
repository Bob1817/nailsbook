const api = require('../../../services/api');

Page({
  data: {
    isEdit: false,
    addressId: null,
    contactName: '',
    contactPhone: '',
    province: '',
    city: '',
    district: '',
    detailAddress: '',
    doorInfo: '',
    isDefault: false,
    submitting: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ isEdit: true, addressId: options.id });
      this.loadAddress(options.id);
    }
  },

  async loadAddress(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const addr = await api.client.addresses.detail(id);
      this.setData({
        contactName: addr.contactName || '',
        contactPhone: addr.contactPhone || '',
        province: addr.province || '',
        city: addr.city || '',
        district: addr.district || '',
        detailAddress: addr.detailAddress || addr.detail || '',
        doorInfo: addr.doorInfo || '',
        isDefault: addr.isDefault || false
      });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onDefaultChange(e) {
    this.setData({ isDefault: e.detail.value });
  },

  // 微信选择地址
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        // res.name, res.address, res.latitude, res.longitude
        // 简单解析省市区（实际项目可接腾讯地图逆地理编码）
        this.setData({
          detailAddress: res.address || '',
          province: '',
          city: res.city || '',
          district: '',
          _latitude: res.latitude,
          _longitude: res.longitude
        });
      }
    });
  },

  validate() {
    const { contactName, contactPhone, province, city, detailAddress } = this.data;
    if (!contactName.trim()) { wx.showToast({ title: '请输入联系人姓名', icon: 'none' }); return false; }
    if (!/^1\d{10}$/.test(contactPhone)) { wx.showToast({ title: '请输入正确的手机号', icon: 'none' }); return false; }
    if (!detailAddress.trim()) { wx.showToast({ title: '请输入详细地址', icon: 'none' }); return false; }
    return true;
  },

  async handleSubmit() {
    if (!this.validate() || this.data.submitting) return;

    const { contactName, contactPhone, province, city, district, detailAddress, doorInfo, isDefault, isEdit, addressId, _latitude, _longitude } = this.data;

    const payload = {
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      province: province.trim(),
      city: city.trim(),
      district: district.trim(),
      detailAddress: detailAddress.trim(),
      doorInfo: doorInfo.trim() || undefined,
      isDefault,
      latitude: _latitude,
      longitude: _longitude
    };

    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中...' });

    try {
      if (isEdit) {
        await api.client.addresses.update(addressId, payload);
      } else {
        await api.client.addresses.create(payload);
      }
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (err) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  }
});
