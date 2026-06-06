const api = require('../../../services/api');
const { validatePhone } = require('../../../utils/util');

Page({
  data: {
    step: 'phone', // 'phone' | 'login'
    phone: '',
    password: '',
    loading: false
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  switchPhase(e) {
    this.setData({ step: e.currentTarget.dataset.step });
  },

  goForgotPassword() {
    wx.navigateTo({ url: '/pages/client/forgot-password/index' });
  },

  goRoleSelect() {
    wx.reLaunch({ url: '/pages/role-select/index' });
  },

  async handlePhoneNext() {
    const phone = this.data.phone.trim();
    if (!validatePhone(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '检查中...' });
    try {
      const res = await api.auth.checkPhone(phone, 'client');
      wx.hideLoading();
      if (res.exists) {
        this.setData({ step: 'login' });
      } else {
        // 跳转到注册页面
        wx.navigateTo({ url: `/pages/client/register/index?phone=${phone}` });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '请求失败', icon: 'none' });
    }
  },

  async handleLogin() {
    if (this.data.loading) return;
    const { phone, password } = this.data;
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '登录中...' });
    try {
      const res = await api.auth.login(phone, password, 'client');
      this._afterAuth(res);
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    }
  },

  _afterAuth(res) {
    const app = getApp();
    app.setLogin('client', res.accessToken, res.client);
    if (res.refreshToken) {
      wx.setStorageSync('client_refreshToken', res.refreshToken);
    }
    if (res.technician) {
      wx.setStorageSync('client_bindings', res.technicians || [res.technician]);
      wx.setStorageSync('defaultTechId', res.technician.id);
    }
    wx.hideLoading();
    wx.reLaunch({ url: '/pages/client/home/index' });
  }
});
