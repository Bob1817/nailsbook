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
assert(!read('pages/technician/shop-management/index.js').includes('chooseLocation'), '首发版店铺管理不得请求地图选址');
assert(!read('pages/technician/help-feedback/index.js').includes('上门服务'), '帮助中心不得宣传上门服务');

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

assert.strictEqual(app.pages.length, 6, 'main package should contain only boot/auth and account-deletion pages');
assert(read('pages/client/agreement/index.js').includes('不提供在线支付'));
assert(read('pages/client/agreement/index.js').includes('仅支持指定美甲店的到店预约'));
assert(read('pages/client/profile/index.wxml').includes('账号注销申请'));
assert(read('utils/privacy.js').includes('requireWechatPrivacyAuthorization'));
assert(read('utils/wechat-subscription.js').includes('requestSubscribeMessage'));
assert(read('app.js').includes('/api/public/launch-config'));
assert(read('pages/technician/about/index.js').includes('loadLaunchConfig'));

const config = require('../config');
['bookingReminderTemplateId', 'operatorName', 'storeName', 'storeAddress', 'storePhone', 'filingNumber', 'privacyContact']
  .forEach((key) => assert(Object.prototype.hasOwnProperty.call(config, key), `missing release config: ${key}`));

console.log('Launch compliance checks passed.');
