const assert = require('node:assert/strict');
const requestPath = require.resolve('../utils/request');
const reload = () => { delete require.cache[requestPath]; return require('../utils/request'); };

function makeStorage(initial) {
  const values = { ...initial };
  return {
    get: key => values[key] || '',
    remove: key => { delete values[key]; },
    values
  };
}

(async () => {
  const storage = makeStorage({ role: 'client', token: 'expired', client_token: 'expired', client_refreshToken: 'expired-refresh', roles: ['client'] });
  let logoutCount = 0;
  let modalCount = 0;
  let redirectCount = 0;
  let refreshCount = 0;
  let protectedCount = 0;
  global.getApp = () => ({
    globalData: { role: 'client', token: 'expired', apiBaseUrl: 'http://test.local' },
    clearInvalidAuth: () => { logoutCount++; }
  });
  global.getCurrentPages = () => [{ route: 'pages/client/order-detail/index', options: { id: '88' } }];
  global.wx = {
    getStorageSync: storage.get,
    setStorageSync: (key, value) => { storage.values[key] = value; },
    removeStorageSync: storage.remove,
    request: options => {
      if (options.url.endsWith('/auth/refresh')) {
        refreshCount++;
        options.success({ statusCode: 401, data: { message: '刷新令牌无效或已过期' } });
      } else {
        protectedCount++;
        options.success({ statusCode: 401, data: { message: '令牌已过期' } });
      }
    },
    showModal: options => { modalCount++; options.complete({ confirm: true }); },
    reLaunch: options => {
      redirectCount++;
      assert.equal(options.url, '/pages/login/index?sessionExpired=1&source=session_expired&redirect=%2Fpages%2Fclient%2Forder-detail%2Findex%3Fid%3D88');
    }
  };
  const expired = reload();
  await Promise.allSettled([
    expired.get('/api/client/auth/me'),
    expired.get('/api/client/orders')
  ]);
  assert.equal(refreshCount, 1, '并发401只能发起一次刷新');
  assert.equal(logoutCount, 1, '并发401只能清理一次登录态');
  assert.equal(modalCount, 0, '请求层直接跳转，提示由登录页显示');
  assert.equal(redirectCount, 1, '用户确认后只能跳转登录页一次');
  assert.equal(storage.values.client_token, undefined);
  assert.equal(storage.values.client_refreshToken, undefined);
  assert.equal(storage.values.post_auth_redirect, '/pages/client/order-detail/index?id=88');
  const countAfterExpiry = protectedCount;
  await assert.rejects(expired.get('/api/client/orders'), error => error.code === 401);
  assert.equal(protectedCount, countAfterExpiry, '登录失效跳转期间不得继续发送认证请求');
  assert.equal(redirectCount, 1, '失效后的请求不得重复跳转');

  let anonymousRequests = 0;
  global.getApp = () => ({ globalData: {} });
  global.wx = {
    getStorageSync: () => '', setStorageSync() {}, removeStorageSync() {},
    request: options => { anonymousRequests++; options.success({ statusCode: 200, data: {} }); },
    reLaunch() {}
  };
  const anonymous = reload();
  await assert.rejects(anonymous.get('/api/technician/works/12'), error => error.code === 401);
  assert.equal(anonymousRequests, 0, '缺少令牌时不得向美甲师接口发送匿名请求');
  await anonymous.get('/api/public/works/12', null, { needAuth: false });
  assert.equal(anonymousRequests, 1, '会话失效不得阻断游客公开作品浏览');

  const networkStorage = makeStorage({ role: 'client', client_token: 'expired', client_refreshToken: 'refresh' });
  logoutCount = 0; modalCount = 0; redirectCount = 0;
  global.getApp = () => ({ globalData: { role: 'client', token: 'expired', apiBaseUrl: 'http://test.local' }, clearInvalidAuth: () => { logoutCount++; } });
  global.wx = {
    getStorageSync: networkStorage.get,
    removeStorageSync: networkStorage.remove,
    request: options => options.url.endsWith('/auth/refresh')
      ? options.fail({ errMsg: 'request:fail network' })
      : options.success({ statusCode: 401, data: {} }),
    showModal: () => { modalCount++; },
    reLaunch: () => { redirectCount++; }
  };
  global.getCurrentPages = () => [{ route: 'pages/client/orders/index', options: {} }];
  await assert.rejects(reload().get('/api/client/auth/me'), error => error.code === -1);
  assert.equal(logoutCount, 0, '刷新时网络故障不得退出登录');
  assert.equal(modalCount, 0, '网络故障不得提示登录过期');
  assert.equal(redirectCount, 0, '网络故障不得跳转登录页');

  console.log('会话过期刷新、单次退出提示、登录跳转及网络故障保留会话检查通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
