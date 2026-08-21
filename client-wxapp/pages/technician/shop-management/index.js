const api = require('../../../services/api');

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
    phone: '',
    enabled: false,
    businessHours: [],
    // 营业时间编辑
    showBusinessHours: false,
    editingDayIndex: -1,
    timeOptions: TIME_OPTIONS,
    weekdayNames: WEEKDAY_NAMES,
    saving: false
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
      phone: '',
      enabled: false,
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
      phone: shop.phone || '',
      enabled: shop.enabled !== false,
      businessHours: shop.businessHours || JSON.parse(JSON.stringify(DEFAULT_BUSINESS_HOURS))
    });
  },

  closeModal() {
    this.setData({ showAddModal: false, editShop: null });
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
    const { name, region, detailAddress, phone, enabled, businessHours, editShop, shops } = this.data;
    if (!name.trim()) { wx.showToast({ title: '请输入店铺名称', icon: 'none' }); return; }
    if (region.length === 0) { wx.showToast({ title: '请选择省市区', icon: 'none' }); return; }
    if (!detailAddress.trim()) { wx.showToast({ title: '请输入详细地址', icon: 'none' }); return; }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const shopData = {
        name: name.trim(),
        province: region[0] || '',
        city: region[1] || '',
        district: region[2] || '',
        detailAddress: detailAddress.trim(),
        phone: phone.trim(),
        enabled,
        businessHours
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
