const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

assert.match(
  read('app.wxss'),
  /checkbox\s*\{[^}]*transform:\s*scale\(\.64\)/s,
  '原生勾选框图标应与正文文字保持同量级',
);

for (const [file, className, size] of [
  ['pages/client/create-order/index.wxss', 'confirm-check-box', 28],
  ['pages/client/create-order/index.wxss', 'work-cell-check', 28],
  ['pages/client/customize-design/index.wxss', 'style-check', 28],
  ['pages/technician/homepage-settings/index.wxss', 'work-check', 40],
]) {
  assert.match(
    read(file),
    new RegExp(`\\.${className}\\s*\\{[^}]*width:\\s*${size}rpx;[^}]*height:\\s*${size}rpx`, 's'),
    `${file} 的 ${className} 应使用与场景匹配的紧凑勾选图标`,
  );
}

console.log('原生与自定义勾选框图标尺寸一致性检查通过');
