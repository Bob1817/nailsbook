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
  'pages/technician/referral-campaign/index',
  'pages/technician/home-service-settings/index',
].forEach((route) => assert(!routes.includes(route), `forbidden launch route: ${route}`));

assert.strictEqual(app.pages.length, 5, 'main package should contain only boot/auth pages');
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
