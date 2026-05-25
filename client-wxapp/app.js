App({
  globalData: {
    userInfo: null,
    token: null,
    role: null,
    apiBaseUrl: 'https://api.lunails.cn'
  },

  onLaunch() {
    console.log('App launched');
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
    this.globalData.role = null;
    this.globalData.token = null;
    this.globalData.userInfo = null;

    wx.removeStorageSync('role');
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('defaultTechId');
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