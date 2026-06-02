const api = require('../../../services/api');

Page({
  data: {
    nickname: '',
    avatarUrl: '',
    uploading: false,
    saving: false
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({
      nickname: userInfo?.nickname || '',
      avatarUrl: userInfo?.avatarUrl || ''
    });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async (res) => {
        const filePath = res.tempFiles[0].tempFilePath;
        this.setData({ uploading: true });
        try {
          const uploadRes = await api.upload.image(filePath, 'client');
          this.setData({ avatarUrl: uploadRes.url, uploading: false });
        } catch (err) {
          this.setData({ uploading: false });
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
      }
    });
  },

  async saveProfile() {
    if (this.data.saving) return;
    const { nickname, avatarUrl } = this.data;
    if (!nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      await api.client.profile.update({ nickname, avatarUrl });
      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.nickname = nickname;
      userInfo.avatarUrl = avatarUrl;
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('client_userInfo', userInfo);

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1200);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          getApp().logout();
          wx.redirectTo({ url: '/pages/role-select/index' });
        }
      }
    });
  }
});
