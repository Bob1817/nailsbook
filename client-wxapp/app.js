App({
  globalData: {
    userInfo: null,
    token: null,
    role: null,
    isTourist: false,
    apiBaseUrl: 'https://api.lunails.cn',
    capabilities: { wechatLogin: false, wechatPay: false }
  },

  onLaunch() {
    console.log('App launched');
    this.loadCapabilities();

    // 恢复游客状态
    this.globalData.isTourist = !!wx.getStorageSync('isTourist');

    // 检查登录态 → 自动跳转
    const token = wx.getStorageSync('token');
    const role = wx.getStorageSync('role') || 'client';

    if (token) {
      // 已登录 → 根据角色跳转对应首页
      const homePages = {
        client: '/pages/client/home/index',
        technician: '/pages/technician/home/index'
      };
      const homePage = homePages[role] || homePages.client;

      // 延时跳转，避免与冷启动冲突
      setTimeout(() => {
        wx.reLaunch({ url: homePage });
      }, 300);
    }
    // 无 token → 不跳转，由 app.json 首页（统一登录页）接管
  },

  loadCapabilities(force = false) {
    if (this._capabilitiesPromise && !force) return this._capabilitiesPromise;
    this._capabilitiesPromise = new Promise((resolve) => {
      wx.request({
        url: `${this.globalData.apiBaseUrl}/api/public/capabilities`,
        method: 'GET',
        timeout: 8000,
        success: (res) => {
          const data = res.statusCode >= 200 && res.statusCode < 300 ? res.data : {};
          const capabilities = {
            wechatLogin: !!(data.wechatLogin && data.wechatLogin.available),
            wechatPay: !!(data.wechatPay && data.wechatPay.available)
          };
          this.globalData.capabilities = capabilities;
          resolve(capabilities);
        },
        fail: () => {
          const capabilities = { wechatLogin: false, wechatPay: false };
          this.globalData.capabilities = capabilities;
          resolve(capabilities);
        }
      });
    }).finally(() => { this._capabilitiesPromise = null; });
    return this._capabilitiesPromise;
  },

  setLogin(role, token, userInfo, roles, isTourist) {
    this.globalData.role = role;
    this.globalData.token = token;
    this.globalData.userInfo = userInfo;
    this.globalData.isTourist = !!isTourist;

    wx.setStorageSync('role', role);
    wx.setStorageSync('token', token);
    wx.setStorageSync(`${role}_token`, token);
    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync(`${role}_userInfo`, userInfo);
    wx.setStorageSync('isTourist', !!isTourist);

    // 保存用户所有可用角色
    if (roles && roles.length > 0) {
      this.globalData.roles = roles;
      wx.setStorageSync('roles', roles);
    } else {
      this.globalData.roles = [role];
      wx.setStorageSync('roles', [role]);
    }
  },

  logout() {
    const role = this.globalData.role || wx.getStorageSync('role');
    this.globalData.role = null;
    this.globalData.token = null;
    this.globalData.userInfo = null;
    this.globalData.isTourist = false;

    wx.removeStorageSync('role');
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('isTourist');
    wx.removeStorageSync('defaultTechId');
    if (role) {
      wx.removeStorageSync(`${role}_token`);
      wx.removeStorageSync(`${role}_refreshToken`);
      wx.removeStorageSync(`${role}_userInfo`);
    }
  },

  switchRole(role) {
    const token = wx.getStorageSync(`${role}_token`);
    const userInfo = wx.getStorageSync(`${role}_userInfo`);
    const isTourist = wx.getStorageSync('isTourist') || false;

    if (token) {
      this.globalData.role = role;
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
      this.globalData.isTourist = !!isTourist;

      wx.setStorageSync('role', role);
      wx.setStorageSync('token', token);
      wx.setStorageSync('userInfo', userInfo);

      return true;
    }
    return false;
  },

  /**
   * 获取当前是否为游客模式
   */
  getIsTourist() {
    if (this.globalData.isTourist !== undefined) {
      return this.globalData.isTourist;
    }
    const stored = wx.getStorageSync('isTourist');
    this.globalData.isTourist = !!stored;
    return this.globalData.isTourist;
  }
});
