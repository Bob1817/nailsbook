const assert = require('assert');
const { summarizeServices } = require('../utils/service-pricing');

const summary = summarizeServices([
  { id: 'care', price: 88, durationMinutes: 45 },
  { id: 'french', price: 168, durationMinutes: 75 },
], ['care', 'french']);

assert.deepStrictEqual(summary, {
  count: 2,
  totalPrice: 256,
  totalDurationMinutes: 120,
});

assert.deepStrictEqual(summarizeServices([], ['missing']), {
  count: 0,
  totalPrice: 0,
  totalDurationMinutes: 0,
});

console.log('Service pricing checks passed.');
