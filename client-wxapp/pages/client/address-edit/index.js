const api = require('../../../services/api');
const location = require('../utils/location');

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
    latitude:null, longitude:null, requireLocation:true, locationName:'', choosingLocation:false,
    doorInfo: '',
    isDefault: false,
    lockDefault: false,
    submitting: false
  },

  onLoad(options) {
    this._unloaded = false;
    this._pageActive = true;
    this._selectForBooking = options.select === '1';
    this.setData({ requireLocation:true });
    if (options.id) {
      this.setData({ isEdit: true, addressId: options.id });
      this.loadAddress(options.id);
    } else if (options.forceDefault) {
      // 新增第一个地址：强制为默认且不可取消
      this.setData({ isDefault: true, lockDefault: true });
    }
  },

  onShow() {
    this._pageActive = true;
    if (this._submitFinishedWhileHidden) {
      this.setData({ submitting: false });
      this._submitFinishedWhileHidden = false;
    }
  },
  onHide() { this._pageActive = false; },
  onUnload() {
    this._unloaded = true;
    this._pageActive = false;
    if (this._navTimer) clearTimeout(this._navTimer);
  },

  async loadAddress(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const addr = await api.client.addresses.detail(id);
      wx.hideLoading();
      if (!this._pageActive) return;
      if (!addr) {
        wx.showToast({ title: '地址不存在', icon: 'none' });
        return;
      }
      this.setData({
        latitude:location.coordinates(addr) ? Number(addr.latitude) : null, longitude:location.coordinates(addr) ? Number(addr.longitude) : null,
        contactName: addr.contactName || '',
        contactPhone: addr.contactPhone || '',
        province: addr.province || '',
        city: addr.city || '',
        district: addr.district || '',
        detailAddress: addr.detailAddress || addr.detail || '',
        doorInfo: addr.doorInfo || '',
        isDefault: addr.isDefault || false,
        // 正在编辑当前默认地址：必须保留一个默认，开关锁定为开
        lockDefault: addr.isDefault || false
      });
    } catch (err) {
      wx.hideLoading();
      if (!this._pageActive) return;
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onInput(e) {
    const field=e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value, ...(['province','city','district','detailAddress'].includes(field) ? { latitude:null, longitude:null, locationName:'' } : {}) });
  },

  chooseMapLocation() {
    if (this.data.submitting || this.data.choosingLocation) return;
    if (!this.data.province || !this.data.city) return wx.showToast({ title:'请先选择所在省市区', icon:'none' });
    this.setData({ choosingLocation:true });
    location.selectLocation(this.data, res => {
      if (!this._unloaded) this.setData({ latitude:res.latitude, longitude:res.longitude, locationName:res.name || '', detailAddress:location.detailForRegion(res.address || res.name, [this.data.province, this.data.city, this.data.district]) });
    }, () => { if (!this._unloaded) this.setData({ choosingLocation:false }); });
  },

  onRegionChange(e) {
    const [province, city, district] = e.detail.value;
    this.setData({ province, city, district, latitude:null, longitude:null, locationName:'' });
  },

  onDefaultChange(e) {
    // 默认地址不能为空：锁定时不允许关闭
    if (this.data.lockDefault) {
      this.setData({ isDefault: true });
      wx.showToast({ title: '至少保留一个默认地址', icon: 'none' });
      return;
    }
    this.setData({ isDefault: e.detail.value });
  },

  validate() {
    const { contactName, contactPhone, province, city, detailAddress } = this.data;
    if (!contactName.trim()) { wx.showToast({ title: '请输入联系人姓名', icon: 'none' }); return false; }
    if (!/^1\d{10}$/.test(contactPhone)) { wx.showToast({ title: '请输入正确的手机号', icon: 'none' }); return false; }
    if (!detailAddress.trim()) { wx.showToast({ title: '请输入详细地址', icon: 'none' }); return false; }
    if (this.data.requireLocation && (!province.trim() || !city.trim())) { wx.showToast({ title:'请填写上门地址所在省市', icon:'none' }); return false; }
    if (this.data.requireLocation && !location.coordinates(this.data)) { wx.showToast({ title:'请在地图确认上门地址位置', icon:'none' }); return false; }
    return true;
  },

  async handleSubmit() {
    if (this.data.submitting || this.data.choosingLocation || !this.validate()) return;

    const { contactName, contactPhone, province, city, district, detailAddress, doorInfo, isDefault, isEdit, addressId } = this.data;

    const payload = {
      latitude:this.data.latitude, longitude:this.data.longitude,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      province: province.trim(),
      city: city.trim(),
      district: district.trim(),
      detailAddress: detailAddress.trim(),
      doorInfo: doorInfo.trim() || undefined,
      isDefault
    };

    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const saved = isEdit ? await api.client.addresses.update(addressId, payload) : await api.client.addresses.create(payload);
      if (this._selectForBooking && saved && saved.id) wx.setStorageSync('client_selected_address', saved);
      wx.hideLoading();
      if (!this._pageActive) { this._submitFinishedWhileHidden = true; return; }
      wx.showToast({ title: '保存成功', icon: 'success' });
      this._navTimer = setTimeout(() => {
        if (this._pageActive) wx.navigateBack();
      }, 800);
    } catch (err) {
      wx.hideLoading();
      if (!this._pageActive) { this._submitFinishedWhileHidden = true; return; }
      this.setData({ submitting: false });
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  }
});
