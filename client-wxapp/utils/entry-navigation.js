function currentSession() {
  const app = typeof getApp === 'function' ? getApp() : null;
  const globalData = app && app.globalData ? app.globalData : {};
  const role = globalData.role || wx.getStorageSync('role') || 'client';
  const roleToken = wx.getStorageSync(`${role}_token`);
  let token = roleToken || globalData.token || wx.getStorageSync('token');

  if (token && app && typeof app.getTokenExpiresAt === 'function') {
    const expiresAt = app.getTokenExpiresAt(token);
    if (expiresAt > 0 && expiresAt <= Date.now()) token = '';
  }
  return { role, token };
}

function homePath() {
  const session = currentSession();
  if (!session.token) return '/pages/login/index';
  return session.role === 'technician'
    ? '/pages/technician/home/index'
    : '/pages/client/home/index';
}

function goHome() {
  wx.reLaunch({ url: homePath() });
}

function currentPagePath() {
  if (typeof getCurrentPages !== 'function') return '';
  const pages = getCurrentPages();
  const current = pages && pages[pages.length - 1];
  if (!current || !current.route || current.route === 'pages/login/index') return '';
  const query = Object.keys(current.options || {})
    .filter(key => current.options[key] !== undefined && current.options[key] !== null && current.options[key] !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(current.options[key])}`)
    .join('&');
  return `/${current.route}${query ? `?${query}` : ''}`;
}

module.exports = { currentPagePath, currentSession, goHome, homePath };
