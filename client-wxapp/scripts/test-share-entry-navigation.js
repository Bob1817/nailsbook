const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const storage = {};
let launched = '';
global.wx = {
  getStorageSync: key => storage[key] || '',
  reLaunch: ({ url }) => { launched = url; }
};
global.getApp = () => ({ globalData: {}, getTokenExpiresAt: () => 0 });

const entry = require('../utils/entry-navigation');
assert.equal(entry.homePath(), '/pages/login/index', '游客从 Home 入口应进入授权登录页');
storage.role = 'technician'; storage.technician_token = 'valid';
assert.equal(entry.homePath(), '/pages/technician/home/index', '有效美甲师会话应返回工作台');
global.getApp = () => ({ globalData: { role: 'technician' }, getTokenExpiresAt: () => Date.now() - 1 });
assert.equal(entry.homePath(), '/pages/login/index', '过期令牌应进入授权登录页');
entry.goHome();
assert.equal(launched, '/pages/login/index');

const account = require('../utils/account-navigation');
assert.equal(account.postLoginPath('technician', '/pages/technician/order-detail/index?id=9'), '/pages/technician/order-detail/index?id=9');
assert.equal(account.postLoginPath('technician', '/pages/client/artist-home/index?id=9'), '/pages/client/artist-home/index?id=9');
assert.equal(account.postLoginPath('technician', '/pages/client/order-detail/index?id=9'), '/pages/technician/home/index');
assert.equal(account.postLoginPath('client', '/pages/technician/order-detail/index?id=9'), '/pages/client/home/index');
assert.equal(account.postLoginPath('client', '/pages/client/order-detail/index?id=9'), '/pages/client/order-detail/index?id=9');
assert.equal(account.isPublicClientPath('/pages/client/works/index?techId=9&mode=gallery'), true);
assert.equal(account.isPublicClientPath('/pages/client/works/index'), false);

const navJs = read('components/nav-bar/index.js');
const navWxml = read('components/nav-bar/index.wxml');
assert(navWxml.includes('bindtap="navigateBack"'), '公共导航返回必须处理单页栈');
assert(navJs.includes('pages.length > 1') && navJs.includes('this.goSafeHome()'), '有历史时返回、无历史时回首页');
assert.match(navJs, /hasHistory: pages\.length > 1/, '公共导航应根据页面栈决定返回或 Home');
assert.match(navWxml, /showBack && hasHistory[\s\S]*nav-back\.svg[\s\S]*bindtap="goSafeHome"[\s\S]*tab-home\.svg/,
  '有上一页显示返回箭头，无上一页显示 Home 图标');

[
  ['pages/client/artist-home/index.wxml', '主页加载失败'],
  ['pages/client/quick-booking/index.wxml', '预约主页暂时无法打开'],
  ['pages/client/shop-guidance/index.wxml', '指引信息加载失败'],
  ['pages/client/works/index.wxml', '作品加载失败']
].forEach(([file, state]) => {
  const source = read(file);
  assert(source.includes(state) && source.includes('bindtap="goHome"'), `${file} 异常态必须提供首页出口`);
});

const app = read('app.js');
[
  'pages/client/quick-booking/index',
  'pages/client/public-work/index',
  'pages/client/artist-home/index',
  'pages/client/works/index',
  'pages/client/shop-guidance/index',
  'pages/client/quote-confirm/index'
].forEach(route => assert(app.includes(`options.path === '${route}'`), `${route} 必须保留为分享落地页`));
assert(app.includes('publicGuestEntry && expiresAt > 0'), '公开分享页遇到过期本地会话时应降级为游客浏览');
assert(app.includes('isPublicClientPath(currentPath)'), '公开页恢复前台时不得被过期会话强制拉去登录');

const request = read('utils/request.js');
assert(request.includes("require('./entry-navigation')"), '会话失效应读取当前业务页');
assert(request.includes('redirect=${encodeURIComponent(returnPath)}'), '会话失效登录必须携带原业务地址');
assert(request.includes('requiredRole !== role'), '受保护接口必须阻止跨角色请求');

[
  'pages/technician/order-detail/index.js',
  'pages/technician/quick-quote/index.js',
  'pages/technician/work-detail/index.js',
  'pages/client/work-detail/index.js',
  'pages/client/works/index.js'
].forEach(file => {
  const source = read(file);
  assert(!/if \([^\n]+\) return \{[^\n]+path: '\/pages\/technician\//.test(source), `${file} 分享准备失败时不得暴露私有页面`);
  assert(!source.includes("path: '/pages/client/works/index'"), `${file} 分享准备失败时不得落入需登录作品列表`);
});

const workDetailViewWxml = read('components/work-detail-view/index.wxml');
const workDetailViewJs = read('components/work-detail-view/index.js');
assert(workDetailViewWxml.includes('hasHistory') && workDetailViewWxml.includes('tab-home.svg'), '作品详情必须在无页面栈历史时展示首页图标');
assert(workDetailViewJs.includes('hasHistory: pages.length > 1'), '作品详情组件必须感知页面历史');

const clientWorkDetailJs = read('pages/client/work-detail/index.js');
assert(clientWorkDetailJs.includes('goEntryHome') && clientWorkDetailJs.includes('pages.length > 1'), '客户作品详情页返回必须具备单页兜底首页能力');

const loginWxml = read('pages/login/index.wxml');
const loginJs = read('pages/login/index.js');
assert(loginWxml.includes('onLoginBack') && loginWxml.includes('guest-entry'), '登录页必须提供退出与游客浏览通道');
assert(loginJs.includes('fallbackToTarget') && loginJs.includes('skipToGuestExplore'), '登录页必须支持返回原页面或首页');

console.log('分享落地页出口、会话恢复、角色重定位与私有分享回退检查通过');
