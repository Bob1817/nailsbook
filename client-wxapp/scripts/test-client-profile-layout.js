const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const template = read('pages/client/profile/index.wxml');
const script = read('pages/client/profile/index.js');
const styles = read('pages/client/profile/index.wxss');
const config = JSON.parse(read('pages/client/profile/index.json'));
assert(!template.includes('PROFILE'));
assert(!template.includes('class="menu-copy"'));
assert(!template.includes('class="menu-desc"'));
assert(!template.includes('class="role-card"'), '独立身份切换卡片已并入账户信息');
assert(template.includes('<text class="section-title">账户信息</text>'));
assert(template.includes('bindtap="switchRole"') && template.includes('切换角色'));
assert(template.includes('bindtap="switchAccount"') && template.includes('切换账号'));
assert(template.includes('class="menu-item account-logout"'), '退出登录与账户切换保持同级');
assert(template.indexOf('class="page-hero"') < template.indexOf('<scroll-view'));
assert(!template.includes('profile-grid'));
assert(!template.includes('artist-book'));
assert(!template.includes('服务城市 · {{item.city}}'));
assert(!template.includes('city-icon'));
assert(template.includes('previewTechnicians'));
assert(template.includes('bindtap="manageTechnicians"'));
assert(!template.includes('wx:for="{{technicians}}"'));
assert(template.includes('class="tech-preview-list"'));
assert(template.includes('class="tech-default-badge"'));
assert(template.includes('catchtap="quickBookTechnician"'));
assert(template.includes('class="growth-grid"'));
assert(template.includes('growth.completedVisits'));
assert(template.includes('growth.nextLevel.remainingVisits'));
assert(template.includes('item.statusLabel'));
assert(template.includes('{{previewSummary}}'));
assert(styles.includes('min-height: 136rpx'));
assert(styles.includes('min-height: 44px'));
assert(styles.includes('.tech-quick-book'));
assert(styles.includes('grid-template-columns: repeat(4'));
const manager = read('pages/client/my-technicians/index.wxml');
assert(manager.includes('bindtap="callTechnician"'));
assert(manager.includes('bindtap="messageTechnician"'));
assert(manager.includes('bindtap="bookTechnician"'));
assert(manager.includes('bindtap="setDefaultTech"'));
assert(manager.includes('bindtap="unbindTechnician"'));
assert(read('pages/client/my-technicians/index.js').includes('未完成预约将一并取消'));
assert(styles.includes('.tech-quick-action'));
assert(styles.includes('min-height: 88rpx'));
assert(styles.includes('对齐美甲师端的紧凑文字与图标层级'));
assert(styles.includes('font-size: var(--font-sm)'));
assert(styles.includes('width: 64rpx'));
assert(styles.includes('.m-icon { width: 40rpx; height: 40rpx; }'));
assert(styles.includes('font-size: var(--font-lg)'));
assert(styles.includes('font-size: var(--font-md)'));
assert(styles.includes('flex: 0 0 116rpx'));
assert(styles.includes('align-items: flex-start; text-align: left'));
assert(manager.includes('class="modal-content" catchtap="preventBubble"'), '绑定弹窗内容必须截断遮罩点击事件');
assert(manager.includes('<form-field\n        label="邀请码"'), '邀请码必须使用基础输入框组件');
assert(manager.includes('icon="/static/icons/key.svg"'), '邀请码输入框必须显示类型图标');
assert(manager.includes('<action-button\n        wx:if="{{bindMode === \'invite\'}}"'), '邀请码绑定必须使用基础按钮组件');
assert(manager.includes('disabled="{{!foundTech}}"'), '未识别美甲师时基础按钮必须禁用');
assert.equal(JSON.parse(read('pages/client/my-technicians/index.json')).usingComponents['form-field'], '/components/form-field/index');
assert.equal(JSON.parse(read('pages/client/my-technicians/index.json')).usingComponents['action-button'], '/components/action-button/index');
let definition;
let confirmed = false;
const navigation = [];
const file = path.join(root, 'pages/client/profile/index.js');
vm.runInNewContext(read('pages/client/profile/index.js'), {
  Page: value => { definition = value; }, require: createRequire(file), console,
  wx: { navigateTo: value => navigation.push(value.url), showModal: async () => ({ confirm: confirmed }) }
});
for (const match of template.matchAll(/(?:bindtap|catchtap|bindinput)="([A-Za-z]\w*)"/g)) {
  assert.equal(typeof definition[match[1]], 'function', match[1] + '事件存在');
}
(async () => {
  for (const [handler, route] of Object.entries({
    editProfile: 'settings', navigateToOrders: 'orders', navigateToArchive: 'beauty-archive',
    navigateToDesigns: 'designs', navigateToFavorites: 'my-favorites', navigateToLikes: 'my-likes',
    navigateToFeedback: 'feedback', navigateToManual: 'manual', navigateToPassword: 'forgot-password'
  })) {
    definition[handler]();
    assert.equal(navigation.pop(), '/pages/client/' + route + '/index');
  }
  await definition.requestAccountDeletion();
  assert.equal(navigation.pop(), '/pages/account-deletion/index', '进入独立注销申请页面，由页面明确确认');
  for (const match of template.matchAll(/src="(\/static\/icons\/[^{}"]+)"/g)) {
    assert(fs.existsSync(path.join(root, match[1])));
  }
  console.log('个人中心统一层级、入口事件与注销确认检查通过');
})().catch(error => { console.error(error); process.exitCode = 1; });

