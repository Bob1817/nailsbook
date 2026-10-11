const api = require('../../../services/api');
const { isPhoneLikeNickname } = require('../../../utils/client-profile-completion');
const { normalizeInternalPath } = require('../../../utils/artist-navigation');

Page({
  data: {
    avatarUrl: '',
    avatarTempPath: '',
    nickname: '',
    saving: false,
    canSave: false
  },

  onLoad(options) {
    const app = getApp();
    const user = app.globalData.userInfo || wx.getStorageSync('client_userInfo') || {};
    const requestedNext = options.next ? decodeURIComponent(options.next) : '';
    this.nextPage = normalizeInternalPath(requestedNext) || '/pages/client/home/index';
    this.setData({
      avatarUrl: user.avatarUrl || '',
      nickname: isPhoneLikeNickname(user.nickname, user.phone) ? '' : user.nickname,
      canSave: !!user.avatarUrl && !isPhoneLikeNickname(user.nickname, user.phone)
    });
  },

  onChooseAvatar(e) {
    const avatarTempPath = e.detail && e.detail.avatarUrl;
    if (!avatarTempPath) return;
    this.setData({
      avatarTempPath,
      avatarUrl: avatarTempPath,
      canSave: !!String(this.data.nickname || '').trim()
    });
  },

  onNicknameInput(e) {
    const nickname = String(e.detail.value || '').slice(0, 20);
    this.setData({ nickname, canSave: !!nickname.trim() && !!this.data.avatarUrl });
  },

  async saveProfile() {
    const nickname = String(this.data.nickname || '').trim();
    if (!nickname || !this.data.avatarUrl || this.data.saving) return;
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...', mask: true });
    try {
      let avatarUrl = this.data.avatarUrl;
      if (this.data.avatarTempPath) {
        const uploaded = await api.upload.image(this.data.avatarTempPath, 'client');
        if (!uploaded || !uploaded.url) throw new Error('头像上传未成功，请重试');
        avatarUrl = uploaded.url;
      }
      const updated = await api.client.profile.update({ nickname, avatarUrl });
      const app = getApp();
      const token = app.globalData.token || wx.getStorageSync('client_token');
      const roles = app.globalData.roles || wx.getStorageSync('roles') || ['client'];
      app.setLogin('client', token, updated, roles);
      wx.hideLoading();
      wx.reLaunch({ url: this.nextPage });
    } catch (error) {
      wx.hideLoading();
      this.setData({ saving: false });
      wx.showToast({ title: error.message || '资料保存失败，请重试', icon: 'none' });
    }
  },

  skipProfile() {
    if (this.data.saving) return;
    wx.reLaunch({ url: this.nextPage });
  }
});
