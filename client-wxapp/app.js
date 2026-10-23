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
require('./utils/share-copy');

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
      const isWorkTimelineEntry = options.query && options.query.channel === 'wechat_moments'
        && (options.path === 'pages/client/work-detail/index' || options.path === 'pages/technician/work-detail/index');
      const preserveSharePage = (options.path === 'pages/login/index' && options.query && options.query.invite) || options.path === 'pages/client/quick-booking/index' || options.path === 'pages/client/public-work/index' || options.path === 'pages/client/artist-home/index' || options.path === 'pages/client/works/index' || options.path === 'pages/client/create-order/index' || options.path === 'pages/client/quote-confirm/index' || options.path === 'pages/client/quote-booking/index' || isWorkTimelineEntry;

      // 先校验 token 是否有效，避免带失效 token 跳首页导致 401
      this.verifyToken(token, role)
        .then((valid) => {
          if (valid) {
            if (!preserveSharePage) setTimeout(() => wx.reLaunch({ url: homePage }), 300);
          }
        })
        .catch(() => {
          // 网络错误时保留本地会话，进入首页后由认证接口再次校验。
          if (!preserveSharePage) setTimeout(() => wx.reLaunch({ url: homePage }), 300);
        });
    }
    // 无 token 时保留当前入口；公开作品与美甲师主页允许游客浏览。
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

    this.globalData.roles = [role];
    wx.setStorageSync('roles', [role]);
    const other = role === 'client' ? 'technician' : 'client';
    ['token', 'refreshToken', 'userInfo'].forEach(key => wx.removeStorageSync(`${other}_${key}`));

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
