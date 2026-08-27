const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const js = read('pages/client/orders/index.js');
const wxml = read('pages/client/orders/index.wxml');
const wxss = read('pages/client/orders/index.wxss');

['order-time-title', 'info-row-address', 'order-guidance-link', 'payment-row'].forEach((token) => {
  if (!wxml.includes(token)) throw new Error(`client order card missing: ${token}`);
});
if (!wxml.includes('item._isShopService && item._shopNameText')) throw new Error('empty shop names must be hidden');
if (!wxml.includes('item._hasShopGuidance')) throw new Error('shop guidance entry must follow the address');
if (!js.includes('_paymentSummary')) throw new Error('price and deposit must use one compact summary');
if (!js.includes('openShopGuidance')) throw new Error('shop guidance navigation handler is missing');
if (!js.includes('enrichShopMetadata')) throw new Error('missing shop names must be enriched from public shop data');
const locationIndex = wxml.indexOf('info-row-address');
const paymentIndex = wxml.indexOf('payment-row');
if (locationIndex < 0 || paymentIndex < locationIndex) throw new Error('payment summary must follow the location group');
if (wxml.includes('order-service-name') || wxml.includes('item._titleText')) throw new Error('service item names must not appear in list cards');
if ((wxml.match(/class="info-row/g) || []).length < 6) throw new Error('appointment facts must use dedicated aligned rows');
if (!wxml.includes('class="footer-prompt"') || !wxml.includes('class="footer-action"')) throw new Error('footer must separate left prompt and right action');
if (!/\.order-footer \{[^}]*padding: 14rpx 0;[^}]*align-items: center/.test(wxss)) throw new Error('footer vertical spacing must be consistent');
if (!/\.footer-action \{[^}]*justify-content:flex-end/.test(wxss)) throw new Error('footer action must stay right aligned');
if (!/\.order-card \{[^}]*border-radius: 32rpx/.test(wxss)) throw new Error('order card must use the compact radius');
if (!/\.order-date-box \{[^}]*width: 112rpx;[^}]*min-height: 128rpx/.test(wxss)) throw new Error('date box must use compact dimensions');

console.log('Client order card layout checks passed.');
