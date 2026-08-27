const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const wxml = fs.readFileSync(path.join(root, 'pages/client/create-order/index.wxml'), 'utf8');
const js = fs.readFileSync(path.join(root, 'pages/client/create-order/index.js'), 'utf8');

assert.match(
  wxml,
  /class="modal-panel application-review" catchtap="preventModalClose"/,
  '预约核对弹窗必须拦截内部点击，避免冒泡关闭遮罩层',
);
assert.match(
  js,
  /preventModalClose:\s*function\s*\(\)\s*\{\}/,
  '预约核对弹窗必须提供明确的空事件处理函数',
);
assert.match(
  wxml,
  /class="rules-check" bindtap="toggleBookingRules"/,
  '预约规则勾选必须保留独立交互事件',
);

console.log('Booking review modal checks passed.');
