const api = require('../../../services/api');

Page({
  data: {
    name: '',
    phone: '',
    avatarUrl: '',
    bio: '',
    uploading: false,
    saving: false,

    // 城市：显示文本 + picker codes（供回显）
    cityDisplay: '',
    cityRegion: [],

    // 服务区域：显示文本 + picker codes（供回显）
    // 初始值来自注册/引导时填写的 userInfo.serviceArea
    serviceAreaDisplay: '',
    serviceAreaRegion: []
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo') || wx.getStorageSync('technician_userInfo') || {};
    this.setData({
      name: userInfo.name || '',
      phone: userInfo.phone || '',
      avatarUrl: userInfo.avatarUrl || '',
      bio: userInfo.bio || '',
      cityDisplay: userInfo.city || '',
      cityRegion: userInfo.cityRegion || [],
      serviceAreaDisplay: userInfo.serviceArea || '',
      serviceAreaRegion: userInfo.serviceAreaRegion || []
    });
  },

  onNameInput(e) { this.setData({ name: e.detail.value }); },
  onBioInput(e)  { this.setData({ bio: e.detail.value }); },

  // 城市：选省 + 市，拼接显示文本（直辖市去重省名）
  onCityChange(e) {
    const val = e.detail.value; // ['广东省','深圳市','南山区']
    const display = val[0] === val[1] ? val[1] : `${val[0]} ${val[1]}`;
    this.setData({ cityDisplay: display, cityRegion: val });
  },

  // 服务区域：选到区县级，拼接显示文本
  onServiceAreaChange(e) {
    const val = e.detail.value; // ['广东省','深圳市','南山区']
    // 直辖市只显示 市+区，否则显示 省+市+区
    const display = val[0] === val[1]
      ? `${val[1]} ${val[2]}`
      : `${val[0]} ${val[1]} ${val[2]}`;
    this.setData({ serviceAreaDisplay: display, serviceAreaRegion: val });
  },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'],
      success: async (res) => {
        this.setData({ uploading: true });
        try {
          const uploadRes = await api.upload.image(res.tempFiles[0].tempFilePath, 'technician');
          this.setData({ avatarUrl: uploadRes.url, uploading: false });
        } catch {
          this.setData({ uploading: false });
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
      }
    });
  },

  async saveProfile() {
    if (this.data.saving) return;
    const { name, avatarUrl, cityDisplay, cityRegion, serviceAreaDisplay, serviceAreaRegion, bio } = this.data;
    if (!name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      await api.technician.auth.updateProfile({
        name, avatarUrl,
        city: cityDisplay,
        serviceArea: serviceAreaDisplay,
        bio
      });

      const userInfo = wx.getStorageSync('userInfo') || {};
      Object.assign(userInfo, {
        name, avatarUrl,
        city: cityDisplay, cityRegion,
        serviceArea: serviceAreaDisplay, serviceAreaRegion,
        bio
      });
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('technician_userInfo', userInfo);

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1200);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
