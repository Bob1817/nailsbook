const api = require('../../../services/api');

Page({
  data: {
    nickname: '',
    phone: '',
    saving: false
  },

  onLoad() {
    this._pageActive = true;
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({
      nickname: userInfo?.nickname || '',
      phone: userInfo?.phone ? String(userInfo.phone).replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2') : '未绑定'
    });
  },

  onShow() {
    this._pageActive = true;
    if (this._saveFinishedWhileHidden) {
      this.setData({ saving: false });
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

  async saveProfile() {
    if (this.data.saving) return;
    const nickname = this.data.nickname.trim();
    if (!nickname.trim()) {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      await api.client.profile.update({ nickname });
      wx.hideLoading();
      if (!this._pageActive) return;
      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.nickname = nickname;
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
  }
});
