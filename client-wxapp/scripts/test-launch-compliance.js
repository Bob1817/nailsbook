const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const app = JSON.parse(read('app.json'));
const routes = [
  ...app.pages,
  ...(app.subPackages || []).flatMap((pkg) =>
    pkg.pages.map((page) => `${pkg.root}/${page}`),
  ),
];

[
  'pages/client/trade-orders/index',
  'pages/client/referrals/index',
  'pages/technician/trade-orders/index',
  'pages/technician/subscription/index',
  'pages/technician/home-service-settings/index',
].forEach((route) => assert(!routes.includes(route), `forbidden launch route: ${route}`));

assert(!app.permission, '首发版不得声明位置权限');
assert(!app.requiredPrivateInfos, '首发版不得声明 chooseLocation 等位置隐私能力');
const createOrderJs = read('pages/client/create-order/index.js');
const createOrderWxml = read('pages/client/create-order/index.wxml');
assert(!createOrderJs.includes('上门美甲') && !createOrderWxml.includes('上门'), '预约页不得暴露上门服务');
assert(!createOrderJs.includes('getLocation') && !createOrderJs.includes('client.addresses'), '预约页不得读取定位或客户地址');
assert(!read('pages/client/address-edit/index.js').includes('chooseLocation'), '首发版客户地址编辑不得请求地图选址');
assert(!read('pages/technician/shop-management/index.js').includes('chooseLocation'), '首发版店铺管理不得请求地图选址');
assert(!read('pages/technician/help-feedback/index.js').includes('上门服务'), '帮助中心不得宣传上门服务');
assert(routes.includes('pages/client/discover/index'), '发现页必须注册');
const discoverJs = read('pages/client/discover/index.js');
const discoverWxml = read('pages/client/discover/index.wxml');
assert(!discoverJs.includes('api.public.works'), '发现页不得调用公开作品接口（游客不可浏览作品）');
assert(discoverJs.includes('needLogin'), '发现页必须内置未登录拦截状态');
assert(discoverJs.includes('api.client.works.list'), '发现页只能通过登录客户作品接口读取');
assert(
  /isMyTechnician/.test(discoverJs) && /\.filter\(function \(w\) \{ return w\.isMyTechnician; \}\)/.test(discoverJs),
  '发现页必须前端硬过滤：仅展示绑定美甲师作品'
);
assert(!discoverWxml.includes('发现好作品'), '发现页不得使用平台撮合式标题');
assert(discoverWxml.includes('绑定美甲师') || discoverWxml.includes('绑定常用美甲师'), '空态需引导绑定而非公开逛作品');
const publicWorkJs = read('pages/client/public-work/index.js');
assert(!publicWorkJs.includes('wx.redirectTo({ url: buildClientLoginUrl'), '公开作品分享页不得在浏览前强制登录');
assert(publicWorkJs.includes('buildClientLoginUrl(returnPath'), '联系美甲师等账户操作仍须建立登录态并保留返回路径');
const apiJs = read('services/api.js');
[
  /works: \(id, params\) => api\.get\(`\$\{P\}\/brands\/\$\{id\}\/works`, params, \{ needAuth: false \}\)/,
  /list: \(params\) => api\.get\(`\$\{P\}\/works`, params, \{ needAuth: false \}\)/,
  /detail: \(id\) => api\.get\(`\$\{P\}\/works\/\$\{id\}`, null, \{ needAuth: false \}\)/,
  /shared: \(token\) => api\.get\(`\$\{P\}\/works\/shared\/\$\{token\}`, null, \{ needAuth: false \}\)/,
].forEach((pattern) => assert(pattern.test(apiJs), '分享落地所需公开作品接口必须允许匿名读取'));

[
  'pages/technician/referral-campaign/index',
  'pages/technician/marketing-materials/index',
].forEach((route) => assert(routes.includes(route), `missing marketing route: ${route}`));

const profileJs = read('pages/technician/profile/index.js');
assert(profileJs.includes("key: 'marketingMaterials'"), '美甲师经营工具应提供宣传物料入口');
assert(profileJs.includes("marketingMaterials: '/pages/technician/marketing-materials/index'"), '宣传物料入口应跳转到已注册页面');
const referralJs = read('pages/technician/referral-campaign/index.js');
assert(referralJs.includes('api.technician.insights.overview'), '推荐数据页应复用首期已开放的经营统计接口');
assert(!referralJs.includes('fundSummary()'), '推荐数据页不得依赖首期未开放的基金账户接口');

