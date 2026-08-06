#!/usr/bin/env node

const assert = require('assert');
const {
  buildUsageItem,
  normalizeCurrentSubscription,
  normalizePlans
} = require('../utils/subscription');

assert.equal(buildUsageItem('客户', 20, 30).level, 'normal');
assert.equal(buildUsageItem('客户', 21, 30).level, 'notice');
assert.equal(buildUsageItem('客户', 27, 30).level, 'warning');
assert.equal(buildUsageItem('客户', 30, 30).level, 'limit');
assert.equal(buildUsageItem('客户', 40, null).limitText, '不限');

const subscription = normalizeCurrentSubscription({
  plan: {
    name: '免费版',
    features: ['booking'],
    maxCustomers: 30,
    maxMonthlyBookings: 30
  },
  usage: { customerCount: 21, monthlyBookings: 30 }
});

assert.equal(subscription.usageItems[0].percent, 70);
assert.equal(subscription.usageItems[0].level, 'notice');
assert.equal(subscription.usageItems[1].level, 'limit');
assert.equal(normalizePlans([{ billingCycle: 'monthly', maxCustomers: 30, maxMonthlyBookings: 30, maxWorks: 50 }])[0].cycle, '月');

console.log('订阅用量边界测试通过。');
