const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function setup(capabilities, failure) {
  const calls = [];
  const context = { module: { exports: {} }, Date, require: name => name.includes('utils/request') ? {
    get: async url => {
      calls.push(url);
      if (url.endsWith('/capabilities')) {
        if (failure) throw failure;
        return capabilities;
      }
      return { quickBookingEnabled: true };
    }, patch: async url => { calls.push(url); }
  } : {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/api.js'), 'utf8'), context);
  return { api: context.module.exports, calls };
}
(async () => {
  const legacy = setup({ wechatLogin: { available: false } });
  await assert.rejects(legacy.api.public.bookingSettings(55), err => err.bookingSettingsUnsupported === true);
  await assert.rejects(legacy.api.technician.bookingDays.list());
  await assert.rejects(legacy.api.technician.bookingDays.update('2099-01-01', { accepting: false }));
  assert.deepEqual(legacy.calls, ['/api/public/capabilities'], 'old servers must not receive new endpoint requests');
  const modern = setup({ bookingSettings: { available: true } });
  assert.equal((await modern.api.public.bookingSettings(55)).quickBookingEnabled, true);
  await modern.api.technician.bookingDays.list();
  assert.deepEqual(modern.calls, ['/api/public/capabilities', '/api/public/booking-settings/55', '/api/technician/booking-days']);
  const failing = setup(null, { code: 500 });
  await assert.rejects(failing.api.public.bookingSettings(55), err => err.code === 500 && !err.bookingSettingsUnsupported);
  await assert.rejects(failing.api.public.bookingSettings(55));
  assert.equal(failing.calls.length, 2, 'network failures remain errors and can be retried');
  console.log('预约接口能力协商：旧后端零新增接口请求、新后端正常调用、服务错误保留并可重试。');
})().catch(err => { console.error(err); process.exitCode = 1; });