assert.strictEqual(app.pages.length, 5, 'main package should contain only boot/auth, booking router and account-deletion pages');
assert(app.pages.includes('pages/booking/index'), '公众号立即预约需要主包角色路由页');
assert(!app.pages.includes('pages/onboarding/index'), '一号一角色后不得打包角色引导页');
assert(read('pages/client/agreement/index.js').includes('不提供在线支付'));
assert(read('pages/client/agreement/index.js').includes('仅支持指定美甲店的到店预约'));
assert(read('pages/client/profile/index.wxml').includes('账号注销申请'));
assert(read('utils/privacy.js').includes('requireWechatPrivacyAuthorization'));
const wechatSubscription = read('utils/wechat-subscription.js');
assert(wechatSubscription.includes('requestSubscribeMessage'));
assert(wechatSubscription.includes('bookingDayBeforeTemplateId'));
assert(wechatSubscription.includes('bookingHourBeforeTemplateId'));
assert(wechatSubscription.includes('bookingClientSuccessTemplateId'));
assert(wechatSubscription.includes('bookingTechnicianNewTemplateId'));
assert(wechatSubscription.includes('bookingClientStatusTemplateId'));
assert(wechatSubscription.includes('bookingTechnicianStatusTemplateId'));
assert(wechatSubscription.includes('consultationReplyTemplateId'));
assert(wechatSubscription.includes('tmplIds: templateIds'));
assert(read('app.js').includes('/api/public/launch-config'));
assert(read('pages/technician/about/index.js').includes('loadLaunchConfig'));
assert(!read('utils/request.js').includes('localhost'), '生产请求不得回退到本地开发地址');
assert(read('utils/request.js').includes("'https://api.lunails.cn'"), '生产请求兜底域名必须与小程序配置一致');

const config = require('../config');
['bookingReminderTemplateId', 'bookingDayBeforeTemplateId', 'bookingHourBeforeTemplateId', 'bookingClientSuccessTemplateId', 'bookingTechnicianNewTemplateId', 'bookingClientStatusTemplateId', 'bookingTechnicianStatusTemplateId', 'consultationReplyTemplateId', 'operatorName', 'storeName', 'storeAddress', 'storePhone', 'filingNumber', 'privacyContact']
  .forEach((key) => assert(Object.prototype.hasOwnProperty.call(config, key), `missing release config: ${key}`));

console.log('Launch compliance checks passed.');

for (const file of ['project.config.json', 'project.private.config.json']) {
  const project = JSON.parse(read(file));
  assert.strictEqual(project.setting.urlCheck, true, `${file} 必须开启合法域名校验`);
  const [major, minor, patch] = project.libVersion.split('.').map(Number);
  assert(major > 2 || (major === 2 && (minor > 32 || (minor === 32 && patch >= 3))), `${file} 基础库必须支持隐私授权接口`);
}
assert(!read('pages/login/index.js').includes('短信设置密码'), '无短信服务时不得引导短信设密');
assert(!createOrderWxml.includes('确认后你会收到微信通知'), '未取得订阅授权不得承诺微信通知');

// 执行分享入口，验证游客可直接读取公开作品或有效分享令牌。
const vm = require('vm');
const { createRequire } = require('module');
const shareFile = path.join(root, 'pages/client/public-work/index.js');
for (const options of [{ shareToken: 'review-token', book: '1' }, { id: '123' }, { scene: 'w123' }]) {
  let page, destination = '', loads = 0;
  const storage = {};
  global.wx = { setStorageSync: (key, value) => { storage[key] = value; } };
  vm.runInNewContext(read('pages/client/public-work/index.js'), {
    Page: value => { page = value; }, require: createRequire(shareFile),
    wx: { getStorageSync: () => '', redirectTo: ({ url }) => { destination = url; }, hideShareMenu: () => {}, showShareMenu: () => {} }
  });
  page.setData = data => Object.assign(page.data, data);
  page.loadWork = () => { loads++; };
  page.onLoad(options);
  assert.strictEqual(loads, 1, '游客打开分享后应直接读取公开内容');
  assert.strictEqual(destination, '', '游客浏览分享内容时不应跳转登录页');
  if (options.shareToken) assert.strictEqual(page.shareToken, 'review-token');
  else assert.strictEqual(page.workId, '123');
  if (options.book) assert.strictEqual(page.resumeBooking, true);
}
delete global.wx;
