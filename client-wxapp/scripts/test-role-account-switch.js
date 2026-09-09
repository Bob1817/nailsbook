const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const clientWxml = read('pages/client/profile/index.wxml');
const techWxml = read('pages/technician/profile/index.wxml');

assert(!clientWxml.includes('class="role-card"'));
assert(!clientWxml.includes('role-tag">客户'));
assert(techWxml.includes('class="role-tag">美甲师</text>'));
for (const markup of [clientWxml, techWxml]) {
  assert(markup.includes('bindtap="switchRole"'));
  assert(markup.includes('bindtap="switchAccount"'));
  assert(markup.includes('class="menu-item account-logout"'));
}

let definition;
let loginResult = null;
let switched = false;
let loggedOut = 0;
const storage = {};
const api = {
  technician: {
    auth: {
      getUserInfo: async () => ({}),
      switchToClient: async () => ({
        accessToken: 'client-token',
        refreshToken: 'client-refresh',
        client: { id: 11, nickname: '客户' },
        roles: ['client', 'technician'],
      }),
    },
  },
};
const app = {
  switchRole: () => switched,
  setLogin: (...args) => { loginResult = args; },
  logout: () => { loggedOut += 1; },
};
const file = path.join(root, 'pages/technician/profile/index.js');
vm.runInNewContext(read('pages/technician/profile/index.js'), {
  Page: (value) => { definition = value; },
  require: (name) => name.includes('services/api') ? api : require(path.resolve(path.dirname(file), name)),
  getApp: () => app,
  wx: {
    getStorageSync: () => ({}),
    setStorageSync: (key, value) => { storage[key] = value; },
    showLoading() {}, hideLoading() {}, showToast() {},
    reLaunch: ({ url }) => { storage.route = url; },
    showModal: ({ success }) => success({ confirm: true }),
  },
});

(async () => {
  await definition.switchRole.call({ _switchingRole: false });
  assert.deepEqual(loginResult, ['client', 'client-token', { id: 11, nickname: '客户' }, ['client', 'technician']]);
  assert.equal(storage.client_refreshToken, 'client-refresh');
  assert.equal(storage.route, '/pages/client/home/index');

  switched = true;
  loginResult = null;
  await definition.switchRole.call({ _switchingRole: false });
  assert.equal(loginResult, null, '已有客户会话时直接切换，不重复请求登录态');

  definition.switchAccount();
  assert.equal(loggedOut, 1);
  assert.equal(storage.route, '/pages/login/index');
  console.log('客户与美甲师角色标识、角色切换、账号切换和退出入口检查通过');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
