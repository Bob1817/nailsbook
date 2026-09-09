const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pages = [
  'pages/client/forgot-password',
  'pages/client/feedback',
  'pages/technician/forgot-password',
  'pages/technician/account-security',
  'pages/technician/profile-settings',
  'pages/technician/homepage-settings'
];

for (const page of pages) {
  const wxml = fs.readFileSync(path.join(root, page, 'index.wxml'), 'utf8');
  const config = JSON.parse(fs.readFileSync(path.join(root, page, 'index.json'), 'utf8'));
  assert(wxml.includes('<secondary-page-header'), page + ': 二三级页面必须使用统一主信息区');
  assert.strictEqual(config.usingComponents['secondary-page-header'], '/components/secondary-page-header/index', page + ': 未注册主信息区组件');
}

const headerCss = fs.readFileSync(path.join(root, 'components/secondary-page-header/index.wxss'), 'utf8');
assert(headerCss.includes('width: 100%'), 'secondary-page-header: 必须横向铺满');
assert(headerCss.includes('background: var(--nb-surface)'), 'secondary-page-header: 主信息区必须使用白色表面层');
assert(headerCss.includes('min-height: 168rpx'), 'secondary-page-header: 主信息区高度基线缺失');
console.log('二三级页面层级检查通过：6 个客户端/美甲师页面使用统一全宽主信息区。');
