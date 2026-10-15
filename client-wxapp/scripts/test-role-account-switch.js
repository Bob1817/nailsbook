const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const clientWxml = read('pages/client/profile/index.wxml');
const techWxml = read('pages/technician/profile/index.wxml');
const techWxss = read('pages/technician/profile/index.wxss');

assert(!clientWxml.includes('class="role-card"'));
assert(!clientWxml.includes('role-tag">客户'));
assert(techWxml.includes('class="role-tag">美甲师</text>'));
for (const markup of [clientWxml, techWxml]) {
  assert(!markup.includes('bindtap="switchRole"'));
  assert(!markup.includes('切换角色'));
  assert(markup.includes('bindtap="switchAccount"'));
}
assert(clientWxml.includes('class="logout-btn" bindtap="logout"'), '客户端退出登录应独立置于页面底部');
assert(!techWxml.includes('class="menu-item account-logout"'), '美甲师端退出登录不应混在账号设置列表中');
assert(techWxml.includes('class="logout-btn" bindtap="logout"'), '美甲师端退出登录应独立置于页面底部');
assert(techWxml.indexOf('class="version"') > techWxml.indexOf('class="logout-btn"'), '美甲师端版本信息应位于退出登录下方的页面最底部');
assert(/\.logout-btn\s*\{[^}]*margin:\s*32rpx 32rpx 0[^}]*min-height:\s*88rpx[^}]*background:\s*var\(--nb-surface\)/s.test(techWxss), '美甲师端退出按钮应复用客户端的独立卡片间距、触控高度和背景');

let definition;
let loggedOut = 0;
const storage = {};
const api = {
  technician: {
    auth: {
      getUserInfo: async () => ({}),
    },
  },
};
const app = {
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

(() => {
  assert.equal(definition.switchRole, undefined, '美甲师端不再提供角色切换方法');
  definition.setData = (values) => Object.assign(definition.data, values);
  definition.switchAccount();
  assert.equal(definition.data.showSwitchAccountDialog, true, '点击切换账号应先展示项目统一确认弹窗');
  assert.equal(loggedOut, 0, '展示确认弹窗时不能直接退出登录');
  definition.confirmSwitchAccount();
  assert.equal(loggedOut, 1);
  assert.equal(storage.route, '/pages/login/index');
  assert(techWxml.includes('class="account-dialog-title">切换账号</text>'), '切换账号弹窗应提供独立标题层级');
  assert(techWxml.includes('class="account-dialog-copy"'), '切换账号弹窗应提供独立正文层级');
  assert(techWxml.includes('class="account-dialog-button account-dialog-confirm"'), '切换账号弹窗应提供统一主操作');
  assert(/\.account-dialog-title\s*\{[^}]*font-size:\s*var\(--font-lg\)[^}]*font-weight:\s*var\(--weight-semibold\)/s.test(techWxss), '弹窗标题应使用标题字号和半粗字重');
  assert(/\.account-dialog-copy\s*\{[^}]*font-size:\s*var\(--font-sm\)[^}]*font-weight:\s*var\(--weight-normal\)/s.test(techWxss), '弹窗正文应使用正文级字号和常规字重');
  assert(/\.account-dialog-button\s*\{[^}]*min-height:\s*44px[^}]*font-size:\s*var\(--font-sm\)/s.test(techWxss), '弹窗按钮应使用正文级字号和 44px 触控高度');
  assert(!read('app.js').includes('switchRole('), '应用层不再提供角色切换方法');
  assert(!read('services/api.js').includes('switchToClient:'), '接口层不再提供切换到客户身份的方法');
  assert(!read('services/api.js').includes('selectRole:'), '接口层不再提供补全角色的方法');
  assert(!read('services/api.js').includes('activateTechnician:'), '接口层不再允许客户账号激活美甲师身份');
  console.log('单手机号单角色、账号切换和退出入口检查通过');
})();
