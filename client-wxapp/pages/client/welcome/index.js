const api = require('../../../services/api');

Page({
  data: {
    nickname: '',
    loading: false,
    error: ''
  },

  onLoad() {},

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value.slice(0, 20), error: '' });
  },

  async handleSubmit() {
    const { nickname } = this.data;
    
    if (!nickname.trim()) {
      this.setData({ error: '请输入您的称呼' });
      return;
    }

    if (nickname.trim().length < 2) {
      this.setData({ error: '称呼至少需要2个字符' });
      return;
    }

    this.setData({ loading: true });
    try {
      await api.client.profile.update({ nickname: nickname.trim() });
      
      // 更新本地存储
      const userInfo = wx.getStorageSync('userInfo') || wx.getStorageSync('client_userInfo') || {};
      userInfo.nickname = nickname.trim();
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('client_userInfo', userInfo);
      
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/client/home/index' });
      }, 1500);
    } catch (err) {
      console.error('Save failed:', err);
      this.setData({ error: '保存失败，请重试' });
    } finally {
      this.setData({ loading: false });
    }
  },

  handleSkip() {
    const userInfo = wx.getStorageSync('userInfo') || wx.getStorageSync('client_userInfo') || {};
    const defaultNickname = userInfo.phone ? `用户${userInfo.phone.slice(-4)}` : '用户';
    
    this.setData({ loading: true });
    api.client.profile.update({ nickname: defaultNickname })
      .then(() => {
        userInfo.nickname = defaultNickname;
        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('client_userInfo', userInfo);
        
        wx.switchTab({ url: '/pages/client/home/index' });
      })
      .catch(() => {
        wx.switchTab({ url: '/pages/client/home/index' });
      });
  }
});
