const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createRequire } = require('node:module');
const file = path.join(__dirname, '../pages/client/public-work/index.js');
const localRequire = createRequire(file);
let definition, role = '', confirm = false, calls = 0, destination = '';
const storage = {};
const publicApi = {};
const wx = { getStorageSync: key => storage[key], setStorageSync: (key, value) => { storage[key] = value; },
  navigateTo: ({ url }) => { destination = url; }, showModal: async () => ({ confirm }), showToast() {} };
global.wx = wx;
vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
  Page: p => { definition = p; }, wx, getApp: () => ({ globalData: { role, token: role ? 'test' : '' } }),
  require: name => name.includes('conversion-tracking') ? { trackConversion() {} } : name.includes('services/api') ? { public: publicApi, client: { profile: { bindSharedWork: async (workId, shareToken) => {
    calls++; assert.equal(workId, 10); assert.equal(shareToken, 'abc'); return { techId: 7, workId: 10 };
  } } } } : localRequire(name), console
});
const p = { ...definition, data: { ...definition.data, work: { id: 10, technician: { id: 7, name: '美甲师' } } }, shareToken: 'abc',
  setData(d) { Object.assign(this.data, d); } };
(async () => {
  let appDefinition, relaunches = 0;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8'), {
    require() {}, App: a => { appDefinition = a; }, console,
    wx: { getStorageSync: key => key === 'token' ? 'saved-token' : 'client', reLaunch() { relaunches++; } },
    setTimeout: fn => fn()
  });
  const app = { ...appDefinition, globalData: {}, loadCapabilities() {}, loadLaunchConfig() {}, normalizeStoredSession() {}, verifyToken: async () => true };
  app.onLaunch({ path: 'pages/client/public-work/index', query: { scene: 'w10' } });
  await Promise.resolve();
  assert.equal(relaunches, 0, '扫码启动不能被已有登录态跳回首页');
  app.onLaunch({ path: 'pages/login/index' });
  await Promise.resolve();
  assert.equal(relaunches, 1, '普通启动保留原有自动进入首页行为');
  let bookingDefinition, ordinaryLoads = 0, receivedToken = '';
  const bookingFile = path.join(__dirname, '../pages/client/create-order/index.js');
  const bookingApi = { public: { works: { shared: async token => {
    receivedToken = token;
    return { id: 10, technician: { id: 7 }, title: '同款作品', imageUrls: ['photo'], serviceLines: [] };
  } } }, client: { works: { detail: async () => { ordinaryLoads++; } } } };
  vm.runInNewContext(fs.readFileSync(bookingFile, 'utf8'), {
    Page: page => { bookingDefinition = page; }, wx,
    require: name => name.includes('services/api') ? bookingApi : createRequire(bookingFile)(name), console
  });
  const booking = { ...bookingDefinition, data: { technicians: [] }, sourceShareToken: 'abc' };
  booking.loadWork(10);
  await Promise.resolve();
  assert.equal(receivedToken, 'abc');
  assert.equal(ordinaryLoads, 0, '临时分享预约不能依赖永久作品权限');
  assert.equal(booking._pendingWorkPrefill.sourceWorkId, 10);
  assert.equal(booking._pendingWorkPrefill.techId, 7);
  await p.bookSameStyle();
  assert.equal(destination, '/pages/client/create-order/index?workId=10&techId=7&shareToken=abc&source=work_share');
  assert.equal(storage.post_auth_redirect, undefined, '浏览分享作品后先选时间，提交时再登录');
  assert.equal(calls, 0, '进入预约页不提前绑定');
  role = 'client';
  await p.bookSameStyle();
  assert.equal(calls, 0, '已登录也不在选时间前建立绑定');
  p.data.binding = true;
  destination = '';
  await p.bookSameStyle();
  assert.equal(destination, '', '处理中不重复进入');
  p.data.binding = false;
  p.data.work.technician.id = null;
  await p.bookSameStyle();
  assert.equal(destination, '', '缺失作品归属不能发起错误预约');
  console.log('分享作品直接选时间、凭证保留、归属验证和处理中防重测试通过');
})().catch(e => { console.error(e); process.exitCode = 1; });
