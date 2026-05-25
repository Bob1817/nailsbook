const api = require('../../../services/api');
const { validatePhone } = require('../../../utils/util');

Page({
  data: {
    phone: '',
    password: '',
    loading: false
  },

  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
  onPasswordInput(e) { this.setData({ password: e.detail.value }); },

  async handleSubmit() {
    const { phone, password, loading } = this.data;
    if (loading) return;

    if (!validatePhone(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '登录中...' });

    try {
      const res = await api.auth.login(phone, password, 'technician');

      const app = getApp();
      app.setLogin('technician', res.accessToken, res.technician);

      if (res.refreshToken) {
        wx.setStorageSync('technician_refreshToken', res.refreshToken);
      }

      wx.hideLoading();
      wx.reLaunch({ url: '/pages/technician/home/index' });
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '登录失败，请检查手机号和密码', icon: 'none' });
    }
  }
});
