const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const js = read('pages/technician/work-detail/index.js');
const wxml = read('pages/technician/work-detail/index.wxml');

assert.match(wxml, /bindtap="openSourceRecord"[\s\S]*沉淀的美甲记录/, '作品详情应能回查最近来源美甲记录');
assert.match(wxml, /bindtap="openSourceOrder"[\s\S]*关联预约/, '作品详情应能回查来源预约');
assert.match(js, /complete-service\/index\?id=\$\{source\.orderId\}&mode=record/, '来源记录应进入只读记录详情');
assert.match(js, /order-detail\/index\?id=\$\{source\.orderId\}/, '来源预约应进入预约详情');
assert.doesNotMatch(wxml, /客户反馈|甲面情况|客户反应|个人偏好/, '作品详情不应展示客户专属信息');

console.log('作品制作方案与来源服务回查检查通过');
