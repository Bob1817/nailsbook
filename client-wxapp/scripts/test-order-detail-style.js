const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
for (const role of ['client', 'technician']) {
  const base = path.join(__dirname, '..', 'pages', role, 'order-detail');
  const wxml = fs.readFileSync(path.join(base, 'index.wxml'), 'utf8');
  const wxss = fs.readFileSync(path.join(base, 'index.wxss'), 'utf8');
  for (const match of wxml.matchAll(/class="([^"]*)"/g)) {
    if (/(?:^|\s)(action-btn|action-menu-item)(?:\s|$)/.test(match[1])) {
      assert(match[1].includes('booking-action'), `${role} 预约操作必须使用公共按钮`);
    }
  }
  for (const match of wxml.matchAll(/<(?:input|textarea)\b[^>]*>/g)) {
    if (match[0].includes('placeholder=')) {
      assert(match[0].includes('placeholder-class="form-placeholder"'), `${role} 输入提示必须使用公共字号`);
    }
  }
  for (const file of ['booking-actions', 'booking-form']) {
    assert(wxss.includes(`@import '../../../styles/${file}.wxss'`));
  }
}
console.log('两端预约详情按钮与表单样式契约通过（视觉需单独验收）');
