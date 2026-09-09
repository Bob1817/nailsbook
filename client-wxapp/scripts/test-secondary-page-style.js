const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const cases = [
  ['发现页', 'pages/client/discover/index.wxml', 'pages/client/discover/index.wxss', 2],
  ['消息页', 'pages/client/chat/index.wxml', 'pages/client/chat/index.wxss', 4],
  ['会话页', 'pages/client/chat-detail/index.wxml', 'pages/client/chat-detail/index.wxss', 1],
  ['新建设计', 'pages/client/create-design/index.wxml', 'pages/client/create-design/index.wxss', 1],
  ['定制设计', 'pages/client/customize-design/index.wxml', 'pages/client/customize-design/index.wxss', 3],
  ['问题反馈', 'pages/client/feedback/index.wxml', 'pages/client/feedback/index.wxss', 2],
  ['我的收藏', 'pages/client/my-favorites/index.wxml', 'pages/client/my-favorites/index.wxss', 2],
  ['我的点赞', 'pages/client/my-likes/index.wxml', 'pages/client/my-likes/index.wxss', 2],
  ['美甲记录', 'pages/client/beauty-archive/index.wxml', 'pages/client/beauty-archive/index.wxss', 7],
  ['客户首页', 'pages/client/home/index.wxml', 'pages/client/home/index.wxss', 5],
];

for (const [name, wxmlFile, wxssFile, requiredControls] of cases) {
  const wxml = read(wxmlFile);
  const wxss = read(wxssFile);
  assert(wxml.includes('booking-action'), `${name}必须接入统一按钮标准`);
  assert((wxml.match(/booking-action/g) || []).length >= requiredControls, `${name}存在遗漏的主要操作按钮`);
  assert(wxss.includes("@import '../../../styles/booking-actions.wxss';"), `${name}必须引入统一按钮样式`);
  assert(wxss.includes('min-height: 44px'), `${name}操作控件必须满足最小触控高度`);
  assert(wxss.includes('font-size: var(--font-sm)'), `${name}操作文字必须使用标准字号`);
}

console.log('发现、消息和设计入口视觉规范检查通过');
