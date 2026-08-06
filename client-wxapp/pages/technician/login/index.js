const api = require('../../../services/api');
const { validatePhone } = require('../../../utils/util');
const { silentWechatLogin } = require('../../../utils/wechat-auth');

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
    phoneError: '',
    loginMethod: 'phone',
    wechatReady: false,
    wechatLinked: false,
    wechatChecking: true,
    wechatFeatureVisible: false
  },

  onLoad() {
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
        wechatLinked: Array.isArray(res.roles) && res.roles.includes('technician'),
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
      const res = await silentWechatLogin('technician');
      if (!res.authenticated) throw new Error('该微信尚未绑定美甲师账号');
      this._afterAuth(res);
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
    const { step, inviteKey, name, password } = this.data;
    if (step === 'register') {
      if (!/^[A-Z0-9]{16}$/.test(inviteKey.trim().toUpperCase())) {
        wx.showToast({ title: '请输入有效的16位邀请密钥', icon: 'none' }); return;
      }
      if (!name.trim()) {
        wx.showToast({ title: '请输入姓名', icon: 'none' }); return;
      }
      const passwordError = validatePassword(password);
      if (passwordError) {
        wx.showToast({ title: passwordError, icon: 'none' }); return;
      }
      if (password !== this.data.confirmPassword) {
        wx.showToast({ title: '两次密码不一致', icon: 'none' }); return;
      }
    }
    this.setData({ loading: true });
    wx.showLoading({ title: '微信登录中...' });
    try {
      const res = await api.auth.completeWechatTechnician({
        wechatSessionToken,
        phoneCode,
        inviteKey: step === 'register' ? inviteKey.trim().toUpperCase() : undefined,
        name: step === 'register' ? name.trim() : undefined,
        password: step === 'register' ? password : undefined
      });
      this._afterAuth(res);
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false, phoneError: err.message || '微信登录失败' });
    }
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
    wx.reLaunch({ url: '/pages/login/index' });
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
    wx.removeStorageSync('wechat_session_token');
    wx.hideLoading();
    wx.reLaunch({ url: '/pages/technician/home/index' });
  }
});
