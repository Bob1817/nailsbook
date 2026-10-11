const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const loginJs = read('pages/login/index.js');
const clientLoginJs = read('pages/client/login/index.js');
const discoverJs = read('pages/client/discover/index.js');
const homeJs = read('pages/client/home/index.js');
const homeWxml = read('pages/client/home/index.wxml');
const createOrderJs = read('pages/client/create-order/index.js');
const wechatService = fs.readFileSync(path.join(root, '../backend/src/wechat-auth/wechat-auth.service.ts'), 'utf8');

assert(loginJs.includes('needsRegistration'), '统一登录页必须处理未注册分支');
assert(loginJs.includes('/pages/register/index?phone='), '未注册应跳转注册页并携带手机号');
assert(clientLoginJs.includes('needsRegistration'), '客户登录页必须处理未注册分支');
assert(wechatService.includes('needsRegistration: true'), '后端未注册须返回 needsRegistration 而非仅抛错');
assert(!wechatService.includes("throw new BadRequestException('新客户仅可通过美甲师邀请链接注册')"), '未注册不再用异常拦截微信授权');

assert(discoverJs.includes('/pages/client/my-technicians/index'), '发现页空态应引导到我的美甲师');
assert(homeJs.includes('goBindTech') && homeJs.includes('/pages/client/my-technicians/index'), '首页空态应引导到我的美甲师');
assert(homeWxml.includes('goBindTech'), '首页空态必须有绑定入口');
assert(createOrderJs.includes('/pages/client/my-technicians/index'), '无绑定预约应引导到我的美甲师');
assert(!/无绑定美甲师 → 强制弹出绑定弹窗/.test(createOrderJs), '无绑定不再只弹绑定框拦截');

assert(loginJs.includes('client_bindings') && loginJs.includes('removeStorageSync'), '登录无绑定时清理本地绑定缓存且不拦截');

// 行为：无绑定登录成功进入首页，不抛「未绑定」
(async () => {
  let page, reLaunchUrl = '';
  const storage = {};
  global.wx = {
    setStorageSync: (k, v) => { storage[k] = v; },
    getStorageSync: (k) => storage[k],
    removeStorageSync: (k) => { delete storage[k]; },
    reLaunch: ({ url }) => { reLaunchUrl = url; },
    hideLoading() {}, showLoading() {}, showToast() {}, showModal() {}
  };
  vm.runInNewContext(loginJs, {
    Page: (p) => { page = p; },
    require: (name) => {
      if (name.includes('services/api')) return { auth: {}, client: { profile: {}, referrals: { claim: async () => {} } } };
      if (name.includes('privacy')) return { requireAgreement: () => true, requireWechatPrivacyAuthorization: async () => {} };
      if (name.includes('artist-navigation')) return {
        consumePostAuthRedirect: (p) => p,
        rememberPostAuthRedirect: () => {},
        normalizeInternalPath: (p) => p || ''
      };
      if (name.includes('client-profile-completion')) return {
        needsClientProfile: (user) => !user.avatarUrl || !user.nickname || user.nickname === user.phone,
        completionUrl: (next) => `/pages/client/profile-completion/index?next=${encodeURIComponent(next)}`
      };
      return {};
    },
    getApp: () => ({ setLogin() {}, globalData: {}, loadCapabilities: async () => ({}) }),
    wx: global.wx, console, Promise, setTimeout: (fn) => fn()
  });
  page.setData = (d) => Object.assign(page.data, d);
  page.redirect = '/pages/client/home/index';
  await page._afterAuth({
    accessToken: 't',
    refreshToken: 'r',
    roles: ['client'],
    client: { id: 1, phone: '13900000000', nickname: '测试客户', avatarUrl: '/uploads/client.webp' },
    technicians: [],
    technician: null
  }, 'client');
  assert.equal(reLaunchUrl, '/pages/client/home/index', '无绑定登录应进入首页');
  assert.equal(storage.client_bindings, undefined, '无绑定时不得写入绑定缓存');
  console.log('微信登录注册与无绑定引导检查通过');
})().catch((e) => { console.error(e); process.exit(1); });
