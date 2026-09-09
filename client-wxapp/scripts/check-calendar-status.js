const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const file = path.resolve(__dirname, '../pages/technician/orders/index.js');
const localRequire = createRequire(file);
let page;
let fallback = false;
const orders = [
  { startTime: '2026-08-26T14:00:00', status: 'completed', quotePrice: 798 },
  { startTime: '2026-08-26T15:00:00', status: 'cancelled', quotePrice: 100 },
  { startTime: '2026-08-26T16:00:00', status: 'cancelled', quotePrice: 200, depositStatus: 'refunded' },
  { startTime: '2026-08-29T14:00:00', status: 'pending_shop', quotePrice: 300 },
  { startTime: '2026-08-27T14:00:00', status: 'cancelled', quotePrice: 400, depositStatus: 'refunded' }
];
vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
  require: name => name === '../../../services/api' ? { technician: { orders: {
    list: async () => orders,
    incomeCalendar: async () => { if (fallback) throw Error('offline'); return { orders }; }
  } } } : localRequire(name),
  Page: value => { page = value; },
  wx: { getStorageSync: key => key === 'role' ? 'technician' : '', showToast: value => { throw Error(value.title); } },
  Date, console
});
(async () => {
  for (fallback of [false, true]) {
    const ctx = { ...page, data: { todayKey: '2026-08-28' }, _today: new Date(2026, 7, 28), _activeDate: new Date(2026, 7, 28),
      setData(value) { Object.assign(this.data, value); }, _recompute() {} };
    await ctx.loadOrders();
    const mixed = ctx._incomeMeta('2026-08-26');
    assert.equal(mixed.text, '¥798');
    assert.equal(mixed.statuses.map(s => s.tone).join(','), 'income,cancelled,refunded');
    assert.equal(ctx._incomeMeta('2026-08-27').text, '');
    assert.equal(ctx._incomeMeta('2026-08-27').statuses[0].tone, 'refunded');
    assert.equal(ctx._incomeMeta('2026-08-29').type, 'estimated');
    assert.equal(ctx._incomeMeta('2026-08-29').text, '¥300');
    assert.equal(ctx._incomeMeta('2026-08-30').statuses.length, 0);
  }
  const css = fs.readFileSync(file.replace('.js', '.wxss'), 'utf8');
  assert(css.includes('.date-cell-active .date-income-actual { color:var(--nb-inverse); }'));
  assert(css.includes('.calendar-selected .calendar-income-actual { color:var(--nb-inverse); }'));
  const wxml = fs.readFileSync(file.replace('.js', '.wxml'), 'utf8');
  assert(!wxml.includes('class="date-dot'));
  assert.equal((wxml.match(/class="date-number-row"/g) || []).length, 1);
  assert.equal((wxml.match(/class="date-week-row"/g) || []).length, 2);
  assert(css.includes('width:6rpx; height:6rpx;'));
  assert(!css.includes('box-shadow:0 0 0 2rpx'));
  const rule = selector => css.slice(css.indexOf(selector + ' {')).split('}')[0];
  assert(rule('.tabs').includes('align-items: center'));
  assert(rule('.tab-more-btn').includes('min-height: 88rpx'));
  assert(!rule('.tab-more-btn').includes('margin-bottom'));
  assert(rule('.tab-line').includes('height: 2rpx'));
  assert(rule('.tab-line').includes('width: 28rpx'));
  assert(!rule('.tab-active').includes('font-size'));
  const menu = fs.readFileSync(path.resolve(__dirname, '../components/tab-bar/index.wxss'), 'utf8');
  assert(menu.includes('padding: 12rpx 0;'));
  assert(menu.includes('color: var(--nb-text-link)'));
  assert(menu.includes('font-weight: var(--weight-bold)'));
  console.log('Calendar income, cancellation, refund, fallback and selected contrast checks passed.');
})().catch(err => { console.error(err); process.exitCode = 1; });
