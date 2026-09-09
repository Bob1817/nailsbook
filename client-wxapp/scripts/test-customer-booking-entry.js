const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
let page, destination = '', toast = '';
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/customer-detail/index.js'), 'utf8'), {
  require: () => ({}), Page: value => { page = value; }, Date,
  wx: { navigateTo: value => { destination = value.url; }, showToast: value => { toast = value.title; } }
});
const context = { customerId: 10, data: { customer: { clientUserId: 71, _displayName: '客户 A' } } };
page.newOrder.call(context);
assert(destination.includes('clientId=71&'));
assert(!destination.includes('clientId=10&'), '档案ID不能当作聊天账号ID');
destination = '';
context.data.customer.clientUserId = null;
page.newOrder.call(context);
assert.equal(destination, '', '无账号客户不得进入错误聊天');
assert(toast.includes('尚未关联'));
console.log('客户预约联系入口：账号ID与档案ID分离、未关联账号拦截通过');
