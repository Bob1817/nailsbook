const api = require('../../../services/api');
const privacy = require('../../../utils/privacy');

// 营业时间默认配置
const DEFAULT_BUSINESS_HOURS = [
  { weekday: 1, start: '10:00', end: '21:00', closed: false },
  { weekday: 2, start: '10:00', end: '21:00', closed: false },
  { weekday: 3, start: '10:00', end: '21:00', closed: false },
  { weekday: 4, start: '10:00', end: '21:00', closed: false },
  { weekday: 5, start: '10:00', end: '21:00', closed: false },
  { weekday: 6, start: '10:00', end: '21:00', closed: false },
  { weekday: 0, start: '10:00', end: '21:00', closed: true }
];

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const TIME_OPTIONS = [];
for (let h = 8; h <= 23; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

Page({
  data: {
    shops: [],
    loading: true,
    loadFailed: false,
    showAddModal: false,
    editShop: null,
    // 表单字段
    name: '',
    region: [],
    regionText: '',
    detailAddress: '',
    latitude: '',
    longitude: '',
    locationText: '',
    phone: '',
    enabled: false,
    guidanceEnabled: false,
    businessHours: [],
    // 营业时间编辑
    showBusinessHours: false,
    editingDayIndex: -1,
    timeOptions: TIME_OPTIONS,
    weekdayNames: WEEKDAY_NAMES,
    saving: false,
    locating: false
  },

  onLoad(options) {
    this._fromSetup = options.from === 'setup';
    this.loadShops();
  },

  async loadShops() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const userInfo = await api.technician.auth.getUserInfo();
      const shops = (userInfo.shopAddresses || []).map(shop => ({
        ...shop,
        enabled: shop.enabled !== false,
        businessHours: shop.businessHours || JSON.parse(JSON.stringify(DEFAULT_BUSINESS_HOURS))
      }));
      wx.setStorageSync('technician_userInfo', userInfo);
      this.setData({ shops, loading: false, loadFailed: false });
    } catch (err) {
      this.setData({ loading: false, loadFailed: true });
    }
  },

  openAdd() {
    this.setData({
      showAddModal: true,
      editShop: null,
      name: '',
      region: [],
      regionText: '',
      detailAddress: '',
      latitude: '',
      longitude: '',
      locationText: '',
      phone: '',
      enabled: false,
      guidanceEnabled: false,
      businessHours: JSON.parse(JSON.stringify(DEFAULT_BUSINESS_HOURS))
    });
  },

  openEdit(e) {
    const shop = e.currentTarget.dataset.shop;
    const region = [];
    if (shop.province) region.push(shop.province);
    if (shop.city) region.push(shop.city);
    if (shop.district) region.push(shop.district);
    this.setData({
      showAddModal: true,
      editShop: shop,
      name: shop.name || '',
      region,
      regionText: region.join(' '),
      detailAddress: shop.detailAddress || '',
      latitude: shop.latitude || '',
      longitude: shop.longitude || '',
      locationText: shop.latitude ? '已定位，点击重新选择' : '',
      phone: shop.phone || '',
      enabled: shop.enabled !== false,
      guidanceEnabled: !!(shop.guidance && shop.guidance.enabled),
      businessHours: shop.businessHours || JSON.parse(JSON.stringify(DEFAULT_BUSINESS_HOURS))
    });
  },

  closeModal() {
    this.setData({ showAddModal: false, editShop: null });
    wx.nextTick(() => wx.pageScrollTo({ scrollTop: 0, duration: 0 }));
  },

  onNameInput(e) { this.setData({ name: e.detail.value }); },
  onDetailAddressInput(e) { this.setData({ detailAddress: e.detail.value }); },
  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },

  onRegionChange(e) {
    const region = e.detail.value;
    this.setData({
      region,
      regionText: region.join(' ')
    });
  },

  toggleEnabled(e) {
    this.setData({ enabled: e.detail.value });
  },

  // 地图选址
  async chooseLocation() {
    if (this.data.locating) return;
    this.setData({ locating: true });
    try {
      await privacy.requireWechatPrivacyAuthorization();
      const res = await new Promise((resolve, reject) => {
        wx.chooseLocation({ success: resolve, fail: reject });
      });
      const locationText = [res.name, res.address].filter(Boolean).join(' · ') || '已选择地图位置';
      this.setData({
        latitude: String(res.latitude),
        longitude: String(res.longitude),
        locationText
      });
      wx.showToast({ title: '地图位置已更新', icon: 'success' });
    } catch (err) {
      this.handleLocationFailure(err);
    } finally {
      this.setData({ locating: false });
    }
  },

  handleLocationFailure(err) {
    const message = String((err && err.errMsg) || (err && err.message) || '').toLowerCase();
    if (message.indexOf('cancel') >= 0) return;
    if (message.indexOf('privacy') >= 0) {
      wx.showModal({
        title: '需要隐私授权',
        content: '选择店铺地图位置前，需要先同意小程序隐私保护指引。',
        confirmText: '查看指引',
        success: (res) => { if (res.confirm) privacy.openPrivacyContract(); }
      });
      return;
    }
    if (message.indexOf('auth deny') >= 0 || message.indexOf('auth denied') >= 0 || message.indexOf('permission') >= 0) {
      wx.showModal({
        title: '需要位置权限',
        content: '请在微信设置中允许使用位置信息，然后重新选择店铺位置。',
        confirmText: '去设置',
        success: (res) => {
          if (!res.confirm) return;
          wx.openSetting({
            success: (setting) => {
              if (setting.authSetting && setting.authSetting['scope.userLocation']) this.chooseLocation();
            }
          });
        }
      });
      return;
    }
    wx.showModal({
      title: '无法打开地图',
      content: '请确认系统定位服务已开启，并在真机或微信开发者工具中重试。',
      showCancel: false
    });
  },

  // 地址指引开关
  toggleGuidanceEnabled(e) {
    const value = e.detail.value;
    if (value && !this.data.detailAddress) {
      wx.showToast({ title: '请先填写详细地址', icon: 'none' });
      this.setData({ guidanceEnabled: false });
      return;
    }
    this.setData({ guidanceEnabled: value });
  },

  // 打开指引内容编辑页
  async openGuidanceEdit(e) {
    const ds = e.currentTarget.dataset || {};
    const editShop = this.data.editShop;
    // 表单内入口：用当前正在编辑的店铺；列表卡片入口：用 data 传入的 name/address
    const name = ds.name || (editShop && editShop.name) || this.data.name;
    const address = ds.address || (editShop && editShop.detailAddress) || this.data.detailAddress;
    if (!name || !address) {
      wx.showToast({ title: '请先保存店铺地址', icon: 'none' });
      return;
    }
    // 表单内入口先持久化公开开关，避免内容保存后仍因服务端 enabled=false 而不展示。
    if (this.data.showAddModal) {
      if (!editShop) {
        wx.showToast({ title: '请先保存店铺，再编辑指引', icon: 'none' });
        return;
      }
      const shops = this.data.shops.map((shop) => {
        if (shop.name !== editShop.name || shop.detailAddress !== editShop.detailAddress) return shop;
        return {
          ...shop,
          guidance: { ...(shop.guidance || {}), enabled: true }
        };
      });
      wx.showLoading({ title: '正在开启指引…' });
      try {
        await api.technician.auth.updateServiceType({
          shopService: shops.some((shop) => shop.enabled),
          shopAddresses: shops
        });
        this.setData({ shops, guidanceEnabled: true });
      } catch (err) {
        wx.hideLoading();
        wx.showToast({ title: err.message || '开启指引失败', icon: 'none' });
        return;
      }
      wx.hideLoading();
    }
    wx.navigateTo({
      url: `/pages/technician/shop-guidance-edit/index?name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}`
    });
  },

  // 营业时间相关
  toggleBusinessHours() {
    this.setData({ showBusinessHours: !this.data.showBusinessHours });
  },

  toggleDayClosed(e) {
    const idx = e.currentTarget.dataset.idx;
    const businessHours = [...this.data.businessHours];
    businessHours[idx].closed = !businessHours[idx].closed;
    this.setData({ businessHours });
  },

  onStartTimeChange(e) {
    const idx = e.currentTarget.dataset.idx;
    const timeIdx = parseInt(e.detail.value);
    const businessHours = [...this.data.businessHours];
    businessHours[idx].start = TIME_OPTIONS[timeIdx];
    this.setData({ businessHours });
  },

  onEndTimeChange(e) {
    const idx = e.currentTarget.dataset.idx;
    const timeIdx = parseInt(e.detail.value);
    const businessHours = [...this.data.businessHours];
    businessHours[idx].end = TIME_OPTIONS[timeIdx];
    this.setData({ businessHours });
  },

  async save() {
    if (this.data.saving) return;
    const { name, region, detailAddress, latitude, longitude, phone, enabled, businessHours, guidanceEnabled, editShop, shops } = this.data;
    if (!name.trim()) { wx.showToast({ title: '请输入店铺名称', icon: 'none' }); return; }
    if (region.length === 0) { wx.showToast({ title: '请选择省市区', icon: 'none' }); return; }
    if (!detailAddress.trim()) { wx.showToast({ title: '请输入详细地址', icon: 'none' }); return; }
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      // 保留已有指引内容，仅更新 enabled
      const existingGuidance = (editShop && editShop.guidance) ? editShop.guidance : {};
      const guidance = { ...existingGuidance, enabled: guidanceEnabled };

      const shopData = {
        name: name.trim(),
        province: region[0] || '',
        city: region[1] || '',
        district: region[2] || '',
        detailAddress: detailAddress.trim(),
        latitude,
        longitude,
        phone: phone.trim(),
        enabled,
        businessHours,
        guidance
      };

      let newShops = [...shops];
      if (editShop) {
        newShops = newShops.map(s => {
          if (s.name === editShop.name && s.detailAddress === editShop.detailAddress) {
            return { ...s, ...shopData };
          }
          return s;
        });
      } else {
        newShops.push(shopData);
      }

      // 判断是否需要更新 shopService 状态
      const hasEnabledShop = newShops.some(s => s.enabled);

      await api.technician.auth.updateServiceType({
        shopService: hasEnabledShop,
        shopAddresses: newShops
      });

      const res = await api.technician.auth.getUserInfo();
      const userInfo = wx.getStorageSync('userInfo') || {};
      Object.assign(userInfo, res);
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('technician_userInfo', userInfo);

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.setData({ showAddModal: false });
      this.loadShops();

      if (!editShop && this._fromSetup) {
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  async toggleShopEnabled(e) {
    const { name, address } = e.currentTarget.dataset;
    const shops = [...this.data.shops];
    const shop = shops.find(s => s.name === name && s.detailAddress === address);
    if (!shop) return;

    shop.enabled = !shop.enabled;
    const hasEnabledShop = shops.some(s => s.enabled);

    try {
      wx.showLoading({ title: '保存中...' });
      await api.technician.auth.updateServiceType({
        shopService: hasEnabledShop,
        shopAddresses: shops
      });

      const res = await api.technician.auth.getUserInfo();
      const userInfo = wx.getStorageSync('userInfo') || {};
      Object.assign(userInfo, res);
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('technician_userInfo', userInfo);

      wx.hideLoading();
      wx.showToast({ title: shop.enabled ? '已启用' : '已关闭', icon: 'success' });
      this.loadShops();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
      this.loadShops();
    }
  },

  deleteShop(e) {
    const { name, address } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除店铺',
      content: `确定删除"${name}"吗？`,
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const newShops = this.data.shops.filter(s => !(s.name === name && s.detailAddress === address));
          const hasEnabledShop = newShops.some(s => s.enabled);

          await api.technician.auth.updateServiceType({
            shopService: hasEnabledShop,
            shopAddresses: newShops
          });

          const userRes = await api.technician.auth.getUserInfo();
          const userInfo = wx.getStorageSync('userInfo') || {};
          Object.assign(userInfo, userRes);
          wx.setStorageSync('userInfo', userInfo);
          wx.setStorageSync('technician_userInfo', userInfo);

          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadShops();
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      }
    });
  }
});
