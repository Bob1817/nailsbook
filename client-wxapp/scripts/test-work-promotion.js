const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const edit = fs.readFileSync(path.join(__dirname, '../pages/technician/work-edit/index.js'), 'utf8');
const publicDetail = fs.readFileSync(path.join(__dirname, '../components/work-detail-view/index.wxml'), 'utf8');
const createOrder = fs.readFileSync(path.join(__dirname, '../pages/client/create-order/index.js'), 'utf8');
const api = fs.readFileSync(path.join(__dirname, '../services/api.js'), 'utf8');

assert.match(edit, /savePromotion\(savedId/);
assert.match(edit, /promotionDiscount/);
assert.match(publicDetail, /work\.promotion/);
assert.match(createOrder, /sourceWorkId:\s*w\.id|sourceWorkId = pf\.sourceWorkId/);
assert.match(api, /savePromotion: \(id, data\) => api\.put/);
console.log('作品分享优惠：配置、公开展示、来源预约和服务端接入检查通过');
