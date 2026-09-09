const DEFAULT_CLIENT_AVATAR = '/static/icons/client.svg';
const DEFAULT_TECHNICIAN_AVATAR = '/static/icons/technician.svg';

function defaultAvatar(role) {
  return role === 'technician' ? DEFAULT_TECHNICIAN_AVATAR : DEFAULT_CLIENT_AVATAR;
}

function syncSessionAvatar(role, avatarUrl) {
  if (!avatarUrl) return;
  let app = null;
  try { app = getApp(); } catch (e) {}
  if (app && app.globalData && app.globalData.role === role) {
    app.globalData.userInfo = { ...(app.globalData.userInfo || {}), avatarUrl };
  }
  [`${role}_userInfo`, 'userInfo'].forEach((key) => {
    if (key === 'userInfo' && wx.getStorageSync('role') !== role) return;
    const user = wx.getStorageSync(key) || {};
    wx.setStorageSync(key, { ...user, avatarUrl });
  });
}

module.exports = { DEFAULT_CLIENT_AVATAR, DEFAULT_TECHNICIAN_AVATAR, defaultAvatar, syncSessionAvatar };
