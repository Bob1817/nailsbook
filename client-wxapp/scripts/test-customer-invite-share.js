const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'pages/technician/customers/index.js'), 'utf8');
const wxml = fs.readFileSync(path.join(root, 'pages/technician/customers/index.wxml'), 'utf8');

assert.match(wxml, /<button[^>]*open-type="share"[^>]*aria-label="发送客户注册链接给微信好友"/, '邀请入口必须使用微信原生分享按钮');
assert.match(wxml, /wx:if="\{\{inviteCode\}\}"/, '只有取得有效邀请码后才能启用分享按钮');

let page;
vm.runInNewContext(js, {
  require(id) {
    if (id.includes('colors')) return { page: '#fff', action: '#111', secondary: '#666' };
    return {};
  },
  Page(config) { page = config; },
  console,
  Date,
  Number,
  String,
  JSON,
  Promise,
  setTimeout,
  clearTimeout,
  wx: {}
});

const context = {
  data: {
    inviteCode: 'AB&C1234',
    inviteName: '贝贝',
    inviteAvatarUrl: 'https://example.com/avatar.jpg'
  }
};
const share = page.onShareAppMessage.call(context);
assert.equal(share.title, '贝贝邀请你成为专属客户');
assert.equal(share.path, '/pages/login/index?invite=AB%26C1234&source=invite');
assert.equal(share.imageUrl, 'https://example.com/avatar.jpg');

console.log('Customer invite share checks passed.');
