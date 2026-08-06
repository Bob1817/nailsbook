const api = require('../../../services/api');
const { validatePhone } = require('../../../utils/util');
const { silentWechatLogin } = require('../../../utils/wechat-auth');

Page({
  data: {
    step: 'phone', // 'phone' | 'login'
    phone: '',
    password: '',
    loading: false,
    loginMethod: 'phone',
    wechatReady: false,
    wechatLinked: false,
    wechatChecking: true,
    wechatFeatureVisible: false
  },

  onLoad(options) {
    this.redirect = options.redirect ? decodeURIComponent(options.redirect) : '';
    this.inviteCode = options.invite ? decodeURIComponent(options.invite) : '';
    this.registrationSource = options.source === 'card' ? 'card' : 'invite';
    if (options.referral) {
      this.referralToken = options.referral;
      wx.setStorageSync('pending_referral_token', options.referral);
    }
    this.prepareLoginMethods();
  },

  async prepareLoginMethods() {
    const capabilities = await getApp().loadCapabilities();
    if (!capabilities.wechatLogin) {
      this.setData({
        loginMethod: 'phone',
        wechatFeatureVisible: false,
        wechatChecking: false
      });
      return;
    }
    this.setData({ wechatFeatureVisible: true, loginMethod: 'wechat' });
    this.tryWechatLogin();
  },

  async tryWechatLogin() {
    try {
      const res = await silentWechatLogin();
      this.wechatAuthResult = res;
      this.setData({
        wechatLinked: Array.isArray(res.roles) && res.roles.includes('client'),
        wechatReady: !!res.wechatSessionToken,
        wechatChecking: false
      });
    } catch (err) {
      // 微信未配置、无绑定或网络异常时保留手机号密码登录入口。
      console.info('Silent WeChat login unavailable:', err.message || err);
      this.setData({ wechatChecking: false });
    }
  },

  selectLoginMethod(e) {
    this.setData({ loginMethod: e.currentTarget.dataset.method });
  },

  async handleWechatLogin() {
    if (this.data.loading || this.data.wechatChecking) return;
    this.setData({ loading: true });
    wx.showLoading({ title: '微信登录中...' });
    try {
      const res = await silentWechatLogin('client');
      if (!res.authenticated) throw new Error('该微信尚未绑定客户账号');
      await this._afterAuth(res);
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '微信登录失败', icon: 'none' });
    }
  },

  async handleWechatPhone(e) {
    const phoneCode = e.detail && e.detail.code;
    if (!phoneCode || this.data.loading) {
      if (!phoneCode) wx.showToast({ title: '需要授权手机号才能继续', icon: 'none' });
      return;
    }
    const wechatSessionToken = wx.getStorageSync('wechat_session_token');
    if (!wechatSessionToken) {
      await this.tryWechatLogin();
      wx.showToast({ title: '请再次点击微信手机号登录', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    wx.showLoading({ title: '微信登录中...' });
    try {
      const res = await api.auth.completeWechatClient({
        wechatSessionToken,
        phoneCode,
        inviteCode: this.inviteCode || undefined,
        source: this.registrationSource
      });
      await this._afterAuth(res);
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '微信登录失败', icon: 'none' });
    }
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
    wx.reLaunch({ url: '/pages/login/index' });
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
        const redirect = this.redirect ? `&redirect=${encodeURIComponent(this.redirect)}` : '';
        const referral = this.referralToken
          ? `&referral=${encodeURIComponent(this.referralToken)}`
          : '';
        const invite = this.inviteCode
          ? `&invite=${encodeURIComponent(this.inviteCode)}`
          : '';
        const source = `&source=${this.registrationSource}`;
        wx.navigateTo({ url: `/pages/client/register/index?phone=${phone}${redirect}${referral}${invite}${source}` });
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
      await this._afterAuth(res);
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    }
  },

  async _afterAuth(res) {
    const app = getApp();
    app.setLogin('client', res.accessToken, res.client);
    if (res.refreshToken) {
      wx.setStorageSync('client_refreshToken', res.refreshToken);
    }
    wx.removeStorageSync('wechat_session_token');
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
    wx.reLaunch({ url: this.redirect || '/pages/client/home/index' });
  }
});
