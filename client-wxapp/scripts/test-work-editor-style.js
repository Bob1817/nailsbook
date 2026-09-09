const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '../pages/technician/work-edit');
const wxml = fs.readFileSync(path.join(base, 'index.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(base, 'index.wxss'), 'utf8');
const controls = [...wxml.matchAll(/<(?:input|textarea)\b[^>]*>/g)];
assert(controls.length >= 6);
for (const [control] of controls) assert(control.includes('placeholder-class="form-placeholder"'));
assert(wxml.includes('class="btn-save booking-action"'));
assert(wxml.includes('class="grant-remove semantic-danger booking-action"'));
assert(wxss.includes("@import '../../../styles/booking-actions.wxss'"));
assert(/\.input\s*\{[^}]*height: var\(--input-height\);[^}]*min-height: 44px/s.test(wxss));
assert(/\.picker-field\s*\{[^}]*var\(--input-height\)[^}]*var\(--input-radius\)/s.test(wxss));
for (const name of ['img-remove', 'service-stepper-button']) {
  assert(new RegExp(`\\.${name}\\s*\\{[^}]*width:\\s*44px;[^}]*height:\\s*44px`, 's').test(wxss));
}
assert(wxml.includes('aria-label="移除第{{index + 1}}张作品图片"'));
assert(wxss.includes('env(safe-area-inset-bottom)'));
console.log('作品编辑表单、按钮、图片移除与步进触控契约通过（视觉验收另记）');