// 头像验证必须在上传前完成；失败不替换当前头像。
(async () => {
  let avatarPage, uploaded = 0, saved = 0, message = '';
  let size = 1024, type = 'png', failSave = false;
  const storage = { role: 'client', userInfo: { nickname: '客户' }, client_userInfo: {} };
  vm.runInNewContext(read('pages/client/profile/index.js'), {
    Page: p => { avatarPage = p; }, console,
    require: name => name.includes('services/api') ? {
      upload: { image: async () => { uploaded++; return { url: 'https://example.test/avatar.png' }; } },
      client: { profile: { update: async () => { if (failSave) throw new Error('保存失败'); saved++; } } }
    } : name.includes('utils/avatar') ? {
      syncSessionAvatar: (role, avatarUrl) => {
        storage[`${role}_userInfo`] = { ...(storage[`${role}_userInfo`] || {}), avatarUrl };
        if (storage.role === role) storage.userInfo = { ...(storage.userInfo || {}), avatarUrl };
      }
    } : {},
    wx: {
      getFileSystemManager: () => ({ getFileInfo: options => options.success({ size }) }),
      getImageInfo: options => options.success({ type }),
      getStorageSync: key => storage[key], setStorageSync: (key, value) => { storage[key] = value; },
      showToast() {}, showModal: options => { message = options.content; }
    }
  });
  avatarPage.setData = value => Object.assign(avatarPage.data, value);
  size = 5 * 1024 * 1024 + 1;
  const avatarEvent = { detail: { avatarUrl: '/test.png' } };
  await avatarPage.chooseAvatar(avatarEvent); assert.equal(uploaded, 0); assert(message.includes('5MB'));
  size = 1024; type = 'gif';
  await avatarPage.chooseAvatar(avatarEvent); assert.equal(uploaded, 0); assert(message.includes('格式'));
  type = 'png'; failSave = true;
  await avatarPage.chooseAvatar(avatarEvent); assert.equal(avatarPage.data.avatar, ''); assert.equal(saved, 0);
  failSave = false;
  await avatarPage.chooseAvatar(avatarEvent); assert.equal(saved, 1);
  assert.equal(storage.userInfo.avatarUrl, avatarPage.data.avatar);
  assert.equal(storage.client_userInfo.avatarUrl, avatarPage.data.avatar);
  assert(template.includes('open-type="chooseAvatar"'));
  assert(template.includes('bindchooseavatar="chooseAvatar"'));
  assert(!read('pages/client/settings/index.wxml').includes('chooseAvatar'));
  assert(!read('pages/client/settings/index.js').includes('avatarUrl'));
  console.log('头像格式、大小、失败保留原头像及独立入口检查通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
