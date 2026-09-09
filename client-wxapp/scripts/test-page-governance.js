const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const cases = [
  ['地址列表', 'pages/client/addresses', 2, '.btn-add'],
  ['编辑地址', 'pages/client/address-edit', 1, '.btn-save'],
  ['预约提交结果', 'pages/client/booking-success', 2, '.primary,.secondary'],
  ['公开服务空态', 'pages/client/brand-services', 1, '.state button.booking-action'],
  ['公开作品空态', 'pages/client/brand-works', 1, '.state button.booking-action'],
  ['创建预约操作', 'pages/client/create-order', 4, '.submit-btn.booking-action'],
  ['美甲师主页操作', 'pages/client/artist-home', 9, '.btn-book-now'],
  ['客户端作品列表操作', 'pages/client/works', 3, '.business-book-btn.booking-action'],
  ['美甲师资料营销操作', 'pages/technician/profile', 3, '.invite-action.booking-action'],
  ['推荐分享', 'pages/client/referrals', 2, '.primary'],
  ['快速咨询', 'pages/client/public-inquiry', 2, '.primary.booking-action'],
  ['到店指引', 'pages/client/shop-guidance', 3, '.btn-navigate'],
  ['设计记录', 'pages/client/designs', 1, '.retry-btn.booking-action'],
  ['服务时间', 'pages/technician/service-time', 1, '.retry-btn.booking-action'],
  ['订阅套餐', 'pages/technician/subscription', 3, '.plan-btn.booking-action'],
  ['客户预约详情', 'pages/client/order-detail', 1, '.retry-btn.booking-action'],
  ['客户详情', 'pages/technician/customer-detail', 1, '.retry-btn.booking-action'],
  ['美甲师预约详情', 'pages/technician/order-detail', 1, '.retry-btn.booking-action'],
  ['上门服务设置', 'pages/technician/home-service-settings', 1, '.retry-btn.booking-action'],
  ['一键预约错误态', 'pages/client/quick-booking', 5, '.booking-page .booking-button.booking-action'],
  ['美甲师互动错误态', 'pages/technician/artist-interactions', 1, '.records-page .retry.booking-action'],
  ['美甲师消息错误态', 'pages/technician/chat', 2, '.retry-btn.booking-action'],
  ['设计详情操作', 'pages/client/design-detail', 13, '.btn-quote.booking-action'],
  ['店铺弹窗操作', 'pages/technician/shop-management', 3, '.btn-save.booking-action'],
  ['快速录入线索', 'pages/technician/lead-create', 1, '.primary.booking-action'],
  ['线索详情操作', 'pages/technician/lead-detail', 6, '.page button.booking-action'],
  ['线索列表入口', 'pages/technician/leads', 1, '.add.booking-action'],
];

for (const [name, page, requiredControls, styleRule] of cases) {
  const wxml = read(`${page}/index.wxml`);
  const wxss = read(`${page}/index.wxss`);
  assert(wxml.includes('booking-action'), `${name}必须接入预约卡片按钮标准`);
  assert((wxml.match(/booking-action/g) || []).length >= requiredControls, `${name}存在遗漏的主要操作按钮`);
  assert(wxss.includes("@import '../../../styles/booking-actions.wxss';"), `${name}必须引入统一按钮样式`);
  assert(wxss.includes(styleRule), `${name}缺少页面级控件标准覆盖：${styleRule}`);
}

const inquiryCss = read('pages/client/public-inquiry/index.wxss');
assert(inquiryCss.includes('.form input,.form .picker,.form textarea'), '快速咨询输入与选择器必须使用页面范围选择器');
assert(inquiryCss.includes('font-size:var(--font-sm)'), '快速咨询输入与按钮必须使用正文级字号');

const guidanceCss = read('pages/client/shop-guidance/index.wxss');
assert(guidanceCss.includes('height: 44px'), '到店指引按钮必须使用统一视觉高度');
assert(guidanceCss.includes('border-radius: 8px'), '到店指引按钮必须使用统一圆角');

console.log(`页面治理检查通过：${cases.length} 个本轮补齐页面已接入统一操作标准。`);
