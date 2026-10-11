const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const technicianChatWxml = read('pages/technician/chat/index.wxml');
const technicianChatWxss = read('pages/technician/chat/index.wxss');
const clientChatWxml = read('pages/client/chat/index.wxml');
const tabBarWxml = read('components/tab-bar/index.wxml');
const tabBarJs = read('components/tab-bar/index.js');
const tabBarWxss = read('components/tab-bar/index.wxss');

assert.match(technicianChatWxss, /\.msg-unread-dot\s*\{[^}]*background:\s*var\(--nb-danger\);/s, '消息列表未读点必须使用语义红色');
assert.match(technicianChatWxml, /class="msg-avatar-wrap"[\s\S]*class="msg-unread-dot"[\s\S]*class="msg-body"/, '消息列表未读点必须叠放在头像或类型图标上');
assert.match(technicianChatWxss, /\.msg-unread-dot\s*\{[^}]*position:\s*absolute;[^}]*border:\s*4rpx\s+solid\s+var\(--nb-surface\);/s, '消息列表未读点必须使用带白色描边的右上角悬浮样式');
assert(technicianChatWxml.includes('unread-count="{{unreadCount}}"'), '美甲师消息页必须同步未读数到底部菜单');
assert(clientChatWxml.includes('unread-count="{{unreadCount}}"'), '客户消息页必须同步未读数到底部菜单');
assert(tabBarWxml.includes("item.key === 'chat' && messageBadge") && tabBarWxml.includes('{{messageBadge}}'), '底部消息菜单必须展示未读角标');
assert(tabBarJs.includes("normalized > 99 ? '99+'") && tabBarJs.includes('refreshUnreadCount()'), '底部菜单必须刷新未读数并将上限显示为 99+');
assert(tabBarJs.includes('messageUnreadCounts') && tabBarJs.includes('_message_unread_count'), '消息页未读数必须按角色在其他主菜单间共享');
assert(tabBarJs.includes('Math.max(count, this.getCachedUnreadCount(role))'), '会话摘要不得把消息页已计算的未读数错误清零');
assert.match(tabBarWxss, /\.tab-unread-badge\s*\{[^}]*background:\s*var\(--nb-danger\);[^}]*color:\s*var\(--nb-inverse\);/s, '底部未读角标必须使用红底反白文字');

let componentConfig;
const storage = {};
const app = { globalData: { role: 'technician' } };
vm.runInNewContext(tabBarJs, {
  require: () => ({ chat: { technician: { conversations: () => Promise.resolve([]) }, conversations: () => Promise.resolve([]) } }),
  Component: (config) => { componentConfig = config; },
  getApp: () => app,
  wx: {
    getStorageSync: (key) => storage[key],
    setStorageSync: (key, value) => { storage[key] = value; }
  },
  Promise,
  Math,
  Number,
  String,
  Object
});
const instance = {
  data: { messageBadge: '' },
  setData(patch) { Object.assign(this.data, patch); }
};
Object.assign(instance, componentConfig.methods);
instance.setMessageBadge(120, 'technician');
assert.equal(instance.data.messageBadge, '99+', '超过 99 条时必须显示 99+');
assert.equal(storage.technician_message_unread_count, 120, '未读数必须缓存供其他菜单复用');
assert.equal(instance.getCachedUnreadCount('technician'), 120, '其他菜单必须读取消息页缓存的未读数');
instance.setMessageBadge(0, 'technician');
assert.equal(instance.data.messageBadge, '', '未读清零后必须隐藏角标');

console.log('Message unread dot and tab badge checks passed.');
