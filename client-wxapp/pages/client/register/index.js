const api = require('../../../services/api');
const { validatePhone } = require('../../../utils/util');
const { consumePostAuthRedirect } = require('../../../utils/artist-navigation');

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

  async onLoad(options) {
    this.redirect = options.redirect ? decodeURIComponent(options.redirect) : '';
    this.registrationSource = options.source === 'card' ? 'card' : 'invite';
    if (options.phone) {
      this.setData({ phone: options.phone });
    }
    if (options.invite) {
      const inviteCode = decodeURIComponent(options.invite);
      try {
        const card = await api.public.artists.card(inviteCode);
        this.setData({ inviteCode, foundTech: card.artist || null });
      } catch (err) {
        this.setData({ inviteCode, inviteCodeError: '邀请码已失效，请联系美甲师' });
      }
    }
    if (options.referral) {
      this.referralToken = options.referral;
      wx.setStorageSync('pending_referral_token', options.referral);
      try {
        const referral = await api.public.referrals.resolve(options.referral);
        const inviteCode = referral.technician && referral.technician.invitationCode;
        if (inviteCode) {
          this.setData({
            inviteCode,
            foundTech: referral.technician
          });
        }
      } catch (err) {
        wx.showToast({ title: err.message || '推荐链接已失效', icon: 'none' });
      }
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
      const res = await api.auth.registerClient(phone, password, inviteCode.trim(), this.registrationSource);
      await this._afterAuth(res);
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '注册失败', icon: 'none' });
    }
  },

  async _afterAuth(res) {
    const app = getApp();
    app.setLogin('client', res.accessToken, res.client);
    if (res.refreshToken) {
      wx.setStorageSync('client_refreshToken', res.refreshToken);
    }
    if (res.technician) {
      wx.setStorageSync('client_bindings', res.technicians || [res.technician]);
      wx.setStorageSync('defaultTechId', res.technician.id);
    }
    const referralToken = this.referralToken || wx.getStorageSync('pending_referral_token');
    if (referralToken) {
      try {
        await api.client.referrals.claim(referralToken);
        wx.removeStorageSync('pending_referral_token');
      } catch (err) {
        wx.showToast({ title: err.message || '推荐关系暂未记录', icon: 'none' });
      }
    }
    wx.hideLoading();
    wx.reLaunch({ url: consumePostAuthRedirect(this.redirect) });
  },

  goBack() {
    wx.navigateBack();
  },

  browseAsGuest() {
    wx.reLaunch({ url: '/pages/client/discover/index' });
  }
});
