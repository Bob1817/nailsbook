const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
(async () => {
  let definition;
  const pending = [];
  const api = {
    technician: { customers: { detail: () => new Promise((resolve, reject) => pending.push({ resolve, reject })) } },
    chat: { technician: { conversations: async () => [] } }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/customer-detail/index.js'), 'utf8'), {
    Page: value => { definition = value; },
    require: name => name.endsWith('/api') ? api : name.endsWith('/format') ? require('../utils/format') : require('../utils/order')
  });
  const page = { ...definition, customerId: 7, data: { ...definition.data }, setData(value) { Object.assign(this.data, value); } };
  const old = page.loadCustomer();
  const latest = page.loadCustomer();
  assert.equal(pending.length, 2, '保存后的刷新不能因旧请求在途而被忽略');
  pending[1].resolve({ id: 7, name: '新备注' }); await latest;
  pending[0].resolve({ id: 7, name: '旧备注' }); await old;
  assert.equal(page.data.customer.name, '新备注');
  const staleFailure = page.loadCustomer();
  const refresh = page.loadCustomer();
  pending[3].resolve({ id: 7, name: '最新资料' }); await refresh;
  pending[2].reject(new Error('旧请求失败')); await staleFailure;
  assert.equal(page.data.loadFailed, false);
  assert.equal(page.data.customer.name, '最新资料');
  const leaving = page.loadCustomer();
  page.onUnload();
  pending[4].resolve({ id: 7, name: '离页后返回' }); await leaving;
  assert.equal(page.data.customer.name, '最新资料');
  console.log('客户详情保存后刷新不丢失、旧响应与旧错误隔离、离页保护通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
