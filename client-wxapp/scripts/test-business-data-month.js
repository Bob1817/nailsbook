const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let definition;
const requests = [];
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/business-data/index.js'), 'utf8'), {
  Page: value => { definition = value; },
  require: name => name.includes('api') ? { technician: { insights: { overview: params => new Promise(resolve => requests.push({ params, resolve })) } } } : { formatMoney: String },
  wx: { getStorageSync: () => 'technician', stopPullDownRefresh() {} }, Date,
});
(async () => {
  const page = { ...definition, data: { ...definition.data }, setData(value) { Object.assign(this.data, value); }, formatOverview: value => value.marker };
  page.onLoad();
  assert.equal(requests[0].params.month, new Date(Date.now() + 28800000).toISOString().slice(0, 7));
  page.setData({ minMonth: '2025-12', maxMonth: '2026-08', selectedMonth: '2026-08' });
  page.onMonthChange({ detail: { value: '2025-11' } });
  page.onMonthChange({ detail: { value: '2026-09' } });
  assert.equal(requests.length, 1);
  page.onMonthChange({ detail: { value: '2025-12' } });
  page.onMonthChange({ detail: { value: '2026-01' } });
  const period = { selectedMonth: '2026-01', minMonth: '2025-12', maxMonth: '2026-08', monthStart: '2025-12-31T16:00:00.000Z', endExclusive: '2026-01-31T16:00:00.000Z' };
  requests[2].resolve({ period, marker: 'January' });
  await new Promise(resolve => setImmediate(resolve));
  requests[1].resolve({ period: { ...period, selectedMonth: '2025-12' }, marker: 'December' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.data.overview, 'January');
  assert.equal(page.exportRange().endDate, '2026-01-31T15:59:59.999Z');
  const pending = page.loadOverview();
  requests[3].resolve({ period: {}, marker: 'Wrong current month' });
  await pending;
  assert.equal(page.data.overview, null);
  assert.ok(page.data.error);
  console.log('经营月份默认值、跨年边界、竞态隔离、导出范围及旧后端防误显检查通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
