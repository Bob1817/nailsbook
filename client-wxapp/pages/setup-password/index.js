const { consumePostAuthRedirect } = require('../../utils/artist-navigation');
/**
 * NailBook 设置登录密码页
 * 微信授权注册后，用户必须设置登录密码才能继续
 */
const api = require('../../services/api');

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
    showPassword: false,
    error: '',
    canSubmit: false
  },

  onLoad(options) {
    this.passwordSetupToken = options.token || '';
    this.setData({ phone: decodeURIComponent(options.phone || '') });

    if (!this.passwordSetupToken) {
      wx.showToast({ title: '登录凭证已过期，请重试', icon: 'none' });
      setTimeout(() => wx.reLaunch({ url: '/pages/login/index' }), 1500);
    }
  },

  onNewPwdInput(e) {
    const newPassword = e.detail.value;
    const confirmPassword = this.data.confirmPassword;
    const err = validatePassword(newPassword);
    const canSubmit = !err && newPassword === confirmPassword && newPassword.length >= 8;
    this.setData({ newPassword, canSubmit, error: '' });
  },

  onConfirmPwdInput(e) {
    const confirmPassword = e.detail.value;
    const newPassword = this.data.newPassword;
    const err = validatePassword(newPassword);
    const canSubmit = !err && newPassword === confirmPassword && newPassword.length >= 8;
    this.setData({ confirmPassword, canSubmit, error: '' });
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  async handleSubmit() {
    const { newPassword, confirmPassword, loading } = this.data;
    if (loading) return;

    const pwdErr = validatePassword(newPassword);
    if (pwdErr) { this.setData({ error: pwdErr }); return; }
    if (newPassword !== confirmPassword) { this.setData({ error: '两次密码不一致' }); return; }

    this.setData({ loading: true, error: '' });
    wx.showLoading({ title: '设置中...', mask: true });

    try {
      const res = await api.auth.setupPassword(this.passwordSetupToken, newPassword);
      wx.hideLoading();

      // 自动登录
      const app = getApp();
      const roles = res.roles || ['client'];
      app.setLogin('client', res.accessToken || res.token, res.client || res.userInfo, roles);
      if (res.refreshToken) wx.setStorageSync('client_refreshToken', res.refreshToken);

      // 处理美甲师绑定信息
      if (res.technician) {
        wx.setStorageSync('client_bindings', res.technicians || [res.technician]);
        wx.setStorageSync('defaultTechId', res.technician.id);
      }

      wx.showToast({ title: '密码设置成功', icon: 'success' });
      setTimeout(() => {
        if (res.needsOnboarding) {
          wx.reLaunch({ url: '/pages/onboarding/index' });
        } else {
          wx.reLaunch({ url: consumePostAuthRedirect('/pages/client/home/index') });
        }
      }, 1200);
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false, error: err.message || '密码设置失败，请重试' });
    }
  }
});
