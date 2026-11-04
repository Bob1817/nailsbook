const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

async function launch({ entry = 'pages/login/index', current = entry, changeSession = false, valid = true, reject = false } = {}) {
  let app, resolve, fail;
  const timers = [], calls = [];
  const session = { token: 'session-a', role: 'client' };
  const pages = [{ route: entry }];
  vm.runInNewContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), {
    App: value => { app = value; },
    require: () => ({ isPublicClientPath: () => false }),
    wx: { getStorageSync: key => session[key], reLaunch: options => calls.push(options) },
    getCurrentPages: () => pages,
    setTimeout: callback => timers.push(callback), console
  });
  Object.assign(app, {
    loadCapabilities() {}, loadLaunchConfig() {}, normalizeStoredSession() {}, getTokenExpiresAt: () => 0,
    verifyToken: () => new Promise((ok, error) => { resolve = ok; fail = error; })
  });
  app.onLaunch({ path: entry });
  pages[0] = { route: current };
  if (changeSession) app.globalData.token = 'session-b';
  if (reject) fail(new Error('offline')); else resolve(valid);
  await Promise.resolve(); await Promise.resolve();
  timers.forEach(callback => callback());
  return calls;
}

(async () => {
  assert.equal((await launch()).length, 1, '正常启动入口仍进入首页');
  assert.equal((await launch({ entry: 'pages/client/home/index' })).length, 0, '已在首页不销毁并重建同页');
  assert.equal((await launch({ current: 'pages/client/discover/index' })).length, 0, '校验期间已切页时不抢回首页');
  assert.equal((await launch({ changeSession: true })).length, 0, '会话已更换时旧异步结果不跳转');
  assert.equal((await launch({ entry: 'pages/client/quote-booking/index' })).length, 0, '保留分享入口');
  assert.equal((await launch({ valid: false })).length, 0, '失效会话不跳首页');
  assert.equal((await launch({ reject: true })).length, 1, '网络异常保留原有进入首页兜底');

  for (const token of ['session-a', '']) {
    let component;
    const calls = [];
    const app = { globalData: { token, role: 'client' } };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'components/tab-bar/index.js'), 'utf8'), {
      Component: value => { component = value; }, require: () => ({}), getApp: () => app,
      wx: { getStorageSync: () => token, reLaunch: options => calls.push(options), navigateTo: options => calls.push(options) }
    });
    const context = { data: { selected: 'home', tabs: [{ key: 'discover', path: '/pages/client/discover/index' }] } };
    const tap = () => component.methods.onTabTap.call(context, { currentTarget: { dataset: { key: 'discover' } } });
    tap(); tap();
    assert.equal(calls.length, 1, '页面切换/登录跳转完成前拦截连点');
    calls[0].complete(); tap();
    assert.equal(calls.length, 2, '完成后可再次操作，失败也可恢复');
  }
  console.log('路由竞争：启动同页/异步切页/会话变更/分享保护和底部导航连点检查通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
