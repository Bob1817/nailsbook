const api = require('../../../services/api');
const { validatePhone } = require('../../../utils/util');

function validatePassword(pwd) {
  if (!pwd || pwd.length < 8) return '密码至少 8 位';
  if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return '密码需同时包含字母和数字';
  return null;
}

Page({
  data: {
    step: 'phone', // 'phone' | 'login' | 'register'
    phone: '',
    name: '',
    password: '',
    confirmPassword: '',
    inviteKey: '',
    loading: false
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  switchPhase(e) {
    this.setData({ step: e.currentTarget.dataset.step });
  },

  async handlePhoneNext() {
    const phone = this.data.phone.trim();
    if (!validatePhone(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '检查中...' });
    try {
      const res = await api.auth.checkPhone(phone, 'technician');
      wx.hideLoading();
      this.setData({ step: res.exists ? 'login' : 'register' });
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
      const res = await api.auth.login(phone, password, 'technician');
      this._afterAuth(res);
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    }
  },

  async handleRegister() {
    if (this.data.loading) return;
    const { phone, name, password, confirmPassword, inviteKey } = this.data;

    if (!inviteKey.trim()) {
      wx.showToast({ title: '请输入邀请密钥', icon: 'none' });
      return;
    }
    if (!/^[A-Z0-9]{16}$/.test(inviteKey.trim())) {
      wx.showToast({ title: '密钥格式为 16 位大写字母+数字', icon: 'none' });
      return;
    }
    if (!name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      wx.showToast({ title: pwdErr, icon: 'none' });
      return;
    }
    if (password !== confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '注册中...' });
    try {
      const res = await api.auth.registerTechnician(
        inviteKey.trim().toUpperCase(), name.trim(), phone, password
      );
      this._afterAuth(res);
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '注册失败', icon: 'none' });
    }
  },

  _afterAuth(res) {
    const app = getApp();
    app.setLogin('technician', res.accessToken, res.technician);
    if (res.refreshToken) {
      wx.setStorageSync('technician_refreshToken', res.refreshToken);
    }
    wx.hideLoading();
    wx.reLaunch({ url: '/pages/technician/home/index' });
  }
});
