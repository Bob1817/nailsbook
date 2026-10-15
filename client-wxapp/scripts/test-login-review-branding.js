const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const getPhoneNumberPages = [
  'pages/login/index.wxml',
  'pages/client/login/index.wxml',
  'pages/technician/login/index.wxml',
  'pages/client/forgot-password/index.wxml',
  'pages/technician/forgot-password/index.wxml',
  'pages/technician/set-password/index.wxml'
];

for (const file of getPhoneNumberPages) {
  const markup = read(file);
  assert(markup.includes('open-type="getPhoneNumber"'), `${file} 应保留手机号快速验证组件`);
  assert(!markup.includes('微信'), `${file} 的手机号验证前置页面不得使用“微信”字样`);
  assert(!markup.includes('wechat.svg'), `${file} 的手机号验证前置页面不得使用微信官方图标`);
}

const login = read('pages/login/index.wxml');
assert(login.includes('<text>快捷登录</text>'), '统一登录页主操作应明确为快捷登录');
assert(!login.includes('手机号快捷登录'), '统一登录页不应重复强调手机号快捷登录');
assert(login.indexOf('wechat-privacy-consent') > login.indexOf('<text>快捷登录</text>'), '隐私协议应紧随快捷登录按钮');
assert(login.indexOf('login-footer') > login.indexOf('wechat-privacy-consent'), '其他登录方式应位于主操作区之后的页面底部');
assert(!login.includes('<image class="wechat-btn-icon"'), '统一登录按钮不得伪装成平台官方按钮');

console.log('快捷登录审核文案、主操作布局与官方元素隔离检查通过');
