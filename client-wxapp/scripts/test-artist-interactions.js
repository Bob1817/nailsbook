const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let page;
let role = 'technician';
let userId = 55;
const navigations = [];
const context = {
  require: () => ({}),
  Page: value => { page = value; },
  getApp: () => ({ globalData: { role, token: 'test' } }),
  wx: { getStorageSync: key => key === 'role' ? role : { id: userId }, navigateTo: value => navigations.push(value.url), showToast: () => {} },
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/client/artist-home/index.js'), 'utf8'), context);
page.data.artistId = '55';
page.setData = () => { throw new Error('Owner interaction must not mutate state'); };
for (const [handler, type] of [['toggleFollow', 'follow'], ['toggleLike', 'like'], ['toggleFavorite', 'favorite']]) {
  page[handler]();
  assert.equal(navigations.pop(), '/pages/technician/artist-interactions/index?type=' + type);
}
role = 'client';
assert.equal(page.openOwnInteractions('follow'), false);
role = 'technician'; userId = 99;
assert.equal(page.openOwnInteractions('like'), false);
assert.equal(navigations.length, 0);
console.log('本人主页三类记录跳转、无互动写入、其他身份隔离检查通过');
