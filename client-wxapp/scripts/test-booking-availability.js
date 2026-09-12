const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const engine = require('../utils/booking-time-engine');
const pickerStyles = fs.readFileSync(path.join(__dirname, '../components/booking-time-picker/index.wxss'), 'utf8');
assert.match(
  pickerStyles,
  /\.btp-date-card\s*\{[^}]*height:\s*126rpx[^}]*min-height:\s*126rpx/s,
  '今天与后续日期卡片必须使用一致的固定高度',
);
let definition;
let artist;
let blocked = [];
let days = [];
let fail = false;
const api = {
  public: { artists: { detail: async () => ({ artist }) }, bookingSettings: async () => { if (fail) throw Error('offline'); return { days, blockedSlots: blocked }; } },
  client: { orders: { blockedSlots: async () => { if (fail) throw Error('offline'); return blocked; } } }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../components/booking-time-picker/index.js'), 'utf8'), {
  Component: value => { definition = value; },
  require: name => name.includes('booking-time-engine') ? engine : api,
  getApp: () => ({ globalData: { role: 'client' } }), Date, setTimeout, clearTimeout
});
const picker = {
  ...definition.methods,
  data: { ...definition.data, calendarYear: 2099, calendarMonth: 0, techId: 7,
    serviceType: 'shop', shopName: '测试店', serviceDate: '2099-01-05', startTime: '', durationMinutes: 60 },
  events: [],
  setData(value) { Object.assign(this.data, value); },
  triggerEvent(name, detail) { this.events.push({ name, detail }); }
};
const originalLoad = picker._loadTech;
const flush = () => new Promise(resolve => setTimeout(resolve, 5));
picker._loadTech = async function (id) { await originalLoad.call(this, id); await flush(); };
const day = () => picker.data.calendarDays.find(d => d.dateStr === '2099-01-05');
(async () => {
  artist = { acceptingBookings: true, shopAddresses: [{ name: '测试店', businessHours:
    Array.from({ length: 7 }, (_, weekday) => ({ weekday, start: '11:00', end: '15:00' })) }] };
  await picker._loadTech(7);
  assert.equal(picker.data._ready, true);
  days = [{ serviceDate: '2099-01-05', accepting: false, version: 1 }];
  await picker._loadTech(7);
  assert.equal(day().disabled, true, '停单日期禁用');
  assert.equal(day().label, '已停单');
  days = [];
  await picker._loadTech(7);
  assert.equal(day().disabled, false, '公开接口 artist 解包后可选日期');
  assert.equal(picker.data.timeSlotStatuses[0].time, '11:00');
  assert.equal(picker.data.timeSlotStatuses.at(-1).time, '14:00', '服务必须在营业结束前完成');
  picker.selectTime({ currentTarget: { dataset: { time: '14:00' } } });
  picker.data.durationMinutes = 120;
  picker._refreshTimeSlots();
  assert.equal(picker.data.startTime, '', '时长改变使原时段失效时清空');
  await flush();
  assert.equal(picker.events.at(-1).detail.startTime, '');
  blocked = [{ startTime: '2099-01-05T11:00:00', endTime: '2099-01-05T15:00:00' }];
  await picker._loadTech(7);
  assert.equal(day().disabled, true);
  assert.equal(day().label, '已约满');
  picker.data.serviceDate = '';
  picker.onSelectDate({ currentTarget: { dataset: { date: '2099-01-05' } } });
  assert.equal(picker.data.serviceDate, '', '满约日不能选');
  blocked = [];
  artist.serviceSchedule = { restDays: ['2099-01-05'] };
  await picker._loadTech(7);
  assert.equal(day().label, '不可约', '未设置方案也要遵守休息日');
  artist.acceptingBookings = false;
  await picker._loadTech(7);
  assert.equal(picker.data.paused, true);
  assert.equal(day().disabled, true);
  picker.selectTime({ currentTarget: { dataset: { time: '11:00' } } });
  assert.equal(picker.data.startTime, '');
  picker.contactArtist();
  assert.equal(picker.events.at(-1).name, 'contact');
  artist.acceptingBookings = true;
  artist.serviceSchedule = null;
  fail = true;
  await picker._loadTech(7);
  assert.equal(picker.data._ready, false, '占用加载失败不能假设空闲');
  assert.equal(day().disabled, true);
  fail = false;
  await picker._loadTech(7);
  assert.equal(picker.data.paused, false);
  assert.equal(day().disabled, false, '恢复接单可重新预约');
  await flush();
  const before = picker.events.length;
  picker._emitChange('2099-01-05', '', false);
  picker._emitChange('2099-01-05', '11:00', true);
  assert.equal(picker.events.length, before, 'observer 调用栈内不能同步通知父页面');
  await flush();
  assert.equal(picker.events.length, before + 1, '合并同轮重复通知');
  assert.equal(picker.events.at(-1).detail.startTime, '11:00');
  picker._emitChange('2099-01-05', '', false);
  definition.lifetimes.detached.call(picker);
  await flush();
  assert.equal(picker.events.length, before + 1, '卸载后取消通知');
  let pageDefinition;
  const pageFile = path.join(__dirname, '../pages/client/create-order/index.js');
  const toasts = [];
  let navigation;
  vm.runInNewContext(fs.readFileSync(pageFile, 'utf8'), {
    Page: value => { pageDefinition = value; },
    require: require('node:module').createRequire(pageFile),
    getApp: () => ({ globalData: { role: 'client', token: 'test-token' } }),
    wx: {
      getStorageSync: key => key === 'role' ? 'client' : key === 'client_token' ? 'test-token' : undefined,
      showToast: value => toasts.push(value.title),
      navigateTo: value => { navigation = value.url; }
    }
  });
  const page = { ...pageDefinition, data: { ...pageDefinition.data, selectedTech: { id: 7, name: '测试' }, selectedTechId: 7 },
    setData(value) { Object.assign(this.data, value); } };
  page.onBookingAvailability({ detail: { ready: true, paused: true } });
  page.handleSubmit();
  page.doSubmit();
  assert.equal(toasts.length, 2, '暂停接单阻止核对和实际提交');
  assert.equal(page.data.submitting, false);
  page.contactSelectedTech();
  assert(navigation.includes('techId=7'));
  page.onBookingAvailability({ detail: { ready: false, paused: false } });
  assert.equal(page.checkBookingAvailability(), false);
  page.onBookingAvailability({ detail: { ready: true, paused: false } });
  page.setData({ settingsReady: true });
  assert.equal(page.checkBookingAvailability(), true);
  const strip = { ...definition.methods, data: { ...definition.data, horizontal: true, _ready: true, paused: false,
    serviceType: 'home', techInfo: {}, serviceDate: '', closedDates: [] },
    setData(v) { Object.assign(this.data, v); }, _emitChange() {},
    _slotsForDate() { return [{ time: '12:00', occupied: false }]; } };
  strip._updateCalendar();
  const todayKey = strip.data.todayOption.dateStr;
  strip.data.serviceDate = todayKey;
  strip._updateCalendar();
  assert.equal(strip.data.todayOption.isSelected, true, '今天可约时允许默认选中');
  assert.equal(strip.data.calendarDays.length, 30);
  assert(strip.data.calendarDays.every(d => d.dateStr >= todayKey), '不展示过去日期');
  const last = strip.data.calendarDays.at(-1).dateStr;
  strip.loadMoreDates();
  assert.equal(strip.data.calendarDays.length, 60);
  assert(strip.data.calendarDays.at(-1).dateStr > last, '滚动加载跨月份的未来日期');
  strip.data.closedDates = [todayKey];
  strip._slotsForDate = () => [];
  strip._updateCalendar();
  assert.equal(strip.data.todayOption.label, '休息日');
  assert.equal(strip.data.todayOption.isSelected, false);
  assert.equal(strip.data.serviceDate, '', '休息日清除选中');
  strip.onSelectDate({ currentTarget: { dataset: { date: todayKey } } });
  assert.equal(strip.data.serviceDate, '', '休息日不可点击选中');
  strip.data.closedDates = [];
  strip._slotsForDate = () => [{ time: '12:00', occupied: true, reason: 'occupied' }];
  strip._updateCalendar();
  assert.equal(strip.data.todayOption.label, '已约满');
  strip.onSelectDate({ currentTarget: { dataset: { date: todayKey } } });
  assert.equal(strip.data.serviceDate, '', '约满日期不可选中');
  page.data.sourceWork = { serviceLines: [{ name: '同款服务' }] };
  page.data.selectedServiceIds = [];
  page.toggleService({ currentTarget: { dataset: { id: 99 } } });
  assert.equal(page.data.selectedServiceIds.length, 0, '同款服务不可修改');
  console.log('Booking availability checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
