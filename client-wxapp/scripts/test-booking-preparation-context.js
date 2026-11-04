const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const js = read('pages/technician/order-detail/index.js');
const wxml = read('pages/technician/order-detail/index.wxml');
const backend = read('../backend/src/orders/orders.service.ts');

assert.match(backend, /intentWorks:\s*\{[\s\S]*orderBy:\s*\{ sortOrder: 'asc' \}[\s\S]*preparation: true/, '预约详情应返回全部关联作品准备方案');
assert.match(js, /\(raw\.intentWorks \|\| \[\]\)\.forEach/, '页面应合并多个参考作品');
assert.match(js, /_hasPreparationContext: customerAlerts\.length > 0 \|\| customerPreferences\.length > 0 \|\| workPreparations\.length > 0/, '无已确认档案信息时应隐藏整个模块');
assert.equal((wxml.match(/<text class="card-title">服务前准备<\/text>/g) || []).length, 1, '客户与作品信息应合并为一个准备卡片');
assert.doesNotMatch(wxml, /card-title">客户安全提醒|card-title">偏好与服务习惯|card-title">同款制作准备/, '不应继续拆分重复卡片');
assert.match(wxml, /order\._preparationWorks[\s\S]*item\.preparation\.tools[\s\S]*item\.preparation\.materials/, '关联作品应展示工具与材料');
assert.match(wxml, /bindtap="viewPreparationWork"/, '准备方案应可进入关联作品详情');
assert.doesNotMatch(js, /recentServiceInsights|_customerHistoryInsights/, '未手动同步的历史记录结论不得进入预约准备区');
assert.doesNotMatch(wxml, /近期服务参考|order\._customerHistoryInsights/, '预约准备区不得直接展示未确认的记录结论');
assert.match(wxml, /最近美甲记录[\s\S]*order\._recentRecords/, '历史记录仍应保留独立入口供美甲师主动查看');

const completeService = read('pages/technician/complete-service/index.wxml');
assert.doesNotMatch(completeService, /更新客户档案|factAllergy|factPreference/, '完成服务时不应重复填写长期客户档案');

console.log('预约服务前准备信息聚合检查通过');
