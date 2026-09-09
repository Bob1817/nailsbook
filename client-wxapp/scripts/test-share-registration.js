const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const storage = {};
let destination = '';
global.wx = {
  getStorageSync: key => storage[key], setStorageSync: (key, value) => { storage[key] = value; },
  removeStorageSync: key => { delete storage[key]; }, reLaunch: o => { destination = o.url; },
  hideLoading() {}, showLoading() {}, showToast() {}
};
const context = require('../utils/work-share-registration');
const redirect = '/pages/client/public-work/index?id=9&book=1';
storage.post_auth_redirect = redirect;
context.rememberShareRegistration({ shareWorkId: 9, shareChannel: 'wechat_moments', password: 'must-not-spread' }, redirect);
assert.equal(context.readShareRegistration().shareWorkId, 9);
assert.equal(context.readShareRegistration().password, undefined);
storage.post_auth_redirect = '/pages/client/home/index';
assert.deepEqual(context.readShareRegistration(), {}, '其它入口不继承注册归因');
storage.post_auth_redirect = redirect;
storage.work_share_registration.expiresAt = Date.now() - 1;
assert.deepEqual(context.readShareRegistration(), {}, '过期上下文不继续归因');
context.clearShareRegistration();

function page(name, api) {
  let definition;
  const file = path.join(__dirname, '../pages', name, 'index.js');
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    Page: p => { definition = p; }, require: name => api && name.includes('services/api') ? api : createRequire(file)(name), wx: global.wx,
    getApp: () => ({ setLogin() {} }), console, setTimeout: fn => fn()
  });
  return { ...definition, data: { ...definition.data }, setData(d) { Object.assign(this.data, d); } };
}
(async () => {
  const auth = { authenticated: true, role: 'client', accessToken: 'test', client: {}, roles: ['client'] };
  storage.post_auth_redirect = redirect;
  await page('register')._afterAuth(auth, 'client');
  assert.equal(destination, redirect, '密码注册结束回到原作品');
  storage.post_auth_redirect = redirect;
  await page('role-select')._handleSelectRoleResponse(auth);
  assert.equal(destination, redirect, '角色选择结束回到原作品');
  let needsOnboarding = true;
  const passwordPage = page('setup-password', { auth: { setupPassword: async () => ({ ...auth, needsOnboarding }) } });
  passwordPage.setData({ newPassword: 'testing123', confirmPassword: 'testing123' });
  storage.post_auth_redirect = redirect;
  await passwordPage.handleSubmit();
  assert.equal(destination, '/pages/onboarding/index');
  assert.equal(storage.post_auth_redirect, redirect, '资料完善前不能提前消费作品回跳');
  needsOnboarding = false;
  passwordPage.setData({ loading: false });
  await passwordPage.handleSubmit();
  assert.equal(destination, redirect, '设置密码完成且无需资料完善时回到原作品');
  storage.post_auth_redirect = redirect;
  page('onboarding')._goHome();
  assert.equal(destination, redirect, '资料引导结束回到原作品');
  assert.equal(storage.post_auth_redirect, undefined, '回跳只消费一次');
  console.log('注册来源时效、字段白名单和多阶段回跳测试通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
