let app = null;

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
    baseUrl
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
      timeout: 30000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          handleUnauthorized();
          reject({ code: 401, message: '未授权，请重新登录' });
        } else {
          reject(res.data || { code: res.statusCode, message: '请求失败' });
        }
      },
      fail: (err) => {
        console.error('Request failed:', err);
        wx.showToast({
          title: '网络错误，请检查网络连接',
          icon: 'none'
        });
        reject({ code: -1, message: '网络错误' });
      }
    });
  });
}

function handleUnauthorized() {
  const appInstance = getAppInstance();
  if (appInstance && appInstance.logout) {
    appInstance.logout();
  }
  wx.redirectTo({
    url: '/pages/role-select/index'
  });
}

function get(url, params, options = {}) {
  let queryString = '';
  if (params) {
    queryString = '?' + Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
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