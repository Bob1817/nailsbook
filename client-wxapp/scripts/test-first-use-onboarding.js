const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.join(__dirname, '..');
const storage = { role: 'client', client_userInfo: { id: 1 } };
let destination, failLoad = false, calls = 0, resolveEnable;
const full = { ready: true, accepting: false, completed: 5, total: 5, steps: [] };
let profile = { id: 7, bookingSetup: full };
let getProfile = async () => { if (failLoad) throw Error('网络中断'); return profile; };
const api = { technician: { auth: {
  getUserInfo: () => getProfile(),
  updateStatus: () => { calls++; return new Promise(resolve => { resolveEnable = resolve; }); }
} } };
global.wx = {
  getStorageSync: key => storage[key], setStorageSync: (key, value) => { storage[key] = value; },
  removeStorageSync: key => { delete storage[key]; },
  reLaunch: ({ url }) => { destination = url; }, navigateTo: ({ url }) => { destination = url; },
  showToast() {}
};
function load(file, component = false) {
  let definition;
  const absolute = path.join(root, file);
  vm.runInNewContext(fs.readFileSync(absolute, 'utf8'), {
    Page: value => { definition = value; }, Component: value => { definition = value; },
    require: name => name.includes('services/api') ? api : createRequire(absolute)(name),
    wx: global.wx, console, decodeURIComponent
  });
  return { ...(component ? definition.methods : definition), lifetimes: definition.lifetimes,
    pageLifetimes: definition.pageLifetimes, data: { ...definition.data }, properties: {},
    setData(value) { Object.assign(this.data, value); }, triggerEvent() {} };
}
(async () => {
  const bridge = load('pages/onboarding/index.js');
  storage.post_auth_redirect = '/pages/client/public-work/index?id=9&book=1';
  bridge.onLoad({ role: 'client' });
  assert.equal(destination, '/pages/client/public-work/index?id=9&book=1');
  assert.equal(storage.post_auth_redirect, undefined);
  assert(storage.context_guide_v1_client_1);
  bridge.onLoad({ role: 'technician' });
  assert.equal(destination, '/pages/technician/home/index');
  bridge.onLoad({ role: 'client', redirect: '%invalid' });
  assert.equal(destination, '/pages/client/home/index');

  const guide = load('components/context-guide/index.js', true);
  guide.properties.kind = 'client-home'; guide.refresh();
  assert.equal(guide.data.visible, true);
  guide.act(); assert.equal(destination, '/pages/client/works/index');
  guide.dismiss(); guide.refresh(); assert.equal(guide.data.visible, false);
  storage.client_userInfo = { id: 2 }; guide.refresh();
  assert.equal(guide.data.visible, false, '普通账号不能继承另一账号的新手提示');
  bridge.onLoad({ role: 'client' }); guide.refresh(); assert.equal(guide.data.visible, true);
  storage.client_userInfo = { id: 1 }; guide.refresh(); assert.equal(guide.data.visible, false);
  guide.properties.kind = 'client-booking'; guide.refresh();
  assert.equal(guide.data.visible, true, '关闭首页提示不能跳过预约页面提示');

  storage.role = 'technician'; storage.technician_userInfo = { id: 7 };
  const checklist = load('components/booking-setup/index.js', true);
  await checklist.refresh(); assert.equal(checklist.data.setup.ready, true);
  const enabling = checklist.enable(); await checklist.enable();
  assert.equal(calls, 1, '重复点击不能重复开启');
  resolveEnable({ status: 'active' }); await enabling;
  assert.equal(checklist.data.saving, false);
  failLoad = true; await checklist.refresh(); await checklist.enable();
  assert.equal(calls, 1, '加载失败不能沿用旧就绪状态开启');
  assert(checklist.data.error);
  failLoad = false; profile = { id: 7, bookingSetup: { ...full, ready: false, completed: 3 } };
  await checklist.refresh(); await checklist.enable(); assert.equal(calls, 1);
  checklist.open({ currentTarget: { dataset: { key: 'schedule' } } });
  assert.equal(destination, '/pages/technician/profile/index?setup=schedule');
  profile = { id: 7, bookingSetup: full };
  await checklist.pageLifetimes.show.call(checklist); // refresh returns asynchronously
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(checklist.data.setup.completed, 5, '返回工作台重新读取已保存资料');

  let resolveOld;
  getProfile = () => new Promise(resolve => { resolveOld = resolve; });
  const old = checklist.refresh();
  getProfile = async () => ({ id: 7, bookingSetup: { ...full, completed: 2, ready: false } });
  await checklist.refresh(); resolveOld(profile); await old;
  assert.equal(checklist.data.setup.completed, 2, '旧响应不能覆盖新进度');
  getProfile = () => new Promise(resolve => { resolveOld = resolve; });
  const detached = checklist.refresh(); checklist.lifetimes.detached.call(checklist);
  resolveOld(profile); await detached;
  assert.equal(checklist.data.setup.completed, 2, '离页后不能回填旧进度');
  const switched = checklist.refresh(); storage.technician_userInfo = { id: 9 };
  resolveOld(profile); await switched;
  assert.equal(storage.technician_userInfo.id, 9, '切换账号后不能覆盖新账号缓存');

  const routes = require('../utils/booking-setup').routes;
  for (const route of Object.values(routes)) assert(fs.existsSync(path.join(root, route.split('?')[0] + '.js')));
  assert(!fs.readFileSync(path.join(root, 'pages/onboarding/index.wxml'), 'utf8').includes('下一步'));
  console.log('页面内引导、账号隔离、实际准备进度、失败重试、防重、旧响应隔离与预约入口检查通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
