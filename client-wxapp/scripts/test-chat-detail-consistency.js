const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const clientWxml = read('pages/client/chat-detail/index.wxml');
const clientWxss = read('pages/client/chat-detail/index.wxss');
const technicianWxml = read('pages/technician/chat-detail/index.wxml');
const technicianWxss = read('pages/technician/chat-detail/index.wxss');

for (const markup of [clientWxml, technicianWxml]) {
  assert(markup.includes('empty-chat-card'), '对话页应使用统一的空状态卡片');
  assert(markup.includes('empty-avatar-image'), '空状态应展示对话对象头像');
  assert(markup.includes('empty-action-icon'), '空状态操作应使用项目图标');
  assert(!markup.includes('empty-icon-dot'), '不应保留粗糙的空状态圆点');
}

assert(clientWxml.includes('bindtap="onPickImage"'), '客户端应保留发送图片入口');
assert(clientWxml.includes('bindtap="goCreateBooking"'), '客户端应保留预约入口');
assert(clientWxml.includes('/static/icons/more-horizontal.svg'), '客户端输入区应使用标准更多图标');
assert(clientWxml.includes('/static/icons/calendar.svg'), '客户端输入区应使用标准预约图标');
assert(technicianWxml.includes('class="attachment-btn" bindtap="sendImage"'), '美甲师端输入区应提供图片入口');

for (const styles of [clientWxss, technicianWxss]) {
  assert(/\.input-field-wrap\s*\{[^}]*height:\s*88rpx/s.test(styles), '输入框触控高度应为 88rpx');
  assert(/\.empty-action\s*\{[^}]*min-height:\s*88rpx/s.test(styles), '空状态操作应满足触控高度');
  assert(/\.avatar-img, \.avatar-placeholder, \.avatar-self\s*\{[^}]*width:\s*64rpx;[^}]*height:\s*64rpx/s.test(styles), '两端消息头像规格应一致');
  assert(/\.bubble-right\s*\{[^}]*background:\s*var\(--nb-action\);[^}]*box-shadow:\s*none/s.test(styles), '发送气泡应使用统一主操作样式');
  assert(!/^\+$/m.test(styles), 'WXSS 不应包含无效字符');
}

console.log('对话页一致性检查通过');
