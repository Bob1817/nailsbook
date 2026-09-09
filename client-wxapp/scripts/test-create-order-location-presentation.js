const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const wxml = fs.readFileSync(path.join(__dirname, '../pages/client/create-order/index.wxml'), 'utf8');
assert(!wxml.includes('city-mismatch-banner'), '首发预约表单不得展示定位信息');
assert(!wxml.includes('location-failed-hint'), '定位失败不增加页面提示卡片');
assert(!wxml.includes('bindtap="requestCurrentLocation"'), '页面不再保留重新定位入口');
console.log('创建预约首发版无定位提示和位置权限依赖');
