const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const techJs = read('pages/technician/order-detail/index.js');
const techWxml = read('pages/technician/order-detail/index.wxml');
const techWxss = read('pages/technician/order-detail/index.wxss');

const clientJs = read('pages/client/order-detail/index.js');
const clientWxml = read('pages/client/order-detail/index.wxml');
const clientWxss = read('pages/client/order-detail/index.wxss');

const backend = read('../backend/src/orders/orders.service.ts');

// 1. 后端客户数据查询
assert.match(backend, /customer:\s*\{[\s\S]*tags:\s*true[\s\S]*notes:\s*true/, '后端预约详情必须查询客户标签与备注');

// 2. 美甲师端详情页
// 2.1 日期时间恢复为 日期 + 时间 + 星期
assert.match(techJs, /function formatTechnicianSchedule\(iso\)[\s\S]*WEEKDAYS/, '美甲师端必须提供 日期+时间+星期 格式化器');
assert.match(techJs, /_technicianScheduleText:\s*formatTechnicianSchedule\(o\.startTime\)/, '美甲师端必须输出 _technicianScheduleText');
assert.match(techWxml, /hero-time-text">\{\{order\._technicianScheduleText/, '英雄头时间必须优先使用 日期+时间+星期 字段');
assert.match(techWxml, /客户期望时间' : '预约时间'\}\}<\/text>[\s\S]*info-value">\{\{order\._technicianScheduleText/, '服务信息必须使用 日期+时间+星期 字段');

// 2.2 美甲师端不展示服务预计时长行（时长对美甲师不重要，由美甲师把控且为占用档期用）
assert.doesNotMatch(techWxml, /预计时长[\s\S]*order\.durationMinutes/, '美甲师端服务信息不得展示预计时长');

// 2.3 客户画像、标签与备注展示
assert.match(techJs, /_customerTags:\s*customerTags/, '美甲师端必须解析客户标签');
assert.match(techJs, /_customerNotes:\s*customerNotes/, '美甲师端必须提取客户备注');
assert.match(techWxml, /order\._customerTags[\s\S]*cu-tag-pill/, '客户卡片必须展示客户标签');
assert.match(techWxml, /客户画像与标签[\s\S]*prep-tags-list[\s\S]*order\._customerNotes/, '服务前准备必须聚合展示客户画像标签与备注');

// 2.4 设备与耗材检查提醒及制作准备
assert.match(techWxml, /请提前检查设备与耗材，确认材料充足且固化灯正常工作/, '款式制作准备必须展示提前检查设备与耗材提醒');
assert.match(techWxss, /\.prep-check-tip/, '必须包含耗材设备检查提醒样式');

// 3. 客户端详情页
// 3.1 客户端强化预计服务时长（供客户合理规划行程）
assert.match(clientWxml, /schedule-duration-hint">预计服务时长约 \{\{order\.durationMinutes\}\} 分钟/, '客户端时间区域必须显式展示预计服务时长');
assert.match(clientWxss, /\.schedule-duration-hint/, '必须包含预计服务时长提示样式');

// 3.2 客户端门店名称、地址导航与到店指引
assert.match(clientWxml, /shop-name-title">\{\{order\.shopName\}\}/, '客户端地址栏应展示门店名称');
assert.match(clientWxml, /catchtap="navigateToShop"[\s\S]*导航/, '客户端必须提供一键导航');
assert.match(clientWxml, /catchtap="openShopGuidance"[\s\S]*查看到店指引/, '客户端必须提供查看到店指引');

// 3.3 客户端待客户确认状态操作直出
assert.match(clientJs, /if \(s === 'pending_agree'\) \{[\s\S]*key:\s*'reject'[\s\S]*key:\s*'agree'[\s\S]*return list;/, '待客户确认时必须直接返回拒绝报价与同意报价，不得收起到更多操作');

console.log('双端预约详情页差异化展示与信息架构测试全部通过！');
