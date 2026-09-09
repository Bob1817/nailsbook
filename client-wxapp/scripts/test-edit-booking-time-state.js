const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
(async () => {
  let definition, failLoad = true, resolveSave, rejectSave, calls = 0, timer;
  const api = { technician: {
    auth: { async getUserInfo() { if (failLoad) throw new Error('offline'); return { id: 3 }; } },
    orders: { update: () => { calls++; return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); } }
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/edit-booking-time/index.js'), 'utf8'), {
    Page: value => { definition = value; }, require: () => api,
    wx: { showToast() {}, showLoading() {}, hideLoading() {} }, getCurrentPages: () => [],
    setTimeout: fn => { timer = fn; return 1; }, clearTimeout: () => { timer = null; }
  });
  const page = { ...definition, orderId: 7, data: { ...definition.data, selectedDate: '2026-09-08', selectedTime: '10:00' }, setData(value) { Object.assign(this.data, value); } };
  await page._loadTechInfo(); await page.saveTime();
  assert.equal(calls, 0);
  assert.ok(page.data.loadError);
  failLoad = false; await page._loadTechInfo();
  const first = page.saveTime(); await page.saveTime();
  assert.equal(calls, 1);
  page.onTimeChange({ detail: { serviceDate: '2026-09-09', startTime: '12:00' } });
  assert.equal(page.data.selectedTime, '10:00');
  rejectSave(new Error('offline')); await first;
  assert.equal(page.data.saving, false);
  assert.equal(page.data.saved, false);
  const retry = page.saveTime(); resolveSave(); await retry;
  await page.saveTime();
  assert.equal(calls, 2, '保存成功后等待返回期间不能重复提交');
  assert.equal(page.data.saved, true);
  page.onUnload(); assert.equal(timer, null);
  console.log('修改预约时间加载重试、保存防重、失败恢复及成功锁定通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
