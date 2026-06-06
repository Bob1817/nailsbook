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
    loading: false,
    phoneError: ''
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
    if (field === 'phone' && this.data.phoneError) this.setData({ phoneError: '' });
  },

  switchPhase(e) {
    this.setData({ step: e.currentTarget.dataset.step, phoneError: '' });
  },

  goForgotPassword() {
    wx.navigateTo({ url: '/pages/technician/forgot-password/index' });
  },

  goRoleSelect() {
    wx.reLaunch({ url: '/pages/role-select/index' });
  },

  async handlePhoneNext() {
    const phone = this.data.phone.trim();
    // (1) 手机号校验
    if (!/^1\d{10}$/.test(phone)) {
      this.setData({ phoneError: '请输入有效手机号码' });
      return;
    }

    this.setData({ loading: true, phoneError: '' });
    wx.showLoading({ title: '检查中...' });
    try {
      const res = await api.auth.checkPhone(phone, 'technician');
      wx.hideLoading();
      if (!res.exists) {
        // (2) 未注册 → 注册页
        this.setData({ step: 'register', loading: false });
      } else if (!res.activated) {
        // (3) 已注册但未设置密码 → 设置密码页（设置后自动登录）
        this.setData({ loading: false });
        wx.navigateTo({ url: `/pages/technician/set-password/index?phone=${phone}` });
      } else {
        // (4) 已设置密码 → 登录页
        this.setData({ step: 'login', loading: false });
      }
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false, phoneError: err.message || '检查失败，请重试' });
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
      // 登录成功但要求改密 → 跳转设置密码页
      if (res.mustChangePassword) {
        wx.hideLoading();
        this.setData({ loading: false });
        wx.navigateTo({ url: `/pages/technician/set-password/index?phone=${phone}` });
        return;
      }
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
      wx.showToast({ title: '请输入邀请密钥', icon: 'none' }); return;
    }
    if (!/^[A-Z0-9]{16}$/.test(inviteKey.trim())) {
      wx.showToast({ title: '密钥格式为 16 位大写字母+数字', icon: 'none' }); return;
    }
    if (!name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' }); return;
    }
    const pwdErr = validatePassword(password);
    if (pwdErr) { wx.showToast({ title: pwdErr, icon: 'none' }); return; }
    if (password !== confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' }); return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '注册中...' });
    try {
      const res = await api.auth.registerTechnician(inviteKey.trim().toUpperCase(), name.trim(), phone, password);
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
    if (res.refreshToken) wx.setStorageSync('technician_refreshToken', res.refreshToken);
    wx.hideLoading();
    wx.reLaunch({ url: '/pages/technician/home/index' });
  }
});
