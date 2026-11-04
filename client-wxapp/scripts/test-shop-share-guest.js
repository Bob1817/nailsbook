const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require('path').join(__dirname, '../services/api.js'), 'utf8');
const context = {};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function publicAssetUrl'), source.indexOf('// ========== 鉴权')), context);
const shop = { name: '测试店', detailAddress: '一号路', enabled: true };
const artist = { artist: { id: 1, shopAddresses: [shop, { ...shop, detailAddress: '二号路' }] } };
const read = params => context.guidanceFromPublicArtist(artist, params);
assert.equal(read({ shopName: '测试店', address: '一号路' }).shop.detailAddress, '一号路');
assert.equal(read({ shopName: '测试店', address: '不存在' }), null);
assert.equal(read({ shopName: '测试店', address: '一号路' }).guidance.enabled, false);
shop.guidance = { enabled: false, metro: { text: '隐藏内容' } };
assert.equal(read({ address: '一号路' }).guidance.metro.text, '');
shop.guidance.enabled = true;
assert.equal(read({ address: '一号路' }).guidance.metro.text, '隐藏内容');
shop.enabled = false;
assert.equal(read({ address: '一号路' }), null);
console.log('店铺分享：地址独立展示、同名店铺匹配、隐藏指引与停用店铺测试通过');
let page;
let navigated;
const pageContext = {
  require: id => id.includes('shop-guidance') ? { normalizeGuidanceSection: () => ({ blocks: [] }) } : {},
  Page: value => { page = value; },
  wx: { navigateTo: ({ url }) => { navigated = url; } }
};
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname, '../pages/client/shop-guidance/index.js'), 'utf8'), pageContext);
const instance = { data: { shopView: true, shopName: '店 A', shopAddress: '地址 A' }, _techId: 12, _shopName: '店 A', _address: '地址 A' };
assert(page.onShareAppMessage.call(instance).path.includes('view=shop'));
page.openGuidance.call(instance);
assert(navigated.includes('view=guidance'));
assert(navigated.includes(encodeURIComponent('地址 A')));
instance.data.shopView = false;
assert(page.onShareAppMessage.call(instance).path.includes('view=guidance'));
assert(page.onShareAppMessage.call(instance).title.includes('到店指引'));
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname, '../pages/technician/shop-management/index.js'), 'utf8'), { ...pageContext });
page.openShopPage.call({ _techId: 12 }, { currentTarget: { dataset: { shop: { name: '店 A', detailAddress: '地址 A' } } } });
assert(navigated.includes('view=shop'));
page.openShopPage.call({ _techId: 12 }, { currentTarget: { dataset: { shop: { name: '店 A', detailAddress: '地址 A' }, view: 'guidance' } } });
assert(navigated.includes('view=guidance'));
console.log('美甲师展示页入口、店铺至指引导航、两种分享落地测试通过');
