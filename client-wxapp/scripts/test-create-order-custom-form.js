const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const wxml = fs.readFileSync(path.join(root, 'pages/client/create-order/index.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'pages/client/create-order/index.wxss'), 'utf8');

for (const field of ['form-input', 'form-textarea', 'remark-input']) {
  const control = wxml.match(new RegExp(`<(?:input|textarea) class="${field}"[^>]*>`));
  assert(control && control[0].includes('placeholder-class="form-placeholder"'), `${field} 应共用占位文字样式`);
}
assert(wxml.includes('class="work-picker-trigger"'), '参考作品应使用完整宽度的选择入口');
assert(!wxml.includes('class="link-btn" bindtap="toggleWorkSelector"'), '参考作品入口不应悬在标题右侧');
assert(/\.form-input\s*\{[^}]*height:\s*88rpx[^}]*font-size:\s*var\(--font-sm\)/s.test(wxss), '服务名称输入框应使用标准高度和字号');
assert(/\.form-textarea\s*\{[^}]*height:\s*144rpx[^}]*font-size:\s*var\(--font-sm\)/s.test(wxss), '详细描述输入框应使用紧凑高度和标准字号');
assert(/\.form-placeholder\s*\{[^}]*font-size:\s*var\(--font-sm\)/s.test(wxss), '占位文字应使用项目标准字号');
assert(/\.work-picker-trigger\s*\{[^}]*min-height:\s*96rpx/s.test(wxss), '作品选择入口应满足触控尺寸');

console.log('创建预约自定义需求表单检查通过');
