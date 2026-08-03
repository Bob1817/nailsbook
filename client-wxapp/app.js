App({
  globalData: {
    userInfo: null,
    token: null,
    role: null,
    apiBaseUrl: 'https://api.lunails.cn',
    capabilities: { wechatLogin: false, wechatPay: false }
  },

  onLaunch() {
    console.log('App launched');
    this.loadCapabilities();
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

  setLogin(role, token, userInfo) {
    this.globalData.role = role;
    this.globalData.token = token;
    this.globalData.userInfo = userInfo;

    wx.setStorageSync('role', role);
    wx.setStorageSync('token', token);
    wx.setStorageSync(`${role}_token`, token);
    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync(`${role}_userInfo`, userInfo);
  },

  logout() {
    const role = this.globalData.role || wx.getStorageSync('role');
    this.globalData.role = null;
    this.globalData.token = null;
    this.globalData.userInfo = null;

    wx.removeStorageSync('role');
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
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

    if (token) {
      this.globalData.role = role;
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;

      wx.setStorageSync('role', role);
      wx.setStorageSync('token', token);
      wx.setStorageSync('userInfo', userInfo);

      return true;
    }
    return false;
  }
});
