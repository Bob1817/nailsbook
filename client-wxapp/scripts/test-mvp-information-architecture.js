const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const tabBar = read('components/tab-bar/index.js');
const technicianTabs = [
  ['home', '今日', '/pages/technician/home/index'],
  ['customers', '客户', '/pages/technician/customers/index'],
  ['orders', '预约', '/pages/technician/orders/index'],
  ['works', '作品', '/pages/technician/works/index'],
  ['profile', '我的经营', '/pages/technician/profile/index']
];

technicianTabs.forEach(([key, label, route]) => {
  assert(tabBar.includes(`key: '${key}'`), `经营端主导航缺少 ${key}`);
  assert(tabBar.includes(`label: '${label}'`), `经营端主导航缺少 ${label}`);
  assert(tabBar.includes(`path: '${route}'`), `经营端主导航路由错误：${route}`);
});

const technicianTabBlock = tabBar.match(/const TECHNICIAN_TABS = \[([\s\S]*?)\];/);
assert(technicianTabBlock, '未找到经营端主导航配置');
assert.strictEqual((technicianTabBlock[1].match(/\{ key:/g) || []).length, 5, '经营端主导航必须恰好为五项');

const profile = read('pages/technician/profile/index.js') + read('pages/technician/profile/index.wxml');
['订阅套餐', '邀请基金', '店铺管理', '绑定申请', '宣传物料'].forEach((label) => {
  assert(!profile.includes(`label: '${label}'`) && !profile.includes(`>${label}<`), `我的经营仍显示暂缓入口：${label}`);
});
['主页与规则', '服务与价格', '预约时间', '预约意向'].forEach((label) => {
  assert(profile.includes(label), `我的经营缺少入口：${label}`);
});

const orders = read('pages/technician/orders/index.js') + read('pages/technician/orders/index.wxml');
assert(!orders.includes('/pages/technician/all-itineraries/index'), '预约页仍跳转重复的全部行程页面');
assert(!orders.includes('/pages/technician/all-bookings/index'), '预约页仍跳转重复的全部预约页面');

const clientEntrypoints = [
  read('pages/client/home/index.wxml'),
  read('pages/client/profile/index.wxml'),
  read('components/work-card/index.wxml')
].join('\n');
['生成朋友圈分享图', '我的收藏', '我的点赞', '推荐好友', 'wc-like-pill'].forEach((entry) => {
  assert(!clientEntrypoints.includes(entry), `客户端仍显示暂缓入口：${entry}`);
});

console.log('MVP information architecture checks passed.');
