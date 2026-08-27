const assert = require('assert');
let requests = 0;
let logouts = 0;
global.getApp = () => ({
  globalData: { role: 'client', token: 'test-token', apiBaseUrl: 'http://test.local' },
  logout: () => { logouts++; }
});
global.wx = {
  getStorageSync: () => '',
  request: (options) => {
    requests++;
    options.success({ statusCode: 429, data: { statusCode: 429, message: '请求过于频繁，请 60 秒后重试' } });
  }
};
const { request } = require('../utils/request');
(async () => {
  await assert.rejects(request({ url: '/api/client/orders' }), error => {
    assert.strictEqual(error.code, 429);
    assert.ok(error.message.includes('60 秒后重试'));
    return true;
  });
  assert.strictEqual(requests, 1, '429 不得触发自动重试或刷新令牌');
  assert.strictEqual(logouts, 0, '429 不得注销用户');
  console.log('请求限流与重试边界检查通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
