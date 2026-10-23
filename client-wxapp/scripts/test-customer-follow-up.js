const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pageDir = path.join(__dirname, '../pages/technician/customer-detail');
const wxml = fs.readFileSync(path.join(pageDir, 'index.wxml'), 'utf8');
const js = fs.readFileSync(path.join(pageDir, 'index.js'), 'utf8');

assert(!wxml.includes('客户跟进记录'), '客户详情不应继续展示客户跟进记录卡片');
assert(!wxml.includes('新增跟进记录'), '客户详情不应保留跟进记录录入弹层');
for (const handler of ['openFollowUpSheet', 'submitFollowUp', 'completeFollowUp', '_followUps']) {
  assert(!js.includes(handler), `客户详情不应保留不可达跟进逻辑：${handler}`);
}
assert(!wxml.includes('bindtap="createExclusiveWork"'), '客户详情不应绕过服务记录直接新建作品');
assert(!js.includes('createExclusiveWork()'), '客户详情不应保留旁路作品创建逻辑');
const workEdit = fs.readFileSync(path.join(__dirname, '../pages/technician/work-edit/index.js'), 'utf8');
assert(!workEdit.includes('options.customerId'), '作品编辑页不应保留客户详情旁路预填入口');
assert(!workEdit.includes('prefillCustomer('), '作品编辑页只应通过关联预约预填客户授权');
assert(wxml.includes('customer._serviceRecords.length === 0 && customer.relatedWorks.length'), '历史关联作品兼容区应仅在无记录且确有作品时展示');
assert(wxml.includes('bindtap="addProfileFact"'), '稳定客户档案应保留唯一的结构化新增入口');
for (const category of ['allergy', 'contraindication', 'preference', 'communication', 'reminder']) {
  assert(js.includes(`value: '${category}'`), `客户档案应支持结构化分类：${category}`);
}

const serviceRecordIndex = wxml.indexOf('<!-- ============ 美甲记录 ============ -->');
const basicInfoIndex = wxml.indexOf('<!-- ============ 基础信息 ============ -->');
const relatedWorkIndex = wxml.indexOf('<!-- ============ 关联作品 ============ -->');
const bottomActionIndex = wxml.indexOf('<!-- ============ 底部操作 ============ -->');
assert(serviceRecordIndex > basicInfoIndex, '美甲记录应位于基础信息之后');
assert(serviceRecordIndex > relatedWorkIndex, '美甲记录应位于关联作品兼容区之后');
assert(serviceRecordIndex < bottomActionIndex, '美甲记录应位于底部固定操作之前');

console.log('客户详情已移除跟进记录，并将美甲记录置于页面内容底部');
