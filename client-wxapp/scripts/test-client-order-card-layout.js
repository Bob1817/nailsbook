const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const js = read('pages/client/orders/index.js');
const wxml = read('pages/client/orders/index.wxml');
const wxss = read('pages/client/orders/index.wxss');
const { hasGuidanceContent } = require('../utils/shop-guidance');

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
if (!/\.order-footer \{[^}]*min-height: 88rpx;[^}]*margin-top: -16rpx;[^}]*padding: 0;[^}]*align-items: center/.test(wxss)) throw new Error('footer must keep a 44px hit area while matching the compact fact-row spacing');
if (!/\.footer-action \{[^}]*justify-content:flex-end/.test(wxss)) throw new Error('footer action must stay right aligned');
if (!/\.footer-action \{[^}]*min-height:88rpx/.test(wxss)) throw new Error('footer action must keep a 44px touch target');
if (!/\.order-guidance-link \.info-text \{ color:var\(--nb-text-link\); \}/.test(wxss)) throw new Error('shop guidance text must use the standard blue link color');
if (!/\.order-card-content \{ padding: 24rpx 24rpx 0; \}/.test(wxss)) throw new Error('card bottom must not duplicate footer spacing');
if (!/\.order-card \{[^}]*border-radius: 32rpx/.test(wxss)) throw new Error('order card must use the compact radius');
if (!/\.order-date-box \{[^}]*width: 112rpx;[^}]*min-height: 128rpx/.test(wxss)) throw new Error('date box must use compact dimensions');

if (hasGuidanceContent({ enabled: true })) throw new Error('enabled guidance without content must stay hidden');
if (hasGuidanceContent({ enabled: false, metro: { text: '地铁口' } })) throw new Error('disabled guidance must stay hidden even when content exists');
if (!hasGuidanceContent({ enabled: true, metro: { text: '从 A 口出站' } })) throw new Error('enabled text guidance must be visible');
if (!hasGuidanceContent({ enabled: true, driving: { blocks: [{ type: 'image', url: '/guide.png' }] } })) throw new Error('enabled image guidance must be visible');
if (!js.includes('guidanceEnabled: hasGuidanceContent(matched.guidance)')) throw new Error('order cards must verify current public guidance content');
if (!js.includes('guidanceEnabled: false')) throw new Error('unverified guidance must be hidden without leaving an empty row');

console.log('Client order card layout checks passed.');
