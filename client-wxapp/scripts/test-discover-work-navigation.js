const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let page, role = 'client', token = 'client-session', destination;
const storage = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/client/discover/index.js'), 'utf8'), {
  Page: p => { page = p; }, require: () => ({}),
  getApp: () => ({ globalData: { role, token } }),
  wx: { getStorageSync: key => storage[key], navigateTo: o => { destination = o.url; } }
});
for (const [currentRole, currentToken, target] of [
  ['client', 'client-session', 'work-detail'],
  ['client', '', 'public-work'],
  ['technician', 'tech-session', 'public-work'],
  ['', '', 'public-work']
]) {
  role = currentRole; token = currentToken;
  page.onHeroTap({ currentTarget: { dataset: { id: 14 } } });
  assert.equal(destination, `/pages/client/${target}/index?id=14`);
  page.onWorkCardTap({ detail: { id: 14 } });
  assert.equal(destination, `/pages/client/${target}/index?id=14`);
}
role = 'client'; token = ''; storage.client_token = 'saved-client-session';
page.onWorkCardTap({ detail: { id: 14 } });
assert.equal(destination, '/pages/client/work-detail/index?id=14');
role = 'technician'; token = 'tech-session';
page.onWorkCardTap({ detail: { id: 14 } });
assert.equal(destination, '/pages/client/public-work/index?id=14', '不能把另一身份的缓存令牌当作当前客户登录');
destination = '';
page.onWorkCardTap({ detail: {} }); assert.equal(destination, '');
console.log('发现页精选和作品卡片按当前身份进入对应详情，游客与跨身份缓存隔离检查通过。');

role = 'client'; token = 'client-session'; page._publicOnlyWorkIds = { '14': true };
page.onWorkCardTap({ detail: { id: 14 } });
assert.equal(destination, '/pages/client/public-work/index?id=14', '公开列表兜底的作品仍使用公开详情');
