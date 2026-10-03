const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const edit = fs.readFileSync(path.join(__dirname, '../pages/technician/work-edit/index.js'), 'utf8');
const publicDetail = fs.readFileSync(path.join(__dirname, '../components/work-detail-view/index.wxml'), 'utf8');
const createOrder = fs.readFileSync(path.join(__dirname, '../pages/client/create-order/index.js'), 'utf8');
const api = fs.readFileSync(path.join(__dirname, '../services/api.js'), 'utf8');
const { normalizeWorkDetail } = require('../utils/normalize-work');

assert.match(edit, /savePromotion\(savedId/);
assert.match(edit, /promotionDiscount/);
assert.match(publicDetail, /work\.promotion/);
assert.match(publicDetail, /work\._promotionDiscountAmount > 0/, '0 元分享优惠不得占用作品详情层级');
assert.match(publicDetail, /class="work-story"[\s\S]*作品介绍[\s\S]*work\.description[\s\S]*work\.tags/, '作品描述和标签应归入统一介绍区');
assert.match(createOrder, /sourceWorkId:\s*w\.id|sourceWorkId = pf\.sourceWorkId/);
assert.match(api, /savePromotion: \(id, data\) => api\.put/);
const normalized = normalizeWorkDetail({
  tags: ['日式、素雅、复古'],
  promotion: { discountAmount: 0 }
});
assert.deepEqual(normalized.tags, ['日式', '素雅', '复古']);
assert.equal(normalized._promotionDiscountAmount, 0);
console.log('作品分享优惠：配置、公开展示、来源预约和服务端接入检查通过');
