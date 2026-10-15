const { buildClientLoginUrl } = require('../../utils/artist-navigation');
Page({ onLoad() {
  const app = getApp();
  if (!app.globalData.token) { wx.redirectTo({ url: buildClientLoginUrl('/pages/booking/index') }); return; }
  const role = app.globalData.role;
  if (!['client', 'technician'].includes(role)) { wx.redirectTo({ url: buildClientLoginUrl('/pages/booking/index') }); return; }
  wx.redirectTo({ url: `/pages/${role}/create-order/index` });
} });
