const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const {
  ONBOARDING_PLANS,
  getOnboardingCompletionKey
} = require('../utils/onboarding-plan');

assert.equal(ONBOARDING_PLANS.client.steps.length, 3);
assert.equal(ONBOARDING_PLANS.technician.steps.length, 3);
assert.deepEqual(
  ONBOARDING_PLANS.client.steps.map(step => step.title),
  ['发现心仪款式', '完成一次预约', '随时管理行程']
);
assert.deepEqual(
  ONBOARDING_PLANS.technician.steps.map(step => step.title),
  ['完善接单资料', '设置可预约时间', '开始经营客户']
);
assert.notEqual(getOnboardingCompletionKey('client'), getOnboardingCompletionKey('technician'));

const storage = {};
let destination = '';
global.wx = {
  getStorageSync: key => storage[key],
  setStorageSync: (key, value) => { storage[key] = value; },
  removeStorageSync: key => { delete storage[key]; },
  reLaunch: ({ url }) => { destination = url; }
};

function createPage() {
  let definition;
  const file = path.join(root, 'pages/onboarding/index.js');
  vm.runInNewContext(read('pages/onboarding/index.js'), {
    Page: value => { definition = value; },
    require: createRequire(file),
    wx: global.wx,
    console,
    Date,
    decodeURIComponent
  });
  return {
    ...definition,
    data: { ...definition.data },
    setData(update) { Object.assign(this.data, update); }
  };
}

const technicianPage = createPage();
technicianPage.onLoad({ role: 'technician' });
assert.equal(technicianPage.data.navigationTitle, '美甲师使用引导');
technicianPage.nextStep();
assert.equal(technicianPage.data.currentIndex, 1);
technicianPage.previousStep();
assert.equal(technicianPage.data.currentIndex, 0);
technicianPage.skipOnboarding();
assert.equal(destination, '/pages/technician/home/index');
assert.equal(storage.first_use_onboarding_v2_technician.skipped, true);

const clientPage = createPage();
const redirect = '/pages/client/public-work/index?id=9&book=1';
storage.post_auth_redirect = redirect;
clientPage.onLoad({ role: 'client' });
clientPage.finishOnboarding();
assert.equal(destination, redirect);
assert.equal(storage.post_auth_redirect, undefined, '客户回跳必须在引导结束后消费');
assert.equal(storage.first_use_onboarding_v2_client.skipped, false);

const register = read('pages/register/index.js');
const clientRegister = read('pages/client/register/index.js');
const clientLogin = read('pages/client/login/index.js');
const technicianLogin = read('pages/technician/login/index.js');
const technicianSetPassword = read('pages/technician/set-password/index.js');
const setupPassword = read('pages/setup-password/index.js');
const roleSelect = read('pages/role-select/index.js');
const login = read('pages/login/index.js');
const app = read('app.js');
assert(register.includes('/pages/onboarding/index?role=${role}'), '统一注册后必须进入角色引导');
assert(clientRegister.includes('/pages/onboarding/index?role=client'), '兼容客户注册页必须进入客户引导');
assert(clientLogin.includes('res.isNewUser === true'), '兼容客户微信注册必须识别新用户');
assert(technicianLogin.includes('this._afterAuth(res, true);'), '美甲师密钥注册后必须进入引导');
assert(technicianLogin.includes('this._afterAuth(res, step === \'register\');'), '微信美甲师仅在注册阶段进入引导');
assert(technicianSetPassword.includes('/pages/onboarding/index?role=technician'), '美甲师首次设置密码后必须进入引导');
assert(setupPassword.includes('/pages/onboarding/index?role=client'));
assert(roleSelect.includes('/pages/onboarding/index?role=client'));
assert(roleSelect.includes('/pages/onboarding/index?role=technician'));
assert(login.includes('res.isNewUser === true'));
assert(!login.includes('res.needsOnboarding ||'), '无绑定的老客户不能被误判为首次注册');
assert(app.includes("options.path === 'pages/onboarding/index'"), '冷启动恢复不能跳过未完成的引导');

const wxml = read('pages/onboarding/index.wxml');
const wxss = read('pages/onboarding/index.wxss');
const bookingActions = read('styles/booking-actions.wxss');
for (const control of ['skipOnboarding', 'previousStep', 'nextStep']) {
  assert(wxml.includes(`bindtap="${control}"`), `缺少 ${control} 操作`);
}
assert(wxss.includes('min-height: var(--touch-min)'), '顶部操作必须满足 44px 触控高度');
assert(bookingActions.includes('min-height: 44px'), '底部操作必须满足 44px 触控高度');
assert(wxss.includes('env(safe-area-inset-bottom)'), '底部操作必须适配安全区');
assert(wxss.includes('position: fixed'), '底部主操作必须固定在首屏可见区域');
assert(wxss.includes("@import '../../styles/booking-actions.wxss';"));

console.log('首次注册客户与美甲师角色化引导、入口和完成出口检查通过');
