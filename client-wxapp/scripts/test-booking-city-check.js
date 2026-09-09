const assert = require('node:assert/strict');
const { normalizeCity, cityFromLocation, evaluateBookingCity } = require('../utils/booking-location');

assert.equal(normalizeCity('杭州市'), '杭州');
assert.equal(cityFromLocation({ city: '上海市' }), '上海市');
assert.equal(evaluateBookingCity({ city: '杭州市' }, { city: '杭州' }).mismatch, false);
assert.equal(evaluateBookingCity({ city: '上海市' }, { city: '杭州市' }).mismatch, true);
const far = evaluateBookingCity(
  { latitude: 31.2304, longitude: 121.4737 },
  { city: '杭州市', shopAddresses: [{ enabled: true, latitude: 30.2741, longitude: 120.1551 }] }
);
assert.equal(far.mismatch, true);
assert.ok(far.distance > 100);
console.log('预约定位城市标准化、跨城识别与距离兜底检查通过');
