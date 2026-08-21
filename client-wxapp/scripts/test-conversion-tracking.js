const assert = require('assert');

const storage = {};
global.wx = {
  getStorageSync(key) { return storage[key]; },
  setStorageSync(key, value) { storage[key] = value; }
};

const api = require('../services/api');
let recorded;
api.public.conversionEvents.record = (event) => {
  recorded = event;
  return Promise.resolve({ recorded: true });
};

const { buildConversionEvent, trackConversion } = require('../utils/conversion-tracking');

async function main() {
  const first = buildConversionEvent({ technicianId: '7', eventType: 'artist_view', source: 'artist_home' });
  const second = buildConversionEvent({ technicianId: 7, workId: '12', eventType: 'work_view', source: 'public_work' });
  assert.strictEqual(first.technicianId, 7);
  assert.strictEqual(second.workId, 12);
  assert.strictEqual(first.visitorId, second.visitorId);
  assert.notStrictEqual(first.eventId, second.eventId);
  assert.strictEqual(buildConversionEvent({ technicianId: 0, eventType: 'artist_view' }), null);
  assert.strictEqual(buildConversionEvent({ technicianId: 7, eventType: 'unknown' }), null);
  assert.strictEqual(await trackConversion({ technicianId: 7, eventType: 'booking_intent', source: 'artist_home' }), true);
  assert.strictEqual(recorded.eventType, 'booking_intent');
  console.log('Conversion tracking checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
