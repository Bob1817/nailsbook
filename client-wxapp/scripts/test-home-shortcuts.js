const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
let page;
let tourist = false;
let destination;
vm.runInNewContext(fs.readFileSync(path.join(root, 'pages/technician/home/index.js'), 'utf8'), {
  Page(value) { page = value; },
  require(name) { return name.endsWith('/permission') ? { isTouristTechnician: () => tourist } : {}; },
  wx: { navigateTo({ url }) { destination = url; }, showToast() {} },
  console
});
page.openQuickQuote();
assert.equal(destination, '/pages/technician/quick-quote/index');
page.openCreateBooking();
assert.equal(destination, '/pages/technician/create-order/index');
tourist = true;
destination = null;
page.openQuickQuote();
page.openCreateBooking();
assert.equal(destination, null, '游客不能进入报价和代客预约');
page.data.shareProfile = { id: 7, name: '小林', invitationCode: 'A B' };
const share = page.onShareAppMessage({ target: { dataset: { shareKind: 'homepage' } } });
assert.equal(share.path, '/pages/client/artist-home/index?id=7&source=artist_share&invite=A%20B');
assert.equal(share.title, '小林的美甲主页');
const template = fs.readFileSync(path.join(root, 'pages/technician/home/index.wxml'), 'utf8');
const css = fs.readFileSync(path.join(root, 'pages/technician/home/index.wxss'), 'utf8');
assert.match(template, /class="quick-action" bindtap="openCreateBooking"/);
assert.match(template, /open-type="share" data-share-kind="homepage"/);
assert.match(template, /wx:else class="quick-action" bindtap="handleShortcutShareUnavailable"/);
assert.match(template, /quick-quote\.svg[\s\S]*快捷报价/, '快捷报价图标应位于文字上方');
assert.match(css, /\.quick-actions\s*\{[^}]*margin: var\(--space-md\) var\(--space-xl\) 0[^}]*gap: 16rpx/);
assert.match(css, /\.quick-action\s*\{[^}]*flex: 1;[^}]*flex-direction: column;[^}]*align-items: center[^}]*justify-content: center/);
assert.match(css, /\.quick-action\s*\{[^}]*min-height: 120rpx[^}]*gap: 8rpx/, '快捷操作应压缩 icon 与文字间距和按钮高度');
assert.match(css, /\.quick-action-icon\s*\{[^}]*width: 40rpx[^}]*height: 40rpx/);
assert.doesNotMatch(css, /\.quick-action-icon\s*\{[^}]*background/, '快捷操作图标不得再有背景色和底衬');
assert.match(css, /\.quick-action-title\s*\{[^}]*font-size: var\(--font-sm\)/);
assert.match(css, /\.next-empty\s*\{[^}]*padding: var\(--space-sm\) 0[^}]*text-align: center/);
assert.match(css, /\.next-empty-sub\s*\{[^}]*margin-top: 8rpx[^}]*font-size: var\(--font-xs\)/);
console.log('首页快捷入口布局、跳转、分享及游客限制检查通过');
