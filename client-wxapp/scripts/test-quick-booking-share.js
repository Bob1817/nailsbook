const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const storage = {}, calls = [];
let destination = '', scene = 1001, enabled = true, definition;
const wx = {
  getStorageSync: key => storage[key], setStorageSync: (key, value) => { storage[key] = value; },
  hideShareMenu() {}, showShareMenu: args => calls.push(args),
  getLaunchOptionsSync: () => ({ scene }),
  navigateTo: args => { destination = args.url; }, showModal: args => calls.push(args), showToast: args => calls.push(args)
};
global.wx = wx;
const api = {
  public: { artists: { detail: async () => ({ artist: { id: 7, name: '测试美甲师', invitationCode: 'INVITE7', acceptingBookings: true } }) }, bookingSettings: async () => ({ quickBookingEnabled: enabled }) },
  client: { profile: { bindQuickBooking: async (...args) => calls.push(args) } },
  technician: { bookingDays: { updateSettings: async value => calls.push(value) } }
};
const file = path.join(__dirname, '../pages/client/quick-booking/index.js');
vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
  Page: value => { definition = value; }, wx,
  require: name => name.includes('services/api') ? api : createRequire(file)(name)
});
const page = () => ({ ...definition, techId: 7, inviteCode: 'INVITE7', data: { ...definition.data }, setData(data) { Object.assign(this.data, data); } });
(async () => {
  const guest = page();
  await guest.loadArtist();
  assert.equal(guest.data.artist.name, '测试美甲师');
  assert.equal(calls.some(call => Array.isArray(call)), false, 'preview must not bind');
  const share = guest.onShareAppMessage();
  assert.match(share.path, /techId=7&invite=INVITE7/);
  assert.ok(!share.path.includes('tool='), 'owner mode must not propagate');
  assert.equal(guest.onShareTimeline().query, 'techId=7&invite=INVITE7');
  guest.viewArtistHome();
  assert.equal(destination, '/pages/client/artist-home/index?id=7&source=quick_booking');
  const owner = page();
  owner.data.owner = true; owner.data.artist = { acceptingBookings: true }; owner.data.acceptingBookings = true;
  await owner.onAvailabilityChange({ detail: { value: true } });
  assert.equal(owner.data.enabled, true, '美甲师本人可以开放一键预约');
  assert.equal(calls.at(-2).quickBookingEnabled, true);
  await guest.bookNow();
  assert.match(destination, /^\/pages\/login\/index\?/);
  assert.match(destination, /invite=INVITE7/);
  assert.match(destination, /quickBookingTechId=7/);
  assert.equal(storage.post_auth_redirect, '/pages/client/create-order/index?techId=7&mode=quick&source=quick_booking');
  destination = ''; scene = 1154;
  await guest.bookNow();
  assert.equal(destination, '');
  assert.equal(calls.at(-1).title, '进入小程序预约');
  scene = 1001; storage.role = 'client'; storage.client_token = 'test-token';
  await guest.bookNow();
  assert.deepEqual(calls.at(-1), [7, 'INVITE7']);
  assert.match(destination, /create-order\/index\?techId=7/);
  assert.match(destination, /mode=quick/);
  destination = ''; enabled = false;
  await guest.loadArtist(); await guest.bookNow();
  assert.equal(destination, '', 'disabled feature must not open booking');
  api.public.bookingSettings = async () => { throw { code: 404, bookingSettingsUnsupported: true }; };
  const notDeployed = page();
  await notDeployed.loadArtist();
  assert.equal(notDeployed.data.artist.name, '测试美甲师');
  assert.equal(notDeployed.data.enabled, false);
  assert.equal(notDeployed.data.error, '');
  api.public.bookingSettings = async () => { throw { code: 500, message: '服务异常' }; };
  await notDeployed.loadArtist();
  assert.equal(notDeployed.data.error, '服务异常', 'do not hide genuine service failures');
  api.public.bookingSettings = async () => ({ quickBookingEnabled: false });
  const invalid = page(); invalid.inviteCode = 'OTHER';
  await invalid.loadArtist();
  assert.equal(invalid.data.artist, null);
  assert.match(invalid.data.error, /失效/);
  // Exercise the existing login page with the new context, including its final redirect.
  const loginFile = path.join(__dirname, '../pages/login/index.js');
  let loginDefinition, completed;
  wx.showLoading = wx.hideLoading = () => {};
  wx.removeStorageSync = key => { delete storage[key]; };
  wx.reLaunch = args => { destination = args.url; };
  api.auth = { completeWechatClient: async data => {
    completed = data;
    return { authenticated: true, accessToken: 'new-client-token', client: { id: 12 } };
  } };
  vm.runInNewContext(fs.readFileSync(loginFile, 'utf8'), {
    Page: value => { loginDefinition = value; }, wx,
    getApp: () => ({ setLogin(role, token) { storage.role = role; storage.client_token = token; } }),
    require: name => name.includes('services/api') ? api : name.includes('utils/privacy') ? {
      requireAgreement: () => true, requireWechatPrivacyAuthorization: async () => {}
    } : createRequire(loginFile)(name)
  });
  const login = { ...loginDefinition, data: { ...loginDefinition.data }, setData(data) { Object.assign(this.data, data); }, _prepareLogin() {}, _getWechatSession: async () => 'session' };
  login.onLoad({ invite: 'INVITE7', quickBookingTechId: '7', source: 'card', redirect: encodeURIComponent('/pages/client/create-order/index?techId=7&mode=quick&source=quick_booking') });
  await login.onWechatPhone({ detail: { code: 'phone-code' } });
  assert.equal(completed.quickBookingTechId, 7);
  assert.equal(completed.inviteCode, 'INVITE7');
  assert.equal(storage.client_token, 'new-client-token');
  assert.equal(destination, '/pages/client/create-order/index?techId=7&mode=quick&source=quick_booking');
  console.log('一键预约分享：游客预览、双渠道邀请码、登录返回、绑定、朋友圈单页及关闭开关检查通过。');
})().catch(err => { console.error(err); process.exitCode = 1; });
