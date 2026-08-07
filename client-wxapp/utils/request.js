let app = null;
let refreshPromise = null;

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
  const token = appInstance?.globalData?.token;
  const apiBase = baseUrl || appInstance?.globalData?.apiBaseUrl || 'http://localhost:3000';

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
                handleUnauthorized();
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
        const currentUser = appInstance?.globalData?.userInfo || wx.getStorageSync(`${role}_userInfo`);
        const currentRoles = appInstance?.globalData?.roles || wx.getStorageSync('roles') || [role];
        const isTouristFromStorage = wx.getStorageSync('isTourist');
        const currentIsTourist = appInstance?.globalData?.isTourist != null
          ? appInstance.globalData.isTourist
          : (isTouristFromStorage !== '' ? isTouristFromStorage : false);
        appInstance.setLogin(role, res.data.accessToken, res.data.user || res.data.technician || currentUser, currentRoles, currentIsTourist);
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
  const appInstance = getAppInstance();
  if (appInstance && appInstance.logout) {
    appInstance.logout();
  }
  wx.reLaunch({
    url: '/pages/role-select/index'
  });
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
  request,
  get,
  post,
  put,
  patch,
  del
};
