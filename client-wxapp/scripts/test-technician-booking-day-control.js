const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const wxml = fs.readFileSync(path.join(root, 'pages/technician/orders/index.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'pages/technician/orders/index.wxss'), 'utf8');
const js = fs.readFileSync(path.join(root, 'pages/technician/orders/index.js'), 'utf8');

assert(wxml.includes('role="switch"'), '当日接单设置应使用开关语义');
assert(wxml.includes('aria-checked="{{dayAccepting}}"'), '开关应暴露当前接单状态');
assert(wxml.includes('booking-day-description'), '设置应解释当前状态的实际影响');
assert(wxml.includes('booking-day-switch-knob'), '设置应提供明确的开关视觉');
assert(!wxml.includes('class="booking-day-button"'), '不应继续使用状态与按钮混排样式');
assert(/\.booking-day-control\s*\{[^}]*min-height:\s*120rpx/s.test(wxss), '整块设置应提供充足触控区域');
assert(/\.booking-day-switch\s*\{[^}]*width:\s*76rpx;\s*height:\s*44rpx/s.test(wxss), '开关尺寸应清晰且与文字匹配');
assert(/\.booking-day-switch-on\s*\{[^}]*background:\s*var\(--nb-success\)/s.test(wxss), '开启状态开关应使用成功绿色');
assert(/\.booking-day-status\s*\{[^}]*background:\s*var\(--nb-success-surface\)[^}]*color:\s*var\(--nb-success\)/s.test(wxss), '已开放标签应使用浅绿底和绿色文字');
assert(/\.booking-day-control-paused \.booking-day-status\s*\{[^}]*color:\s*var\(--nb-muted\)/s.test(wxss), '关闭状态标签应恢复为中性灰色');
assert(js.includes('await wx.showModal'), '关闭或重开接单前应保留确认步骤');

console.log('美甲师当日接单设置检查通过');
