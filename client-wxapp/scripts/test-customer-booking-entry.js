const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
let page, destination = '', toast = '';
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/customer-detail/index.js'), 'utf8'), {
  require: () => ({}), Page: value => { page = value; }, Date,
  wx: { navigateTo: value => { destination = value.url; }, showToast: value => { toast = value.title; } }
});
const context = { customerId: 10, data: { customer: { id: 10, clientUserId: 71, _displayName: '客户 A' } } };
page.newOrder.call(context);
assert(destination.includes('customerId=10'), '创建预约必须传客户档案 ID，由后端核验其绑定账号');
assert(!destination.includes('clientId='), '创建预约页不直接接收可伪造的客户账号 ID');
destination = '';
context.data.customer.clientUserId = null;
page.newOrder.call(context);
assert.equal(destination, '', '无账号客户不得进入错误聊天');
assert(toast.includes('尚未关联'));
console.log('美甲师代客预约入口：客户档案与账号关联校验通过');
