const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const wxml = fs.readFileSync(path.join(__dirname, '../pages/client/create-order/index.wxml'), 'utf8');
assert(!wxml.includes('city-mismatch-banner'), '异城提醒仅在提交时弹窗，不占用表单空间');
assert(!wxml.includes('location-failed-hint'), '定位失败不增加页面提示卡片');
assert(!wxml.includes('bindtap="requestCurrentLocation"'), '页面不再保留重新定位入口');
console.log('创建预约无页面内定位提示；提交城市分支由 test-quick-booking.js 验证');
