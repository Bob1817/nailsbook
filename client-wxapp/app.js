// === 主包共享模块注册（解决「主包未使用的 js 文件」上传报错）===
// 以下模块被子包页面 require，必须在主包 app.js 中声明引用才能通过上传校验。
require('./utils/format');
require('./utils/order');
require('./utils/normalize-work');
require('./utils/util');
require('./utils/permission');
require('./utils/subscription');
require('./utils/artist-navigation');
require('./utils/conversion-tracking');
require('./utils/service-pricing');
require('./utils/shop-guidance');
require('./utils/wechat-auth');
require('./utils/wechat-subscription');
require('./utils/workSchedule');
require('./utils/work-share-scene');
require('./utils/work-share-registration');
require('./utils/avatar');
require('./utils/booking-location');

App({
  globalData: {
    userInfo: null,
    token: null,
    role: null,
    isTourist: false,
    apiBaseUrl: 'https://api.lunails.cn',
    capabilities: { wechatLogin: false, wechatPay: false },
    launchConfig: null
  },

  onLaunch(options = {}) {
    console.log('App launched');
    this.loadCapabilities();
    this.loadLaunchConfig();
    this.normalizeStoredSession();

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
      const preserveSharePage = (options.path === 'pages/login/index' && options.query && options.query.invite) || options.path === 'pages/client/quick-booking/index' || options.path === 'pages/client/public-work/index' || options.path === 'pages/client/create-order/index';

      // 先校验 token 是否有效，避免带失效 token 跳首页导致 401
      this.verifyToken(token, role)
        .then((valid) => {
          if (valid) {
            if (!preserveSharePage) setTimeout(() => wx.reLaunch({ url: homePage }), 300);
          }
        })
        .catch(() => {
          // 网络错误等，保守起见仍跳转（home 接口已改为公开）
          if (!preserveSharePage) setTimeout(() => wx.reLaunch({ url: homePage }), 300);
        });
    }
    // 无 token → 保持 app.json 的公开发现页，允许游客先浏览再转化
  },

  onShow() {
    const token = this.globalData.token || wx.getStorageSync('token');
    const expiresAt = this.getTokenExpiresAt(token);
    if (expiresAt > 0 && expiresAt <= Date.now()) require('./utils/request').handleUnauthorized();
  },

  /** 修复旧版本曾把客户端 JWT 存入 technician 会话槽位的问题。 */
  normalizeStoredSession() {
    const token = wx.getStorageSync('token');
    if (!token || typeof token !== 'string') return;
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) return;
      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
      const bytes = wx.base64ToArrayBuffer(padded);
      const payload = JSON.parse(decodeURIComponent(Array.prototype.map.call(new Uint8Array(bytes), function (byte) {
        return '%' + ('00' + byte.toString(16)).slice(-2);
      }).join('')));
      const tokenRole = payload.userType === 'technician' ? 'technician' : payload.userType === 'client' ? 'client' : '';
      const storedRole = wx.getStorageSync('role');
      if (!tokenRole || tokenRole === storedRole) return;
      wx.setStorageSync('role', tokenRole);
      wx.setStorageSync(`${tokenRole}_token`, token);
      this.globalData.role = tokenRole;
      this.globalData.token = token;
    } catch (err) {
      console.warn('[App] 无法识别本地登录凭证，将由服务端校验', err);
    }
  },

  /** 用一次轻量请求校验 token 是否仍有效 */
  verifyToken(token, role) {
    const tokenExpiresAt = this.getTokenExpiresAt(token);
    if (tokenExpiresAt > 0 && tokenExpiresAt <= Date.now()) {
      require('./utils/request').handleUnauthorized();
      return Promise.resolve(false);
    }
    const shouldRefresh = tokenExpiresAt > 0 && tokenExpiresAt <= Date.now() + 60000;
    if (shouldRefresh) {
      const request = require('./utils/request');
      return request.refreshAccessToken(this.globalData.apiBaseUrl)
        .then(() => true)
        .catch((error) => {
          if (Number(error?.code) === 401) {
            console.warn('[App] 登录凭证已过期，退出登录');
            request.handleUnauthorized();
          }
          return false;
        });
    }

    const mePath = role === 'technician'
      ? `${this.globalData.apiBaseUrl}/api/technician/auth/me`
      : `${this.globalData.apiBaseUrl}/api/client/auth/me`;
    return new Promise((resolve) => {
      wx.request({
        url: mePath,
        method: 'GET',
        header: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 5000,
        success: (res) => {
          // 受保护的身份接口返回非 401，说明当前角色令牌仍可使用
          if (res.statusCode !== 401) {
            resolve(true);
          } else {
            // access token 失效时先尝试刷新；refresh token 也失效才退出登录。
            const request = require('./utils/request');
            request.refreshAccessToken(this.globalData.apiBaseUrl)
              .then(() => resolve(true))
              .catch((error) => {
                if (Number(error?.code) === 401) request.handleUnauthorized();
                resolve(false);
              });
          }
        },
        fail: () => {
          // 网络不通时不清除 token，下次再试
          resolve(true);
        }
      });
    });
  },

  /** 从 JWT 中读取过期时间；旧格式或异常 token 继续交给服务端校验。 */
  getTokenExpiresAt(token) {
    if (!token || typeof token !== 'string') return 0;
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) return 0;
      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
      const bytes = wx.base64ToArrayBuffer(padded);
      const payload = JSON.parse(decodeURIComponent(Array.prototype.map.call(new Uint8Array(bytes), function (byte) {
        return '%' + ('00' + byte.toString(16)).slice(-2);
      }).join('')));
      return Number(payload.exp) > 0 ? Number(payload.exp) * 1000 : 0;
    } catch (err) {
      return 0;
    }
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

  loadLaunchConfig(force = false) {
    if (this._launchConfigPromise && !force) return this._launchConfigPromise;
    const localFallback = require('./config');
    this._launchConfigPromise = new Promise((resolve) => {
      wx.request({
        url: `${this.globalData.apiBaseUrl}/api/public/launch-config`,
        method: 'GET',
        timeout: 8000,
        success: (res) => {
          const remote = res.statusCode >= 200 && res.statusCode < 300 ? res.data : {};
          const config = { ...localFallback, ...remote };
          this.globalData.launchConfig = config;
          wx.setStorageSync('launch_config', config);
          resolve(config);
        },
        fail: () => {
          const cached = wx.getStorageSync('launch_config') || {};
          const config = { ...localFallback, ...cached };
          this.globalData.launchConfig = config;
          resolve(config);
        }
      });
    }).finally(() => { this._launchConfigPromise = null; });
    return this._launchConfigPromise;
  },

  setLogin(role, token, userInfo, roles, isTourist) {
    require('./utils/request').resetUnauthorized();
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
    this.globalData.role = null;
    this.globalData.token = null;
    this.globalData.userInfo = null;
    this.globalData.isTourist = false;
    this.globalData.roles = [];

    [
      'role', 'roles', 'token', 'userInfo', 'isTourist', 'defaultTechId',
      'client_token', 'client_refreshToken', 'client_userInfo', 'client_bindings',
      'technician_token', 'technician_refreshToken', 'technician_userInfo'
    ].forEach((key) => wx.removeStorageSync(key));
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
