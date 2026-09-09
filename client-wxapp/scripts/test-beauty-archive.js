const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let definition;
let records = [];
let finishSave;
const api = { client: {
  beautyArchive: async () => ({ records }),
  orders: { saveClientRecordNote: () => new Promise(resolve => { finishSave = resolve; }) }
} };
const template = fs.readFileSync(path.join(__dirname, '../pages/client/beauty-archive/index.wxml'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '../pages/client/beauty-archive/index.wxss'), 'utf8');
const filterStyles = fs.readFileSync(path.join(__dirname, '../components/filter-trigger/index.wxss'), 'utf8');
assert.equal((template.match(/<filter-trigger/g) || []).length, 3, '三个下拉筛选复用统一组件');
assert(styles.includes('background: var(--nb-surface);'), '顶部主体区使用横向白色背景');
assert(filterStyles.includes('.filter-trigger-active'), '筛选组件提供明确选中状态');
assert(filterStyles.includes('border-bottom: 2rpx solid currentColor'), '筛选箭头跟随文字颜色');
assert(template.indexOf('class="moment-month"') < template.indexOf('class="moment-day"'), '月份在日期上方');
assert(template.indexOf('class="moment-date-block"') > template.indexOf('class="moment-card"'), '日期模块位于记录卡内');
assert(styles.includes('.moment-action { min-height: 44px; height: 44px;'), '卡片操作与预约卡统一为 44px');
assert(styles.includes('.action-primary .action-icon { filter: brightness(0) invert(1); }'), '深色按钮图标保持高对比度');
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/client/beauty-archive/index.js'), 'utf8'), {
  Page: page => { definition = page; },
  require: name => name.includes('colors') ? {} : api,
  wx: { showToast() {} }, console
});
const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), _pageActive: true,
  setData(value, callback) { Object.assign(this.data, value); if (callback) callback(); }
};
(async () => {
  records = Array.from({ length: 10 }, (_, i) => ({ id: `order-${i}`, orderId: i + 1,
    serviceDate: '2026-08-01', technicianName: '美甲师', tags: [i % 2 ? '法式' : '极简'] }));
  await page.loadRecords();
  assert.equal(page.data.records.length, 8);
  page.onReachBottom();
  assert.equal(page.data.records.length, 10);
  page._recordOrderId = 3;
  await page.loadRecords();
  assert.equal(page.data.records.length, 1, '从订单进入仅展示该订单记录');
  assert.equal(page.data.records[0].orderId, 3);
  page._recordOrderId = null;
  await page.loadRecords();
  assert.equal(page.data.allRecords.length, 10, '从我的进入仍保留全部历史记录');
  page.data.selectedStyleIndex = page.data.styleOptions.indexOf('法式');
  page.applyRecordFilters();
  await page.loadRecords();
  assert.equal(page.data.records.length, 5, '刷新后继续应用筛选');
  records.reverse();
  await page.loadRecords();
  assert.equal(page.data.styleOptions[page.data.selectedStyleIndex], '法式', '选项重排仍保持风格');
  records = records.filter(record => record.tags[0] !== '法式');
  await page.loadRecords();
  assert.equal(page.data.selectedStyleIndex, 0, '失效筛选回到全部');
  page.data.editingOrderId = 1;
  const saving = page.saveRecordNote();
  page.onHide();
  finishSave();
  await saving;
  assert.equal(page.data.savingNote, false, '页面隐藏仍结束保存状态');
  assert.equal(page._refreshOnShow, true, '返回页面后刷新');
  console.log('美甲记录筛选刷新、分页、离开页面保存回归通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
