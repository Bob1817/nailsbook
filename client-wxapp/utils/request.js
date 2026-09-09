let app = null;
let refreshPromise = null;
let unauthorizedPromise = null;

function getAppInstance() {
  if (!app) {
    try {
      app = getApp();
    } catch (e) {
      console.error('Failed to get app instance:', e);
    }
  }
  return app;
}

function request(options) {
  const {
    url,
    method = 'GET',
    data,
    header = {},
    needAuth = true,
    baseUrl,
    timeout,
    responseType,
    silent,
    _retried = false
  } = options;

  const appInstance = getAppInstance();
  const role = appInstance?.globalData?.role || wx.getStorageSync('role');
  // 角色专属令牌优先，避免切换身份后 globalData 尚未同步时携带另一身份 JWT。
  const roleToken = role && wx.getStorageSync(`${role}_token`);
  const token = roleToken
    || appInstance?.globalData?.token
    || wx.getStorageSync('token');
  const requiredRole = url.indexOf('/api/technician/') === 0
    ? 'technician'
    : url.indexOf('/api/client/') === 0 ? 'client' : '';
  const roleMismatch = !!(needAuth && requiredRole && role && requiredRole !== role);
  // 不发送必然失败的跨身份请求，也不触发当前身份的刷新或注销。
  if (roleMismatch) {
    return Promise.reject({ code: 403, message: '当前身份无权访问此内容' });
  }
  const apiBase = baseUrl || appInstance?.globalData?.apiBaseUrl || 'http://localhost:3000';
  if (needAuth && token && appInstance?.getTokenExpiresAt) {
    const expiresAt = appInstance.getTokenExpiresAt(token);
    if (expiresAt > 0 && expiresAt <= Date.now()) {
      handleUnauthorized();
      return Promise.reject({ code: 401, message: '长时间未登录已退出账号，请重新登录' });
    }
  }

  let fullUrl = url;
  if (!url.startsWith('http')) {
    fullUrl = `${apiBase}${url}`;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...header
  };

  if (needAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method,
      data,
      header: headers,
      timeout: timeout || 30000,
      ...(responseType ? { responseType } : {}),
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          if (needAuth && !_retried) {
            refreshAccessToken(apiBase)
              .then(() => request({ ...options, _retried: true }))
              .then(resolve)
              .catch((error) => {
                if (Number(error?.code) === 401) handleUnauthorized();
                reject(error);
              });
            return;
          }
          if (needAuth) {
            handleUnauthorized();
          }
          reject(normalizeResponseError(res, '登录已过期，请重新登录'));
        } else {
          const fallback = res.statusCode >= 500
            ? '服务暂时不可用，请稍后重试'
            : '请求失败，请重试';
          reject(normalizeResponseError(res, fallback));
        }
      },
      fail: (err) => {
        const isTimeout = String(err && err.errMsg || '').toLowerCase().includes('timeout');
        const message = isTimeout ? '请求超时，请重试' : '网络错误，请检查网络连接';
        if (!silent) {
          console.error('Request failed:', err);
          wx.showToast({
            title: message,
            icon: 'none'
          });
        }
        reject({ code: isTimeout ? -2 : -1, message });
      }
    });
  });
}

