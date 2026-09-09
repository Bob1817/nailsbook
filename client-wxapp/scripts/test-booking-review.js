const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const wxml = fs.readFileSync(path.join(root, 'pages/client/create-order/index.wxml'), 'utf8');
const js = fs.readFileSync(path.join(root, 'pages/client/create-order/index.js'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'pages/client/create-order/index.wxss'), 'utf8');

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
assert.match(
  wxml,
  /role="checkbox" aria-checked="\{\{bookingRulesAgreed\}\}"/,
  '预约规则勾选必须向辅助功能暴露实时选中状态',
);
assert.match(
  wxml,
  /wx:if="\{\{bookingRulesAgreed\}\}" class="rules-check-icon" src="\/static\/icons\/check-circle\.svg"/,
  '预约规则选中状态必须使用清晰可见的项目图标',
);
assert.match(
  wxss,
  /\.rules-box\s*\{[^}]*width:28rpx; height:28rpx;[^}]*border:\s*2rpx solid var\(--nb-control\)/s,
  '预约规则未选中状态必须显示清晰边框',
);
console.log('Booking review modal checks passed.');
