const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

(async () => {
  let definition, timer, cancelled = 0;
  const pending = [];
  const api = {
    technician: { customers: { list: params => new Promise((resolve, reject) => pending.push({ params, resolve, reject })) } },
    chat: { technician: { conversations: async () => [] } }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/customers/index.js'), 'utf8'), {
    Page: value => { definition = value; },
    require: name => name.endsWith('/api') ? api : {},
    setTimeout: fn => { timer = fn; return 1; }, clearTimeout: () => { timer = null; cancelled++; }
  });
  const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(values) { Object.assign(this.data, values); } };
  page.data.keyword = '旧';
  const oldRequest = page.loadCustomers();
  page.onKeywordInput({ detail: { value: '新' } });
  pending[0].resolve([{ id: 1, name: '旧客户' }]);
  await oldRequest;
  assert.equal(page.data.customers.length, 0, '新输入的防抖等待期间也不能应用旧结果');
  const newRequest = page.loadCustomers();
  pending[1].resolve([{ id: 2, name: '新客户' }]);
  await newRequest;
  assert.equal(page.data.customers[0].id, 2);
  const failingOld = page.loadCustomers();
  const latest = page.loadCustomers();
  pending[3].resolve([{ id: 3, name: '最新客户' }]);
  await latest;
  pending[2].reject(new Error('旧请求失败'));
  await failingOld;
  assert.equal(page.data.loadFailed, false);
  assert.equal(page.data.customers[0].id, 3);
  page.clearKeyword();
  assert.ok(cancelled > 0);
  assert.equal(timer, null);
  assert.equal(pending[4].params.search, undefined);
  page.onUnload();
  pending[4].resolve([{ id: 4 }]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.data.customers[0].id, 3, '离开页面后不再写入请求结果');
  console.log('客户搜索旧响应隔离、防抖取消、旧失败隔离及离页保护通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
