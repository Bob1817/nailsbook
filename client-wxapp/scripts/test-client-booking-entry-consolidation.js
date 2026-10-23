const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const designsJs = read('pages/client/designs/index.js');
const designsWxml = read('pages/client/designs/index.wxml');
const bookingJs = read('pages/client/create-order/index.js');

assert.match(designsJs, /create-order\/index\?mode=full&content=custom/, '新需求应统一进入预约页');
assert.equal((designsWxml.match(/bindtap="goToBooking"/g) || []).length, 1, '设计记录页只保留一个新建入口');
assert.doesNotMatch(designsWxml, /goToCreateDesign|goToCustomizeDesign/, '不应继续展示两套设计入口');

for (const page of ['create-design', 'customize-design']) {
  const source = read(`pages/client/${page}/index.js`);
  assert.match(source, /wx\.redirectTo/, `${page} 旧链接应兼容跳转`);
  assert.match(source, /mode=full.*content=custom/, `${page} 应进入完整自定义预约`);
}

assert.match(bookingJs, /this\._preferCustom = options\.content === 'custom'/, '预约页应识别统一自定义入口');
assert.match(bookingJs, /payload\.intentWorkIds = d\.selectedWorkIds/, '所选参考作品应随预约提交');

console.log('客户端预约入口收口检查通过');
