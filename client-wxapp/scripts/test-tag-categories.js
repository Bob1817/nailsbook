const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const managerJs = fs.readFileSync(path.join(root, 'pages/technician/tag-management/index.js'), 'utf8');
const managerWxml = fs.readFileSync(path.join(root, 'pages/technician/tag-management/index.wxml'), 'utf8');
const managerWxss = fs.readFileSync(path.join(root, 'pages/technician/tag-management/index.wxss'), 'utf8');
const workJs = fs.readFileSync(path.join(root, 'pages/technician/work-edit/index.js'), 'utf8');
const workWxml = fs.readFileSync(path.join(root, 'pages/technician/work-edit/index.wxml'), 'utf8');
const customerJs = fs.readFileSync(path.join(root, 'pages/technician/customer-detail/index.js'), 'utf8');
const { filterTagTemplates } = require(path.join(root, 'utils/tag-templates'));

assert(managerWxml.includes('客户标签') && managerWxml.includes('作品标签'), '标签管理必须区分客户与作品标签');
assert(managerJs.includes("tagTemplates.list('customer')") && managerJs.includes("tagTemplates.list('work')"), '标签管理必须分别加载两类标签');
assert(managerJs.includes("type: this.data.activeType"), '新增标签必须写入当前分类');
assert.match(managerWxss, /\.category-tab\s*\{[^}]*min-height:88rpx/s, '分类切换必须满足触控尺寸');
assert(workWxml.includes('选择常用标签，或直接输入新标签'), '作品编辑必须支持选择和自由输入');
assert(workJs.includes("tagTemplates.create({ name, type: 'work' })"), '新作品标签必须自动进入作品标签库');
assert(customerJs.includes("tagTemplates.create({ name, type: 'customer' })"), '新客户标签必须自动进入客户标签库');
const mixedTags = [
  { id: 'customer-1', name: '细节控', type: 'customer' },
  { id: 'work-1', name: '法式', type: 'work' },
  { id: 'legacy-1', name: '老客户' }
];
assert.deepEqual(filterTagTemplates(mixedTags, 'customer').map((item) => item.name), ['细节控', '老客户'], '客户分类只能包含客户与历史客户标签');
assert.deepEqual(filterTagTemplates({ data: mixedTags }, 'work').map((item) => item.name), ['法式'], '作品分类不能混入客户标签');
assert.notDeepEqual(filterTagTemplates(mixedTags, 'customer'), filterTagTemplates(mixedTags, 'work'), '两个分类不得复用同一列表');

console.log('Customer/work tag category and automatic template checks passed.');
