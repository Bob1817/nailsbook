const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildSlotStatuses } = require('../utils/booking-time-engine');

const schedule = {
  schemes: [{ id: 'active', days: ['mon'], startTime: '10:00', endTime: '18:00' }],
  activeSchemeId: 'active',
  restDays: ['2026-08-10']
};
const shop = {
  name: '门店A',
  businessHours: [{ weekday: 1, start: '09:00', end: '17:00', closed: false }]
};
const slots = ['09:30', '10:00', '14:30', '15:00', '15:30', '17:00'];

const base = buildSlotStatuses({
  serviceDate: '2026-08-03',
  serviceSchedule: schedule,
  shopMode: true,
  shop,
  durationMinutes: 120,
  slots,
  blockedSlots: [],
  now: new Date('2026-08-01T10:00:00')
});
assert.deepStrictEqual(base.map(item => item.time), ['10:00', '14:30', '15:00']);

const occupied = buildSlotStatuses({
  serviceDate: '2026-08-03',
  serviceSchedule: schedule,
  shopMode: true,
  shop,
  durationMinutes: 120,
  slots,
  blockedSlots: [{ orderId: 9, startTime: '2026-08-03T16:00:00', endTime: '2026-08-03T17:00:00' }],
  now: new Date('2026-08-01T10:00:00')
});
assert.strictEqual(occupied.find(item => item.time === '14:30').occupied, true, '完整服务区间与占用重叠时必须禁用');
assert.strictEqual(occupied.find(item => item.time === '15:00').occupied, true);

const editing = buildSlotStatuses({
  serviceDate: '2026-08-03', serviceSchedule: schedule, shopMode: true, shop,
  durationMinutes: 120, slots, blockedSlots: [{ orderId: 9, startTime: '2026-08-03T15:00:00', endTime: '2026-08-03T17:00:00' }],
  excludeOrderId: 9, now: new Date('2026-08-01T10:00:00')
});
assert.strictEqual(editing.find(item => item.time === '15:00').occupied, false, '编辑时必须排除当前订单');

assert.deepStrictEqual(buildSlotStatuses({
  serviceDate: '2026-08-10', serviceSchedule: schedule, shopMode: true, shop,
  durationMinutes: 60, slots, blockedSlots: [], now: new Date('2026-08-01T10:00:00')
}), [], '美甲师休息日即使门店营业也不可预约');

const root = path.join(__dirname, '..');
const apiSource = fs.readFileSync(path.join(root, 'services/api.js'), 'utf8');
assert(!apiSource.includes("api.get(`${T}/orders/blocked-slots`)"), '美甲师端不能依赖尚未部署的占用专用路由');
assert.match(apiSource, /blockedSlots:[\s\S]*api\.get\(`\$\{T\}\/orders`\)/, '美甲师端应从兼容的订单列表派生占用');
const entryFiles = [
  'pages/client/create-order/index.wxml',
  'pages/client/order-detail/index.wxml',
  'pages/technician/edit-booking-time/index.wxml'
];
entryFiles.forEach(file => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.match(source, /<booking-time-picker/, `${file} 必须使用统一预约时间组件`);
  assert.match(source, /duration-minutes=/, `${file} 必须传入服务时长`);
});

console.log('Booking time engine checks passed.');
