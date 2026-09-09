const assert = require('assert');
const requestPath = require.resolve('../utils/request');

function reloadRequest() {
  delete require.cache[requestPath];
  return require('../utils/request');
}

(async () => {
  let requests = 0;
  let logouts = 0;
  global.getApp = () => ({
    globalData: { role: 'client', token: 'test-token', apiBaseUrl: 'http://test.local' },
    logout: () => { logouts++; }
  });
  global.wx = {
    getStorageSync: () => '',
    request: options => {
      requests++;
      options.success({ statusCode: 429, data: { statusCode: 429, message: '请求过于频繁，请 60 秒后重试' } });
    }
  };
  await assert.rejects(reloadRequest().request({ url: '/api/client/orders' }), error => {
    assert.strictEqual(error.code, 429);
    assert.ok(error.message.includes('60 秒后重试'));
    return true;
  });
  assert.strictEqual(requests, 1, '429 不得触发自动重试或刷新令牌');
  assert.strictEqual(logouts, 0, '429 不得注销用户');

  let authorization = '';
  global.getApp = () => ({
    globalData: { role: 'client', token: 'stale-technician-jwt', apiBaseUrl: 'http://test.local' },
    logout: () => { logouts++; }
  });
  global.wx = {
    getStorageSync: key => ({ role: 'client', client_token: 'client-jwt', token: 'stale-technician-jwt' })[key] || '',
    request: options => {
      authorization = options.header.Authorization;
      options.success({ statusCode: 200, data: [] });
    },
    reLaunch() {}
  };
  const requestModule = reloadRequest();
  assert.strictEqual(typeof requestModule.refreshAccessToken, 'function', '启动校验必须能够复用统一刷新逻辑');
  await requestModule.request({ url: '/api/client/messages/conversations' });
  assert.strictEqual(authorization, 'Bearer client-jwt');
  console.log('请求限流、身份令牌优先级与重试边界检查通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
