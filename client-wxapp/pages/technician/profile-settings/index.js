const api = require('../../../services/api');

Page({
  data: {
    name: '',
    phone: '',
    avatarUrl: '',
    city: '',
    serviceArea: '',
    bio: '',
    uploading: false,
    saving: false
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo') || wx.getStorageSync('technician_userInfo');
    this.setData({
      name: userInfo?.name || '',
      phone: userInfo?.phone || '',
      avatarUrl: userInfo?.avatarUrl || '',
      city: userInfo?.city || '',
      serviceArea: userInfo?.serviceArea || '',
      bio: userInfo?.bio || ''
    });
  },

  onNameInput(e) { this.setData({ name: e.detail.value }); },
  onCityInput(e) { this.setData({ city: e.detail.value }); },
  onServiceAreaInput(e) { this.setData({ serviceArea: e.detail.value }); },
  onBioInput(e) { this.setData({ bio: e.detail.value }); },

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
    const { name, avatarUrl, city, serviceArea, bio } = this.data;
    if (!name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      await api.technician.auth.updateProfile({ name, avatarUrl, city, serviceArea, bio });
      const userInfo = wx.getStorageSync('userInfo') || {};
      Object.assign(userInfo, { name, avatarUrl, city, serviceArea, bio });
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
