const api = require('../../../services/api');
const { validatePhone } = require('../../../utils/util');

function validatePassword(pwd) {
  if (!pwd || pwd.length < 8) return '密码至少 8 位';
  if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return '密码需同时包含字母和数字';
  return null;
}

Page({
  data: {
    phone: '',
    inviteCode: '',
    password: '',
    confirmPassword: '',
    loading: false,
    checkingCode: false,
    foundTech: null,
    inviteCodeError: '',
    passwordError: '',
    confirmPasswordError: ''
  },

  onLoad(options) {
    this.redirect = options.redirect ? decodeURIComponent(options.redirect) : '';
    if (options.phone) {
      this.setData({ phone: options.phone });
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [field]: value,
      [`${field}Error`]: ''
    });

    // 邀请码输入时自动查找美甲师
    if (field === 'inviteCode' && value.length >= 4) {
      this.findTechByCode(value);
    } else if (field === 'inviteCode') {
      this.setData({ foundTech: null });
    }
  },

  async findTechByCode(code) {
    this.setData({ checkingCode: true });
    try {
      const tech = await api.client.profile.findTechByInviteCode(code);
      this.setData({ foundTech: tech, inviteCodeError: '' });
    } catch {
      this.setData({ foundTech: null });
    } finally {
      this.setData({ checkingCode: false });
    }
  },

  validateForm() {
    const { inviteCode, password, confirmPassword, foundTech } = this.data;
    let valid = true;

    if (!inviteCode.trim()) {
      this.setData({ inviteCodeError: '请输入美甲师邀请码' });
      valid = false;
    } else if (!foundTech) {
      this.setData({ inviteCodeError: '邀请码无效，请检查后重试' });
      valid = false;
    }

    const pwdErr = validatePassword(password);
    if (pwdErr) {
      this.setData({ passwordError: pwdErr });
      valid = false;
    }

    if (password !== confirmPassword) {
      this.setData({ confirmPasswordError: '两次密码不一致' });
      valid = false;
    }

    return valid;
  },

  async handleRegister() {
    if (this.data.loading) return;
    if (!this.validateForm()) return;

    const { phone, password, inviteCode } = this.data;

    this.setData({ loading: true });
    wx.showLoading({ title: '注册中...' });

    try {
      const res = await api.auth.registerClient(phone, password, inviteCode.trim());
      this._afterAuth(res);
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '注册失败', icon: 'none' });
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
    wx.reLaunch({ url: this.redirect || '/pages/client/home/index' });
  },

  goBack() {
    wx.navigateBack();
  }
});
