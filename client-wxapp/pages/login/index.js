const { consumePostAuthRedirect, rememberPostAuthRedirect, normalizeInternalPath } = require('../../utils/artist-navigation');
/**
 * NailBook 统一登录页
 * 流程：微信授权（默认）→ 手机号 + 密码登录
 */
const api = require('../../services/api');
const privacy = require('../../utils/privacy');

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
    canLogin: false,
    privacyAgreed: false,
    invitationRegistration: false
  },

  onLoad(options) {
    if (options.sessionExpired === '1') {
      wx.showModal({ title: '登录已过期', content: '长时间未登录已退出账号，请重新登录', showCancel: false, confirmText: '知道了' });
    }
    this.redirect = normalizeInternalPath(options.redirect ? decodeURIComponent(options.redirect) : '');
    if (this.redirect) rememberPostAuthRedirect(this.redirect);
    this.inviteCode = options.invite ? decodeURIComponent(options.invite) : '';
    this.setData({ invitationRegistration: !!this.inviteCode });
    this.registrationSource = options.source === 'card' ? 'card' : 'invite';
    this.quickBookingTechId = options.quickBookingTechId ? Number(options.quickBookingTechId) : undefined;
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
    if (!privacy.requireAgreement(this)) return;
    const phoneCode = e.detail && e.detail.code;
    if (!phoneCode) {
      wx.showToast({ title: '需要授权手机号才能继续', icon: 'none' });
      return;
    }

    this.setData({ wechatLoading: true });
    wx.showLoading({ title: '登录中...', mask: true });

    try {
      await privacy.requireWechatPrivacyAuthorization();
      // 先获取微信 session
      const wxSession = await this._getWechatSession();
      if (!wxSession) throw new Error('微信授权失败');

      // 完成微信登录
      const res = await api.auth.completeWechatClient({
        wechatSessionToken: wxSession,
        phoneCode,
        inviteCode: this.inviteCode || undefined,
        source: this.registrationSource,
        quickBookingTechId: this.quickBookingTechId
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

  browseAsGuest() {
    wx.reLaunch({ url: '/pages/client/discover/index' });
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

  /** 注册账号 — 跳转到注册页 */
  goRegister() {
    wx.navigateTo({
      url: '/pages/register/index?phone=' + (this.data.phoneValid ? this.data.phone : '')
    });
  },

  /** 手机号 + 密码登录：先识别账号角色，避免用 401 作为正常的角色探测机制。 */
  async doLogin() {
    if (!privacy.requireAgreement(this)) return;
    const { phone, phoneValid, password, phoneLoading } = this.data;
    if (!phoneValid || !password || password.length < 6 || phoneLoading) return;

    this.setData({ phoneLoading: true });
    wx.showLoading({ title: '登录中...', mask: true });

    try {
      const accountChecks = await Promise.all([
        api.auth.checkPhone(phone, 'client'),
        api.auth.checkPhone(phone, 'technician')
      ]);
      const hasClientAccount = !!accountChecks[0].exists;
      const hasTechnicianAccount = !!accountChecks[1].exists;
      const loginRole = !hasClientAccount && hasTechnicianAccount ? 'technician' : 'client';
      const res = await api.auth.login(phone, password, loginRole);

      // 2. 使用实际完成登录的角色。roles 仅表示账号能力，不能改变本次 JWT 的类型。
      const roles = res.roles || [loginRole];
      await this._afterAuth({ ...res, roles }, loginRole);
    } catch (err) {
      wx.hideLoading();
      this.setData({ phoneLoading: false });

      // 微信注册用户未设置密码 → 引导选择登录方式
      if (err.message && err.message.includes('未设置密码')) {
        wx.showModal({
          title: '账号未设置密码',
          content: '该手机号通过微信注册，尚未设置登录密码。您可以使用微信登录，或通过短信验证设置密码。',
          confirmText: '微信登录',
          cancelText: '短信设置密码',
          success: (modalRes) => {
            if (modalRes.confirm) {
              this.goBackToWechat();
            } else if (modalRes.cancel) {
              this.goForgotPassword();
            }
          }
        });
        return;
      }

      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    }
  },

  onPrivacyAgreementChange(e) {
    this.setData({ privacyAgreed: (e.detail.value || []).includes('agree') });
  },

  openUserAgreement() {
    wx.navigateTo({ url: '/pages/client/agreement/index?type=user' });
  },

  openPrivacyPolicy() {
    privacy.openPrivacyContract();
  },

  // ========== 登录后处理 ==========

  async _afterAuth(res, role) {
    const app = getApp();
    const roles = res.roles || [role || 'client'];
    // 微信统一入口完成的是客户端登录；拥有技师角色不等于拿到了技师 JWT。
    const activeRole = role || 'client';

    // 根据角色选择对应的 token 和 userInfo
    const token = res.accessToken || res.token;
    const userInfo = activeRole === 'technician' ? (res.technician || res.userInfo) : (res.client || res.userInfo);

    app.setLogin(activeRole, token, userInfo, roles);

    // 存储对应角色的 refreshToken
    if (res.refreshToken) {
      wx.setStorageSync(activeRole + '_refreshToken', res.refreshToken);
    }

    if (activeRole === 'client' && this.quickBookingTechId) {
      await api.client.profile.bindQuickBooking(this.quickBookingTechId, this.inviteCode);
    }

    // 处理美甲师绑定信息（客户端角色时）
    if (activeRole === 'client' && res.technician) {
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

    // 根据角色跳转到对应首页
    const homePage = activeRole === 'technician'
      ? '/pages/technician/home/index'
      : '/pages/client/home/index';
    wx.reLaunch({ url: activeRole === 'client' ? consumePostAuthRedirect(this.redirect || homePage) : homePage });
  }
});
