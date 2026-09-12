const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { buildSlotStatuses } = require('../utils/booking-time-engine');

const storage = { role: 'client', client_token: 'test-token' };
const toasts = [], requests = [], modals = [];
let destination = '', enabled = true;
const wx = {
  getStorageSync: key => storage[key], setStorageSync: (key, value) => { storage[key] = value; },
  removeStorageSync: key => { delete storage[key]; },
  showToast: value => toasts.push(value.title), showLoading() {}, hideLoading() {},
  navigateTo: value => { destination = value.url; }, reLaunch() {},
  showModal: async options => { modals.push(options); return { confirm: true }; }
};
global.wx = wx;
global.getApp = () => ({ globalData: {} });
const api = {
  public: { bookingSettings: async () => ({ quickBookingEnabled: enabled, days: [] }) },
  client: { orders: { create: async data => { requests.push(data); return { id: 1 }; } } },
  technician: { bookingDays: { list: async () => ({ days: [] }) }, orders: { quote: async (id, data) => requests.push({ id, ...data }) } }
};
function page(relative) {
  const file = path.join(__dirname, '..', relative);
  let definition;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    Page: value => { definition = value; }, wx,
    getApp: () => ({ globalData: { role: storage.role, token: storage.client_token } }),
    require: name => name.includes('services/api') ? api : createRequire(file)(name),
    console, setTimeout: () => 0, clearTimeout
  });
  return { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(data) { Object.assign(this.data, data); } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

(async () => {
  const booking = page('pages/client/create-order/index.js');
  booking.loadTechWorks = () => {};
  booking.data.technicians = [{ id: 7, name: '测试美甲师', status: 'active', shopService: true, shopAddresses: [{ name: '测试店' }], serviceItems: [] }];
  booking.selectTechById(7);
  await flush();
  assert.equal(booking.data.quickMode, true);
  Object.assign(booking.data, { serviceDate: '2099-01-05', startTime: '14:00', bookingReady: true });
  booking.applicationKey = 'quick-unit'; booking._pageActive = true;
  booking.handleSubmit();
  await flush();
  assert.equal(requests.length, 1, '仅时间即可提交，无服务名称和额外核对弹窗');
  assert.equal(requests[0].quickBooking, true);
  assert.equal(requests[0].shopAddress.name, '测试店');
  assert.equal(requests[0].selectedServiceIds, undefined);
  assert.equal(modals.length, 0, '同城无需弹出城市确认');

  enabled = false; booking.selectTechById(7); await flush();
  assert.equal(booking.data.quickMode, false, '未开放美甲师保留原模式');
  enabled = true; booking._fullMode = true; booking.selectTechById(7); await flush();
  assert.equal(booking.data.quickMode, false, '明确完整模式不被极简覆盖');

  booking.data.quickMode = true; booking.data.startTime = '14:00'; booking.data.selectedTech.invitationCode = 'NAIL7'; booking.applicationKey = 'resume-key';
  delete storage.client_token;
  assert.equal(booking.requireClientLogin(), false);
  assert.ok(destination.includes('redirect='));
  assert.ok(destination.includes('invite=NAIL7'), '登录和注册链路保留美甲师邀请码');
  assert.equal(storage.client_booking_application_draft.startTime, '14:00', '取消登录不丢时间');
  storage.client_token = 'test-token';

  const base = { serviceDate: '2099-01-05', slots: ['14:00', '20:30'], durationMinutes: 120,
    blockedSlots: [{ startTime: '2099-01-05T14:00:00', endTime: '2099-01-05T15:30:00' }], now: new Date('2099-01-04T00:00:00') };
  const unknown = buildSlotStatuses({ ...base, durationPending: true });
  assert.equal(unknown.find(item => item.time === '14:00').occupied, true);
  assert.equal(unknown.find(item => item.time === '20:30').occupied, false, '未知时长不按两小时屏蔽晚间意向');
  assert.equal(buildSlotStatuses(base).some(item => item.time === '20:30'), false, '已知时长仍校验完整服务');

  const tech = page('pages/technician/order-detail/index.js');
  tech.orderId = 9; tech.loadOrder = () => {};
  tech._rawOrder = { quoteVersion: 0, depositModeSnapshot: 'percentage', depositValueSnapshot: 2000 };
  Object.assign(tech.data, { quickBooking: true, quoteDate: '2099-01-05', quoteTime: '14:00',
    quoteServices: [{ id: 'base', price: 180, durationMinutes: 90 }], quoteSelectedServiceIds: ['base'], quoteServiceQuantities: { base: 1 },
    quoteSurcharges: [{ id: 'night', price: 20 }], quoteSurchargeIds: [] });
  tech.recalculateQuote();
  assert.equal(tech.data.quotePrice, '180');
  assert.equal(tech.data.quoteDepositAmount, '36');
  tech.toggleQuoteSurcharge({ currentTarget: { dataset: { id: 'night' } } });
  assert.equal(tech.data.quotePrice, '200');
  assert.equal(tech.data.quoteDepositAmount, '40', '比例定金按含附加费的最终总价计算');
  tech.onQuoteFinalPriceInput({ detail: { value: '190' } });
  assert.equal(tech.data.quoteDepositAmount, '38', '最终优惠后重算比例定金');
  await tech.submitQuote();
  assert.equal(requests.at(-1).finalPriceFen, 19000);
  assert.equal(requests.at(-1).surchargeIds[0], 'night');
  assert.equal(requests.at(-1).services[0].servicePublicId, 'base');
  assert.equal(requests.at(-1).depositAmount, undefined, '未人工覆盖的定金由后端按规则计算');
  console.log('极简提交、开关兼容、登录草稿、未知时长和美甲师三项确认检查通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
