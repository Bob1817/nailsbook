const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const profileRules = require('../utils/client-profile-completion');

assert.equal(profileRules.needsClientProfile({ phone: '13800138000', nickname: '13800138000', avatarUrl: null }), true);
assert.equal(profileRules.needsClientProfile({ phone: '13800138000', nickname: '小美', avatarUrl: '/uploads/a.webp' }), false);
assert.equal(
  profileRules.completionUrl('/pages/client/home/index'),
  '/pages/client/profile-completion/index?next=%2Fpages%2Fclient%2Fhome%2Findex'
);

const appConfig = JSON.parse(read('app.json'));
const clientPackage = appConfig.subPackages.find(item => item.root === 'pages/client');
assert(clientPackage.pages.includes('profile-completion/index'), '资料完善页必须注册到客户分包');

const wxml = read('pages/client/profile-completion/index.wxml');
assert(wxml.includes('open-type="chooseAvatar"'), '头像必须使用微信原生头像选择能力');
assert(wxml.includes('type="nickname"'), '昵称必须使用微信原生昵称输入能力');
[
  'pages/login/index.js',
  'pages/register/index.js',
  'pages/setup-password/index.js',
  'pages/role-select/index.js',
  'pages/client/login/index.js',
  'pages/client/register/index.js'
].forEach(file => {
  const source = read(file);
  assert(source.includes('needsClientProfile') && source.includes('completionUrl'), `${file} 必须接入客户资料补全流程`);
});

let page;
let profilePayload;
let redirectUrl = '';
let loginUser;
const storage = {
  client_userInfo: { phone: '13800138000', nickname: '13800138000', avatarUrl: null },
  client_token: 'token',
  roles: ['client']
};
const app = {
  globalData: { userInfo: storage.client_userInfo, token: 'token', roles: ['client'] },
  setLogin(role, token, user) { loginUser = user; }
};

vm.runInNewContext(read('pages/client/profile-completion/index.js'), {
  Page: definition => { page = definition; },
  getApp: () => app,
  wx: {
    getStorageSync: key => storage[key],
    showLoading() {},
    hideLoading() {},
    showToast() {},
    reLaunch: ({ url }) => { redirectUrl = url; }
  },
  require: request => {
    if (request.includes('services/api')) {
      return {
        upload: { image: async () => ({ url: '/uploads/wechat-avatar.webp' }) },
        client: { profile: { update: async payload => {
          profilePayload = payload;
          return { ...storage.client_userInfo, ...payload };
        } } }
      };
    }
    if (request.includes('client-profile-completion')) return profileRules;
    if (request.includes('artist-navigation')) return { normalizeInternalPath: value => value };
    throw new Error(`unexpected require: ${request}`);
  },
  console
});

page.setData = data => Object.assign(page.data, data);
page.onLoad({ next: encodeURIComponent('/pages/client/home/index') });
assert.equal(page.data.nickname, '', '手机号不得继续作为昵称预填');
page.onChooseAvatar({ detail: { avatarUrl: 'wxfile://avatar' } });
page.onNicknameInput({ detail: { value: '微信昵称' } });

(async () => {
  await page.saveProfile();
  assert.equal(profilePayload.nickname, '微信昵称');
  assert.equal(profilePayload.avatarUrl, '/uploads/wechat-avatar.webp');
  assert.equal(loginUser.nickname, '微信昵称');
  assert.equal(redirectUrl, '/pages/client/home/index');
  console.log('客户微信资料授权补全检查通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
