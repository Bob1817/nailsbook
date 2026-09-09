const assert = require('assert');
const requestPath = require.resolve('../utils/request');

async function main() {
  const storage = { role: 'client', client_token: 'client-token' };
  let requests = [];
  let redirects = 0;
  let logouts = 0;
  const app = {
    globalData: { role: 'client', token: 'client-token', apiBaseUrl: 'http://test.local' },
    setLogin(role, token) {
      this.globalData.role = role;
      this.globalData.token = token;
      storage[`${role}_token`] = token;
    },
    logout() { logouts++; }
  };
  global.getApp = () => app;
  global.wx = {
    getStorageSync: key => storage[key] || '',
    setStorageSync: (key, value) => { storage[key] = value; },
    reLaunch: () => { redirects++; },
    request(options) {
      requests.push(options);
      options.success({ statusCode: 401, data: {} });
    }
  };
  delete require.cache[requestPath];
  const request = require('../utils/request');
  const urls = ['/api/technician/orders', '/api/technician/orders/income-calendar'];
  for (const url of urls) {
    await assert.rejects(request.get(url), error => error.code === 403);
  }
  assert.strictEqual(requests.length, 0, '身份不匹配应在本地阻止请求');
  assert.strictEqual(logouts, 0, '不能注销客户身份');

  let page;
  global.Page = definition => { page = definition; };
  require('../pages/technician/orders/index');
  page.data = { ...page.data };
  page.setData = data => Object.assign(page.data, data);
  page.onLoad({});
  await page.loadOrders();
  assert.strictEqual(requests.length, 0, '首次进入和刷新均不能以客户身份请求美甲师订单');
  assert.ok(redirects > 0, '身份错误应引导登录');
  storage.role = '';
  app.globalData.role = null;
  await page.loadOrders();
  assert.strictEqual(requests.length, 0, '未登录不能请求订单');

  storage.role = 'technician';
  storage.technician_token = 'expired-token';
  storage.technician_refreshToken = 'refresh-token';
  app.globalData.role = 'technician';
  wx.request = options => {
    requests.push(options);
    setImmediate(() => options.success(options.url.endsWith('/auth/refresh')
      ? { statusCode: 200, data: { accessToken: 'fresh-token' } }
      : options.header.Authorization === 'Bearer fresh-token'
        ? { statusCode: 200, data: [] }
        : { statusCode: 401, data: {} }));
  };
  await Promise.all(urls.map(url => request.get(url)));
  assert.strictEqual(requests.filter(item => item.url.endsWith('/auth/refresh')).length, 1,
    '两个接口同时过期只刷新一次');
  assert.strictEqual(requests.filter(item => item.header.Authorization === 'Bearer fresh-token').length, 2);
  assert.strictEqual(logouts, 0);
  requests = [];
  await page.loadOrders();
  assert.strictEqual(requests.length, 3, '有效美甲师会话正常加载订单、日历和日期接单设置');
  assert.strictEqual(page.data.loading, false);

  delete storage.technician_refreshToken;
  wx.request = options => options.success({ statusCode: 401, data: {} });
  await assert.rejects(request.get(urls[0]), error => error.code === 401);
  assert.strictEqual(logouts, 1, '无法刷新时清除失效登录态');
  console.log('订单身份拦截、有效会话、并发刷新和失效登录检查通过');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
