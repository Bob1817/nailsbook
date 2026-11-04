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
assert(technicianWxml.includes('bind:actiontap="showActions"'), '美甲师作品卡必须提供右上角统一操作入口');
assert(!technicianWxml.includes('work-quick-actions'), '作品卡下方不应重复堆叠快捷操作');
assert(technicianWxml.includes('bindinput="onKeywordInput"') && technicianWxml.includes('categoryFilters') && technicianWxml.includes('statusFilters'), '美甲师作品库必须支持搜索、分类和状态筛选');
assert(technicianWxml.includes('<work-card') && technicianWxml.includes('manageable'), '作品管理列表应使用紧凑管理卡片');
assert(technicianCss.includes("@import '../../../styles/booking-actions.wxss'"));

const technicianJs = fs.readFileSync(technicianBase + '.js', 'utf8');
assert(!technicianJs.includes('../../client/'), '美甲师分包禁止跨包引用客户端分包文件');
assert(technicianJs.includes("require('../utils/waterfall')"), '美甲师作品页必须引用分包内的 waterfall 模块');
assert(!fs.existsSync(path.join(__dirname, '../utils/waterfall.js')), '仅分包使用的 waterfall 模块不应留在主包');
const clientWaterfallPath = path.join(__dirname, '../pages/client/utils/waterfall.js');
const technicianWaterfallPath = path.join(__dirname, '../pages/technician/utils/waterfall.js');
assert.equal(fs.readFileSync(clientWaterfallPath, 'utf8'), fs.readFileSync(technicianWaterfallPath, 'utf8'), '双端瀑布流算法必须一致');
const waterfall = require(clientWaterfallPath);
const works = Array.from({ length: 12 }, (_, id) => ({ id, coverWidth: 600, coverHeight: id % 2 ? 800 : 450 }));
for (const width of [320, 430, 768]) {
  const layout = waterfall.getLayout({ windowWidth: width });
  const columns = waterfall.buildColumns(works, layout);
  assert.equal(columns.length, layout.columns);
  assert(layout.columnWidth > 0);
  assert.deepEqual(columns.flatMap((column) => column.items).map((work) => work.id).sort((a, b) => a - b), works.map((work) => work.id), '移动分包后不得丢失或重复作品');
}
console.log('双端作品分类浏览、分包隔离及美甲师分享主推操作检查通过');
