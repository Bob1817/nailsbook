const api = require('../../../services/api');

Page({
  data: {
    nickname: '',
    avatarUrl: '',
    uploading: false,
    saving: false
  },

  onLoad() {
    this._pageActive = true;
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({
      nickname: userInfo?.nickname || '',
      avatarUrl: userInfo?.avatarUrl || ''
    });
  },

  onShow() {
    this._pageActive = true;
    if (this._uploadFinishedWhileHidden || this._saveFinishedWhileHidden) {
      this.setData({ uploading: false, saving: false });
      this._uploadFinishedWhileHidden = false;
      this._saveFinishedWhileHidden = false;
    }
  },
  onHide() { this._pageActive = false; },
  onUnload() {
    this._pageActive = false;
    if (this._navTimer) clearTimeout(this._navTimer);
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
          if (!this._pageActive) { this._uploadFinishedWhileHidden = true; return; }
          this.setData({ avatarUrl: uploadRes.url, uploading: false });
        } catch (err) {
          if (!this._pageActive) { this._uploadFinishedWhileHidden = true; return; }
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
      wx.hideLoading();
      if (!this._pageActive) return;
      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.nickname = nickname;
      userInfo.avatarUrl = avatarUrl;
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('client_userInfo', userInfo);

      wx.showToast({ title: '保存成功', icon: 'success' });
      this._navTimer = setTimeout(() => {
        if (this._pageActive) wx.navigateBack();
      }, 1200);
    } catch (err) {
      wx.hideLoading();
      if (!this._pageActive) return;
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      if (this._pageActive) this.setData({ saving: false });
      else this._saveFinishedWhileHidden = true;
    }
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          getApp().logout();
          wx.redirectTo({ url: '/pages/login/index' });
        }
      }
    });
  }
});
