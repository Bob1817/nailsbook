const api = require('../../../services/api');

function validatePassword(pwd) {
  if (!pwd || pwd.length < 8) return '密码至少 8 位';
  if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return '密码需同时包含字母和数字';
  return null;
}

Page({
  data: {
    phone: '',
    newPassword: '',
    confirmPassword: '',
    loading: false,
    error: ''
  },

  onLoad(options) {
    this.setData({ phone: options.phone || '' });
  },

  onNewPwdInput(e) { this.setData({ newPassword: e.detail.value, error: '' }); },
  onConfirmPwdInput(e) { this.setData({ confirmPassword: e.detail.value, error: '' }); },

  async handleSubmit() {
    const { phone, newPassword, confirmPassword, loading } = this.data;
    if (loading) return;

    const pwdErr = validatePassword(newPassword);
    if (pwdErr) { this.setData({ error: pwdErr }); return; }
    if (newPassword !== confirmPassword) { this.setData({ error: '两次密码不一致' }); return; }

    this.setData({ loading: true, error: '' });
    wx.showLoading({ title: '设置中...' });

    try {
      let res;
      if (phone) {
        // 首次设置密码（凭手机号，无需 token）
        res = await api.technician.auth.setInitialPassword(phone, newPassword);
      } else {
        // 已登录状态改密
        res = await api.technician.auth.setPassword(newPassword);
      }
      wx.hideLoading();

      // 自动登录
      const app = getApp();
      app.setLogin('technician', res.accessToken, res.technician);
      if (res.refreshToken) wx.setStorageSync('technician_refreshToken', res.refreshToken);

      wx.showToast({ title: '密码设置成功', icon: 'success' });
      setTimeout(() => wx.reLaunch({ url: '/pages/technician/home/index' }), 1200);
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false, error: err.message || '密码设置失败，请重试' });
    }
  }
});
