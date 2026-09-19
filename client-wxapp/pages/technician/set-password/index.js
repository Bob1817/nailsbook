const api = require('../../../services/api');
const privacy = require('../../../utils/privacy');

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
    error: '',
    wechatChecking: true,
    wechatAvailable: false
  },

  onLoad(options) {
    this.setData({ phone: options.phone || '' });
    this._loadCapabilities();
  },

  async _loadCapabilities() {
    const app = getApp();
    const capabilities = await app.loadCapabilities();
    this.setData({
      wechatAvailable: !!capabilities.wechatLogin,
      wechatChecking: false
    });
  },

  onNewPwdInput(e) { this.setData({ newPassword: e.detail.value, error: '' }); },
  onConfirmPwdInput(e) { this.setData({ confirmPassword: e.detail.value, error: '' }); },

  _validatePasswords() {
    const pwdErr = validatePassword(this.data.newPassword);
    if (pwdErr) return pwdErr;
    if (this.data.newPassword !== this.data.confirmPassword) return '两次密码不一致';
    return '';
  },

  _afterSetup(res) {
    // 自动登录
    const app = getApp();
    app.setLogin('technician', res.accessToken, res.technician, undefined, false);
    if (res.refreshToken) wx.setStorageSync('technician_refreshToken', res.refreshToken);

    wx.showToast({ title: '密码设置成功', icon: 'success' });
    setTimeout(() => wx.reLaunch({ url: '/pages/technician/home/index' }), 1200);
  },

  // 首次设密（微信手机号授权）：项目未接入短信服务，以微信授权验证手机号归属
  async onWechatPhone(e) {
    if (this.data.loading) return;
    const error = this._validatePasswords();
    if (error) { this.setData({ error }); return; }

    const phoneCode = e.detail && e.detail.code;
    if (!phoneCode) {
      this.setData({ error: '已取消微信手机号授权，请重试' });
      return;
    }

    this.setData({ loading: true, error: '' });
    wx.showLoading({ title: '设置中...', mask: true });

    try {
      await privacy.requireWechatPrivacyAuthorization();
      const res = await api.technician.auth.wechatSetInitialPassword({
        phone: this.data.phone,
        phoneCode,
        newPassword: this.data.newPassword
      });
      wx.hideLoading();
      this._afterSetup(res);
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false, error: err.message || '密码设置失败，请重试' });
    }
  },

  // 已登录状态改密
  async handleSubmit() {
    const { confirmPassword, loading } = this.data;
    if (loading) return;

    const pwdErr = validatePassword(this.data.newPassword);
    if (pwdErr) { this.setData({ error: pwdErr }); return; }
    if (this.data.newPassword !== confirmPassword) { this.setData({ error: '两次密码不一致' }); return; }

    this.setData({ loading: true, error: '' });
    wx.showLoading({ title: '设置中...', mask: true });

    try {
      const res = await api.technician.auth.setPassword(this.data.newPassword);
      wx.hideLoading();
      this._afterSetup(res);
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false, error: err.message || '密码设置失败，请重试' });
    }
  }
});
