const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const clientFallbackFiles = [
  'pages/technician/customers/index.wxml',
  'pages/technician/customer-detail/index.wxml',
  'pages/technician/order-detail/index.wxml',
  'pages/technician/chat-detail/index.wxml',
  'pages/technician/binding-applications/index.wxml',
];
const technicianFallbackFiles = [
  'pages/client/create-order/index.wxml',
  'pages/client/order-detail/index.wxml',
  'pages/client/design-detail/index.wxml',
  'pages/client/artist-home/index.wxml',
  'pages/client/works/index.wxml',
  'pages/client/profile/index.wxml',
  'pages/technician/profile/index.wxml',
  'pages/technician/profile-settings/index.wxml',
  'pages/technician/homepage-settings/index.wxml',
  'components/work-card/index.wxml',
];

for (const file of clientFallbackFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(source.includes('/static/icons/client.svg'), `${file} 缺少客户默认头像`);
}
for (const file of technicianFallbackFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(source.includes('/static/icons/technician.svg'), `${file} 缺少美甲师默认头像`);
}

const avatarUtil = require('../utils/avatar');
assert.strictEqual(avatarUtil.defaultAvatar('client'), '/static/icons/client.svg');
assert.strictEqual(avatarUtil.defaultAvatar('technician'), '/static/icons/technician.svg');

const clientProfile = fs.readFileSync(path.join(root, 'pages/client/profile/index.js'), 'utf8');
const technicianProfile = fs.readFileSync(path.join(root, 'pages/technician/profile-settings/index.js'), 'utf8');
const technicianProfileView = fs.readFileSync(path.join(root, 'pages/technician/profile-settings/index.wxml'), 'utf8');
const technicianProfileStyle = fs.readFileSync(path.join(root, 'pages/technician/profile-settings/index.wxss'), 'utf8');
assert.ok(clientProfile.includes("syncSessionAvatar('client'"), '客户头像上传后必须同步会话缓存');
assert.ok(technicianProfile.includes("syncSessionAvatar('technician'"), '美甲师头像保存后必须同步会话缓存');
assert.ok(technicianProfileView.includes('class="avatar-section') && technicianProfileView.includes('catchtap="chooseAvatar"') && technicianProfileView.includes('role="button"'), '美甲师头像入口必须使用全宽可点击控件');
assert.ok(technicianProfile.includes("typeof wx.chooseMedia === 'function'") && technicianProfile.includes('wx.chooseImage({'), '美甲师头像选择必须兼容新旧微信基础库');
assert.ok(technicianProfile.includes("title:'无法打开图片选择器'") && technicianProfile.includes("err.message || '头像上传失败'"), '美甲师头像选择或上传失败必须提供明确反馈');
assert.ok(/\.avatar-section\{[^}]*width:100%[^}]*min-height:112rpx[^}]*display:flex/.test(technicianProfileStyle), '美甲师头像控件必须覆盖整行并保持横向触控布局');

console.log('客户与美甲师默认头像、真实头像和会话同步检查通过');
