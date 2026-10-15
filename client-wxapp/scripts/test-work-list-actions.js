const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const clientBase = path.join(__dirname, '../pages/client/works/index');
const clientWxml = fs.readFileSync(clientBase + '.wxml', 'utf8');
const clientCss = fs.readFileSync(clientBase + '.wxss', 'utf8');
assert([...clientWxml.matchAll(/<button\b[^>]*>/g)].every(([button]) => button.includes('booking-action')));
assert(clientWxml.includes('categoryFilters') && clientWxml.includes('switchCategory'), '客户端必须能按美甲师分类筛选作品');
assert(clientCss.includes("@import '../../../styles/booking-actions.wxss'"));

const technicianBase = path.join(__dirname, '../pages/technician/works/index');
const technicianWxml = fs.readFileSync(technicianBase + '.wxml', 'utf8');
const technicianCss = fs.readFileSync(technicianBase + '.wxss', 'utf8');
assert(technicianWxml.includes('open-type="share"') && technicianWxml.includes('bindtap="manageHero"'), '美甲师作品卡必须提供分享和首页主推快捷操作');
assert(technicianWxml.includes('bindinput="onKeywordInput"') && technicianWxml.includes('categoryFilters') && technicianWxml.includes('statusFilters'), '美甲师作品库必须支持搜索、分类和状态筛选');
assert(/\.work-quick-actions button\s*\{[^}]*min-height:\s*44px/s.test(technicianCss), '作品快捷操作必须满足触控高度');
assert(technicianCss.includes("@import '../../../styles/booking-actions.wxss'"));
console.log('双端作品分类浏览及美甲师分享、主推操作检查通过');
