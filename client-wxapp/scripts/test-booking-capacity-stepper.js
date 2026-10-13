const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const file = path.resolve(__dirname, '../pages/technician/profile/index.js');
const localRequire = createRequire(file);
let page;

vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
  require: name => name === '../../../services/api' ? { technician: { bookingDays: {} } } : localRequire(name),
  Page: value => { page = value; },
  wx: {},
  console,
});

const context = {
  ...page,
  data: { ...page.data },
  setData(value) { Object.assign(this.data, value); },
};

context.changeDailyCapacity({ currentTarget: { dataset: { delta: 1 } } });
assert.equal(context.data.dailyBookingLimit, 3);
for (let i = 0; i < 20; i += 1) context.changeDailyCapacity({ currentTarget: { dataset: { delta: 1 } } });
assert.equal(context.data.dailyBookingLimit, 10, '每日接待人数上限应为 10');
for (let i = 0; i < 20; i += 1) context.changeDailyCapacity({ currentTarget: { dataset: { delta: -1 } } });
assert.equal(context.data.dailyBookingLimit, 1, '每日接待人数下限应为 1');

context.changeAppointmentBuffer({ currentTarget: { dataset: { delta: 15 } } });
assert.equal(context.data.appointmentBufferMinutes, 75);
for (let i = 0; i < 20; i += 1) context.changeAppointmentBuffer({ currentTarget: { dataset: { delta: 15 } } });
assert.equal(context.data.appointmentBufferMinutes, 180, '预约间隔上限应为 180 分钟');
for (let i = 0; i < 20; i += 1) context.changeAppointmentBuffer({ currentTarget: { dataset: { delta: -15 } } });
assert.equal(context.data.appointmentBufferMinutes, 15, '预约间隔下限应为 15 分钟');

const wxml = fs.readFileSync(file.replace('.js', '.wxml'), 'utf8');
const wxss = fs.readFileSync(file.replace('.js', '.wxss'), 'utf8');
const capacityMarkup = wxml.slice(wxml.indexOf('<view wx:if="{{showCapacityModal}}"'), wxml.indexOf('<!-- 低频信息按需展开'));
assert(!capacityMarkup.includes('<picker'), '接待能力弹层不应再打开二次选择器');
assert(wxml.includes('bindtap="changeDailyCapacity"'));
assert(wxml.includes('bindtap="changeAppointmentBuffer"'));
assert.match(wxss, /\.capacity-stepper-btn\s*\{[^}]*width:44px;[^}]*min-height:44px;/s, '加减按钮应满足 44px 触控尺寸');

console.log('Booking capacity steppers, ranges and touch sizes passed.');
