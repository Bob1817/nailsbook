/**
 * NailBook 统一登录页
 * 流程：微信授权（默认）→ 手机号 + 密码登录
 */
const api = require('../../services/api');

Page({
  data: {
    step: 'wechat',        // 'wechat' | 'phone'
    phone: '',
    password: '',
    phoneValid: false,
    phoneLoading: false,
    wechatAvailable: false,
    wechatLoading: false,
    wechatChecking: true,
    showPassword: false,
    canLogin: false
  },

  onLoad(options) {
    this.redirect = options.redirect ? decodeURIComponent(options.redirect) : '';
    this.inviteCode = options.invite ? decodeURIComponent(options.invite) : '';
    this.registrationSource = options.source === 'card' ? 'card' : 'invite';
    if (options.referral) {
      this.referralToken = options.referral;
      wx.setStorageSync('pending_referral_token', options.referral);
    }
    this._prepareLogin();
  },

  onUnload() {
    // clean up if needed
  },

  // ========== 初始化 ==========

  async _prepareLogin() {
    const app = getApp();
    const capabilities = await app.loadCapabilities();

    if (capabilities.wechatLogin) {
      this.setData({ wechatAvailable: true, wechatChecking: false });
    } else {
      // 微信不可用 → 直接显示手机号登录
      this.setData({
        wechatAvailable: false,
        wechatChecking: false,
        step: 'phone'
      });
    }
  },

  // ========== WeChat 登录 ==========

  async onWechatPhone(e) {
    const phoneCode = e.detail && e.detail.code;
    if (!phoneCode) {
      wx.showToast({ title: '需要授权手机号才能继续', icon: 'none' });
      return;
    }

    this.setData({ wechatLoading: true });
    wx.showLoading({ title: '登录中...', mask: true });

    try {
      // 先获取微信 session
      const wxSession = await this._getWechatSession();
      if (!wxSession) throw new Error('微信授权失败');

      // 完成微信登录
      const res = await api.auth.completeWechatClient({
        wechatSessionToken: wxSession,
        phoneCode,
        inviteCode: this.inviteCode || undefined,
        source: this.registrationSource
      });

      // ★ 需要选择角色 → 跳转角色选择页
      if (res.needsRoleSelection) {
        wx.hideLoading();
        this.setData({ wechatLoading: false });
        // 保存临时 token，role-select 的 selectRole 需要 JWT 认证
        if (res.accessToken) {
          const app = getApp();
          app.globalData.token = res.accessToken;
          wx.setStorageSync('token', res.accessToken);
          wx.setStorageSync('role', 'client');
          if (res.refreshToken) wx.setStorageSync('client_refreshToken', res.refreshToken);
        }
        wx.redirectTo({
          url: '/pages/role-select/index?wechatSessionToken=' + encodeURIComponent(res.wechatSessionToken || '') +
               '&phone=' + encodeURIComponent(res.phone || '')
        });
        return;
      }

      // ★ 需要设置密码 → 跳转设置密码页
      if (res.needsSetupPassword) {
        wx.hideLoading();
        this.setData({ wechatLoading: false });
        wx.redirectTo({
          url: '/pages/setup-password/index?token=' + encodeURIComponent(res.passwordSetupToken) +
               '&phone=' + encodeURIComponent(res.phone || '')
        });
        return;
      }

      await this._afterAuth(res);
    } catch (err) {
      wx.hideLoading();
      this.setData({ wechatLoading: false });
      wx.showToast({ title: err.message || '微信登录失败', icon: 'none' });
    }
  },

  async _getWechatSession() {
    return new Promise((resolve) => {
      wx.login({
        success: async (loginRes) => {
          if (!loginRes.code) { resolve(null); return; }
          try {
            const sessionRes = await api.auth.wechatSession(loginRes.code);
            resolve(sessionRes.wechatSessionToken || null);
          } catch {
            resolve(null);
          }
        },
        fail: () => resolve(null)
      });
    });
  },

  // ========== 手机号 + 密码登录 ==========

  goPhoneLogin() {
    this.setData({ step: 'phone', phone: '', password: '', phoneValid: false, showPassword: false });
  },

  goBackToWechat() {
    this.setData({ step: 'wechat', password: '', showPassword: false });
  },

  onPhoneInput(e) {
    const phone = e.detail.value.replace(/\s/g, '');
    const phoneValid = /^1[3-9]\d{9}$/.test(phone);
    const canLogin = phoneValid && this.data.password && this.data.password.length >= 6;
    this.setData({ phone, phoneValid, canLogin });
  },

  onPasswordInput(e) {
    const password = e.detail.value;
    const canLogin = this.data.phoneValid && password && password.length >= 6;
    this.setData({ password, canLogin });
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  /** 忘记密码 — 跳转到找回密码页 */
  goForgotPassword() {
    wx.navigateTo({
      url: '/pages/forgot-password/index?phone=' + (this.data.phoneValid ? this.data.phone : '')
    });
  },

  /** 手机号 + 密码登录 */
  async doLogin() {
    const { phone, phoneValid, password, phoneLoading } = this.data;
    if (!phoneValid || !password || password.length < 6 || phoneLoading) return;

    this.setData({ phoneLoading: true });
    wx.showLoading({ title: '登录中...', mask: true });

    try {
      const res = await api.auth.login(phone, password, 'client');

      // ★ 新用户 → 引导页（理论上不会走这里，但做防御）
      if (res.needsOnboarding) {
        const app = getApp();
        app.setLogin('client', res.accessToken || res.token, res.client || res.userInfo);
        if (res.refreshToken) wx.setStorageSync('client_refreshToken', res.refreshToken);
        wx.hideLoading();
        this.setData({ phoneLoading: false });
        wx.redirectTo({ url: '/pages/onboarding/index' });
        return;
      }

      await this._afterAuth(res);
    } catch (err) {
      wx.hideLoading();
      this.setData({ phoneLoading: false });
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    }
  },

  // ========== 登录后处理 ==========

  async _afterAuth(res) {
    const app = getApp();
    const roles = res.roles || ['client'];
    app.setLogin('client', res.accessToken || res.token, res.client || res.userInfo, roles);

    if (res.refreshToken) {
      wx.setStorageSync('client_refreshToken', res.refreshToken);
    }

    // 处理美甲师绑定信息
    if (res.technician) {
      wx.setStorageSync('client_bindings', res.technicians || [res.technician]);
      wx.setStorageSync('defaultTechId', res.technician.id);
    }

    // 处理推荐关系
    const referralToken = this.referralToken || wx.getStorageSync('pending_referral_token');
    if (referralToken) {
      try {
        await api.client.referrals.claim(referralToken);
        wx.removeStorageSync('pending_referral_token');
      } catch {
        // 推荐关系非关键路径
      }
    }

    wx.hideLoading();
    this.setData({ phoneLoading: false });
    wx.reLaunch({ url: this.redirect || '/pages/client/home/index' });
  }
});
