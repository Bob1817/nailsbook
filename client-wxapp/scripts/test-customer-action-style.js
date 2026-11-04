const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'pages/technician/customer-detail/index.wxml'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'pages/technician/customer-detail/index.wxss'), 'utf8');
const shared = fs.readFileSync(path.join(root, 'styles/booking-actions.wxss'), 'utf8');
for (const name of ['new-tag-btn']) {
  assert(new RegExp(`class="${name} booking-action`).test(template), `${name} 必须接入公共按钮`);
  assert(!styles.includes(`.${name}::before`), `${name} 不得保留旧胶囊背景`);
}
assert(template.includes('action-btn action-primary booking-action {{savingTags'));
assert(/class="new-tag-input"\s+placeholder-class="customer-form-placeholder"/.test(template));
assert(styles.includes('grid-template-columns: minmax(0, 1fr) 112rpx'), '客户特征输入与添加按钮应在窄屏保持稳定两列');
assert(styles.includes('.sheet-body {') && styles.includes('box-sizing: border-box'), '客户特征弹层内容区不得因内边距横向溢出');
assert(/@import ['"]\.\.\/\.\.\/\.\.\/styles\/booking-actions\.wxss['"]/.test(styles));
for (const rule of ['min-height: 44px', 'border-radius: 8px', 'font-size: var(--font-sm)', 'font-weight: var(--weight-semibold)']) {
  assert(shared.includes(rule), `公共按钮规格缺失：${rule}`);
}
console.log('客户操作样式契约检查通过（不替代模拟器视觉验收）');
