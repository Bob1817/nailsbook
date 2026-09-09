const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

(async () => {
  let definition;
  const creates = [], completes = [];
  const customers = {
    createFollowUp: (id, payload) => new Promise((resolve, reject) => creates.push({ id, payload, resolve, reject })),
    completeFollowUp: (customerId, id) => new Promise((resolve, reject) => completes.push({ customerId, id, resolve, reject }))
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/customer-detail/index.js'), 'utf8'), {
    Page: value => { definition = value; }, require: () => ({ technician: { customers } }), wx: { showToast() {} }
  });
  const page = { ...definition, customerId: 7, data: JSON.parse(JSON.stringify(definition.data)), setData(values) { Object.assign(this.data, values); }, async loadCustomer() {} };
  page.data.followUpContent = '提醒护理';
  page.data.followUpDate = '2026-09-08';
  const first = page.createFollowUp();
  await page.createFollowUp();
  assert.equal(creates.length, 1);
  page.data.followUpContent = '新的跟进';
  creates[0].resolve(); await first;
  assert.equal(page.data.followUpContent, '新的跟进');
  const second = page.createFollowUp();
  creates[1].reject(new Error('网络失败')); await second;
  assert.equal(page.data.followUpContent, '新的跟进');
  assert.equal(page.data.savingFollowUp, false);
  const retry = page.createFollowUp();
  creates[2].resolve(); await retry;
  assert.equal(page.data.followUpContent, '');
  const event = { currentTarget: { dataset: { id: 11 } } };
  const completing = page.completeFollowUp(event);
  await page.completeFollowUp(event);
  assert.equal(completes.length, 1);
  assert.equal(page.data.completingFollowUpId, 11);
  completes[0].reject(new Error('网络失败')); await completing;
  assert.equal(page.data.completingFollowUpId, '');
  const retryComplete = page.completeFollowUp(event);
  completes[1].resolve(); await retryComplete;
  assert.equal(page.data.completingFollowUpId, '');
  console.log('客户跟进防重复、提交期间新输入保留及失败重试通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
