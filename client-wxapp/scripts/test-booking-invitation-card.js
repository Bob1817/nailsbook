const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'pages/client/quote-confirm/index.js'), 'utf8');
const wxml = fs.readFileSync(path.join(root, 'pages/client/quote-confirm/index.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'pages/client/quote-confirm/index.wxss'), 'utf8');

assert.match(js, /const invitationMessages = \[[\s\S]*让喜欢，落在指尖。[\s\S]*愿你的每一次选择，都更像自己。/,
  '预约邀请卡必须提供多组克制的美学鼓励语');
assert.match(js, /const seed = order\.orderNo \|\| quote\.quoteNo/,
  '邀请卡随机内容必须以预约编号稳定选择，避免重复打开时变化');
assert.match(js, /'invitation\.heroImage': cover/,
  '邀请卡主视觉必须使用美甲师默认店铺的环境主图');
assert.match(js, /bookingQuotes\.invitation\(this\.token\)/,
  '下载邀请卡必须走公开邀请卡出图接口');
assert.match(wxml, /wx:if="\{\{booked\}\}" class="invitation-card"/,
  '预约成功状态必须展示独立邀请卡');
assert.match(wxml, /class="invitation-status"[\s\S]*预约成功[\s\S]*class="invitation-words"/,
  '邀请卡必须同时展示成功结果和鼓励语');
assert.match(wxml, /class="invitation-logo"[\s\S]*onlynail-logo\.jpg/,
  '邀请卡主视觉右上角必须展示 OnlyNail logo');
assert.match(wxml, /bindtap="viewArtist"[\s\S]*美甲师<\/text>/,
  '邀请卡信息区必须展示美甲师并可点击进入主页');
assert.match(wxml, /美甲师确认[\s\S]*\{\{quote\.technicianName\}\}/,
  '邀请卡必须展示美甲师确认签名');
assert.match(wxml, /class="invitation-time"[\s\S]*invitation-date[\s\S]*invitation-time-main/,
  '日期与时间必须并列展示');
assert.match(wxml, /class="invitation-details"[\s\S]*服务项目[\s\S]*到店信息[\s\S]*温馨提示/,
  '服务、到店信息和规则必须从主邀请卡中分离为清晰的详情区');
assert.match(wxml, /detail-line"><text>\{\{item\.nameSnapshot\}\} × \{\{item\.quantity\}\}<\/text><text>¥\{\{item\.priceText\}\}<\/text><\/view>/,
  '预约详情服务行必须与报价单服务明细排版一致');
assert.match(wxml, /wx:elif="\{\{booked\}\}"[\s\S]*bindtap="downloadInvitation"[\s\S]*下载邀请卡[\s\S]*open-type="share">转发邀请卡/,
  '预约成功后必须固定底部操作并保留下载与转发入口');
assert.match(wxss, /\.invitation-card\s*\{[^}]*overflow:hidden;[^}]*border-radius:var\(--radius-lg\)/s,
  '邀请卡必须使用完整卡片容器');
assert.match(wxss, /\.primary\s*\{[^}]*min-height:44px/s,
  '邀请卡主操作必须保持至少 44px 触控高度');
assert.match(wxss, /\.invitation-visual\s*\{[^}]*height:360rpx/s,
  '邀请卡主视觉应保持紧凑，避免挤压核心预约信息');
assert.match(wxss, /\.invitation-date, \.invitation-time-main\s*\{[^}]*flex:1;[^}]*align-items:center/,
  '日期与时间必须等宽居中对齐，保证排版协调');
assert.match(wxss, /\.preview-actions\s*\{[^}]*position:fixed/s,
  '邀请卡底部操作必须固定在页面底部');

console.log('Booking invitation card checks passed.');
