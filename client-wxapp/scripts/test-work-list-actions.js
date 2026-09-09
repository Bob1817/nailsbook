const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
for (const role of ['client', 'technician']) {
  const base = path.join(__dirname, '../pages', role, 'works/index');
  const wxml = fs.readFileSync(base + '.wxml', 'utf8');
  const css = fs.readFileSync(base + '.wxss', 'utf8');
  const buttons = [...wxml.matchAll(/<button\b[^>]*>/g)];
  assert.equal(buttons.length, 3);
  for (const [button] of buttons) assert(button.includes('booking-action'), role);
  assert(css.includes("@import '../../../styles/booking-actions.wxss'"));
}
console.log('两端作品列表六个操作按钮统一接入检查通过');