function refreshAccessToken(apiBase) {
  if (refreshPromise) return refreshPromise;

  const appInstance = getAppInstance();
  const role = appInstance?.globalData?.role || wx.getStorageSync('role');
  const refreshToken = role && wx.getStorageSync(`${role}_refreshToken`);
  if (!role || !refreshToken) {
    return Promise.reject({ code: 401, message: '登录已过期，请重新登录' });
  }

  const path = role === 'technician'
    ? '/api/technician/auth/refresh'
    : '/api/client/auth/refresh';

  refreshPromise = new Promise((resolve, reject) => {
    wx.request({
      url: `${apiBase}${path}`,
      method: 'POST',
      data: { refreshToken },
      header: { 'Content-Type': 'application/json' },
      timeout: 30000,
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300 || !res.data?.accessToken) {
          reject(normalizeResponseError(res, '登录已过期，请重新登录'));
          return;
        }
        const latestAppInstance = getAppInstance();
        const currentUser = latestAppInstance?.globalData?.userInfo || wx.getStorageSync(`${role}_userInfo`);
        const currentRoles = latestAppInstance?.globalData?.roles || wx.getStorageSync('roles') || [role];
        const isTouristFromStorage = wx.getStorageSync('isTourist');
        const currentIsTourist = latestAppInstance?.globalData?.isTourist != null
          ? latestAppInstance.globalData.isTourist
          : (isTouristFromStorage !== '' ? isTouristFromStorage : false);
        const refreshedUser = res.data.user || res.data.technician || currentUser;
        if (typeof latestAppInstance?.setLogin === 'function') {
          latestAppInstance.setLogin(role, res.data.accessToken, refreshedUser, currentRoles, currentIsTourist);
        } else {
          wx.setStorageSync('role', role);
          wx.setStorageSync('token', res.data.accessToken);
          wx.setStorageSync(`${role}_token`, res.data.accessToken);
          if (refreshedUser) {
            wx.setStorageSync('userInfo', refreshedUser);
            wx.setStorageSync(`${role}_userInfo`, refreshedUser);
          }
          wx.setStorageSync('roles', currentRoles);
          wx.setStorageSync('isTourist', !!currentIsTourist);
        }
        if (res.data.refreshToken) {
          wx.setStorageSync(`${role}_refreshToken`, res.data.refreshToken);
        }
        resolve(res.data.accessToken);
      },
      fail: () => reject({ code: -1, message: '网络错误，请检查网络连接' }),
    });
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function normalizeResponseError(res, fallbackMessage) {
  const data = res && res.data;
  if (data && typeof data === 'object') {
    return {
      ...data,
      code: data.code || res.statusCode,
      message: data.message || data.error || fallbackMessage
    };
  }
  return { code: res.statusCode, message: fallbackMessage };
}

function handleUnauthorized() {
  if (unauthorizedPromise) return unauthorizedPromise;
  clearAuthState();
  unauthorizedPromise = Promise.resolve();
  wx.reLaunch({
    url: '/pages/login/index?sessionExpired=1',
    fail: () => { unauthorizedPromise = null; }
  });
  return unauthorizedPromise;
}

function resetUnauthorized() { unauthorizedPromise = null; }

function clearAuthState() {
  const appInstance = getAppInstance();
  if (appInstance?.clearInvalidAuth) appInstance.clearInvalidAuth();
  else if (appInstance?.logout) appInstance.logout();
  if (typeof wx.removeStorageSync === 'function') {
    ['token', 'role', 'userInfo', 'isTourist', 'roles', 'defaultTechId',
      'client_token', 'client_refreshToken', 'client_userInfo',
      'technician_token', 'technician_refreshToken', 'technician_userInfo']
      .forEach(key => wx.removeStorageSync(key));
  }
}

function get(url, params, options = {}) {
  let queryString = '';
  if (params) {
    const pairs = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
      .map(key => `${key}=${encodeURIComponent(params[key])}`);
    if (pairs.length > 0) queryString = '?' + pairs.join('&');
  }
  return request({
    url: `${url}${queryString}`,
    method: 'GET',
    ...options
  });
}

function post(url, data, options = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  });
}

function put(url, data, options = {}) {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  });
}

function patch(url, data, options = {}) {
  return request({
    url,
    method: 'PATCH',
    data,
    ...options
  });
}

function del(url, options = {}) {
  return request({
    url,
    method: 'DELETE',
    ...options
  });
}

module.exports = {
  resetUnauthorized,
  request,
  refreshAccessToken,
  handleUnauthorized,
  get,
  post,
  put,
  patch,
  del
};
