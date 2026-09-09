const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const cases = [
  {
    name: '客户登录',
    wxml: 'pages/client/login/index.wxml',
    wxss: 'pages/client/login/index.wxss',
    requiredControls: 5,
  },
  {
    name: '客户注册',
    wxml: 'pages/client/register/index.wxml',
    wxss: 'pages/client/register/index.wxss',
    requiredControls: 1,
  },
  {
    name: '美甲师登录',
    wxml: 'pages/technician/login/index.wxml',
    wxss: 'pages/technician/login/index.wxss',
    requiredControls: 7,
  },
  {
    name: '美甲师找回密码',
    wxml: 'pages/technician/forgot-password/index.wxml',
    wxss: 'pages/technician/forgot-password/index.wxss',
    requiredControls: 2,
  },
  {
    name: '统一登录',
    wxml: 'pages/login/index.wxml',
    wxss: 'pages/login/index.wxss',
    requiredControls: 2,
    inputRule: '.input-row {',
  },
  {
    name: '身份选择',
    wxml: 'pages/role-select/index.wxml',
    wxss: 'pages/role-select/index.wxss',
    requiredControls: 4,
  },
  {
    name: '统一注册',
    wxml: 'pages/register/index.wxml',
    wxss: 'pages/register/index.wxss',
    requiredControls: 1,
  },
  {
    name: '设置密码',
    wxml: 'pages/setup-password/index.wxml',
    wxss: 'pages/setup-password/index.wxss',
    requiredControls: 1,
    inputRule: '.input-row {',
  },
  {
    name: '新用户引导',
    wxml: 'pages/onboarding/index.wxml',
    wxss: 'pages/onboarding/index.wxss',
    requiredControls: 2,
    inputRule: '.flow-input {',
  },
  {
    name: '账号注销',
    wxml: 'pages/account-deletion/index.wxml',
    wxss: 'pages/account-deletion/index.wxss',
    requiredControls: 4,
    inputRule: '.deletion-input',
    requiresInputHeight: false,
  },
  {
    name: '美甲师设置密码',
    wxml: 'pages/technician/set-password/index.wxml',
    wxss: 'pages/technician/set-password/index.wxss',
    requiredControls: 2,
  },
  {
    name: '客户欢迎页',
    wxml: 'pages/client/welcome/index.wxml',
    wxss: 'pages/client/welcome/index.wxss',
    requiredControls: 2,
    inputRule: '.form-input {',
  },
];

for (const item of cases) {
  const wxml = read(item.wxml);
  const wxss = read(item.wxss);
  assert(wxml.includes('booking-action'), `${item.name}的交互按钮必须接入预约卡片按钮标准`);
  assert((wxml.match(/booking-action/g) || []).length >= item.requiredControls, `${item.name}不能遗漏分支按钮的统一样式`);
  const expectedImport = item.wxml.startsWith('pages/client/') || item.wxml.startsWith('pages/technician/')
    ? "@import '../../../styles/booking-actions.wxss';"
    : "@import '../../styles/booking-actions.wxss';";
  assert(wxss.includes(expectedImport), `${item.name}必须引入统一按钮样式`);
  assert(wxss.includes(item.inputRule || '.input {') && (!item.requiresInputHeight || wxss.includes('height: var(--input-height)')), `${item.name}输入框必须使用统一高度`);
  assert(wxss.includes('font-size: var(--font-sm)'), `${item.name}输入框和按钮文字必须使用标准字号`);
}

console.log('登录注册入口视觉规范检查通过');
