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

    // 检查登录态 → 校验 token 有效性 → 自动跳转
    const token = wx.getStorageSync('token');
    const role = wx.getStorageSync('role') || 'client';

    if (token) {
      this.globalData.token = token;
      this.globalData.role = role;

      const homePages = {
        client: '/pages/client/home/index',
        technician: '/pages/technician/home/index'
      };
      const homePage = homePages[role] || homePages.client;

      // 先校验 token 是否有效，避免带失效 token 跳首页导致 401
      this.verifyToken(token, role)
        .then((valid) => {
          if (valid) {
            setTimeout(() => wx.reLaunch({ url: homePage }), 300);
          }
        })
        .catch(() => {
          // 网络错误等，保守起见仍跳转（home 接口已改为公开）
          setTimeout(() => wx.reLaunch({ url: homePage }), 300);
        });
    }
    // 无 token → 保持 app.json 的公开发现页，允许游客先浏览再转化
  },

  /** 用一次轻量请求校验 token 是否仍有效 */
  verifyToken(token, role) {
    const mePath = role === 'technician'
      ? `${this.globalData.apiBaseUrl}/api/technician/insights/overview`  // 技师端轻量接口
      : `${this.globalData.apiBaseUrl}/api/client/home`;                   // 客户端公开接口（不抛 401）
    return new Promise((resolve) => {
      wx.request({
        url: mePath,
        method: 'GET',
        header: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 5000,
        success: (res) => {
          // 200/非401 = token 有效（或接口已公开不要求认证）
          if (res.statusCode !== 401) {
            resolve(true);
          } else {
            // 401 = token 已失效，清除登录态
            console.warn('[App] token 已失效，清除登录态');
            this.clearInvalidAuth();
            resolve(false);
          }
        },
        fail: () => {
          // 网络不通时不清除 token，下次再试
          resolve(true);
        }
      });
    });
  },

  /** 清除失效的登录态 */
  clearInvalidAuth() {
    const role = this.globalData.role || wx.getStorageSync('role') || 'client';
    this.globalData.role = null;
    this.globalData.token = null;
    this.globalData.userInfo = null;
    this.globalData.isTourist = false;
    ['token', 'role', 'userInfo', 'isTourist', 'roles', 'technician_token', 'client_token',
     `${role}_token`, `${role}_userInfo`, `${role}_refreshToken`]
      .forEach(key => wx.removeStorageSync(key));
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
