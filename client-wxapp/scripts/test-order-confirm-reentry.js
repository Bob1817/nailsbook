const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let definition, calls = [], release, fail = false;
const api = { technician: { orders: { confirm: async (id, payload) => {
  calls.push({ id, payload });
  if (fail) throw new Error('网络失败');
  await new Promise(resolve => { release = resolve; });
} } } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../components/booking-confirm/index.js'), 'utf8'), {
  Component: value => { definition = value; },
  require: name => name.includes('services/api') ? api : { requestBookingReminder: async () => {}, formatBookingDate: () => '9月9日 周三', formatClock: () => '10:30' },
  wx: { showToast() {} }
});
const watchdog = setTimeout(() => { console.error('确认表单测试超时'); process.exit(1); }, 3000);
const tick = () => new Promise(resolve => setImmediate(resolve));
const events = [];
const form = { ...definition.methods, data: { ...definition.data, order: { id: 7 } }, setData(value) { Object.assign(this.data, value); }, triggerEvent(name) { events.push(name); } };
(async () => {
  form.resetForm({ price: 696, depositAmount: 0 });
  assert.equal(form.data.price, '696');
  form.close(); assert.deepEqual(events, ['close']); events.length = 0;
  for (const [price, deposit] of [['', '0'], ['0', '0'], ['-1', '0'], ['598.001', '0'], ['598', '-1'], ['598', '599'], ['598', '0.001']]) {
    form.setData({ price, deposit }); await form.submit(); assert(form.data.error);
  }
  assert.equal(calls.length, 0);
  form.setData({ price: '598', deposit: '100', depositPaid: true });
  const pending = form.submit(); await tick(); await form.submit();
  assert.equal(calls.length, 1, '重复点击只提交一次');
  form.close(); assert.equal(events.length, 0, '提交时不能关闭');
  assert.equal(JSON.stringify(calls[0]), JSON.stringify({ id: 7, payload: { price: 598, depositAmount: 100, isDepositPaid: true } }));
  release(); await pending; assert.deepEqual(events, ['saved']); assert.equal(form.data.submitting, false);
  fail = true; await form.submit(); assert.equal(form.data.error, '网络失败'); assert.equal(form.data.price, '598');
  assert.equal(form.data.submitting, false);
  fail = false; const retry = form.submit(); await tick(); release(); await retry;
  assert.equal(calls.length, 3, '失败后保留输入并可重试');
  form.onDeposit({ detail: { value: '0' } }); assert.equal(form.data.depositPaid, false);
  for (const pageName of ['home', 'order-detail']) {
    const markup = fs.readFileSync(path.join(__dirname, `../pages/technician/${pageName}/index.wxml`), 'utf8');
    assert(markup.includes('<booking-confirm'), '两个入口复用同一确认表单');
  }
  clearTimeout(watchdog);
  console.log('确认表单：回填、金额校验、定金提交、防重、取消、失败重试通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
