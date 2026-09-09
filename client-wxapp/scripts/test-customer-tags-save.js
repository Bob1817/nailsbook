const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
(async () => {
  let definition;
  const pending = [];
  const api = { technician: {
    tagTemplates: { create: async () => ({}) },
    customers: { updateTags: (id, tags) => new Promise((resolve, reject) => pending.push({ id, tags, resolve, reject })) }
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/customer-detail/index.js'), 'utf8'), {
    Page: value => { definition = value; }, require: () => api, wx: { showToast() {} }
  });
  const page = { ...definition, customerId: 7, data: { ...definition.data, customer: { _tags: ['旧标签'] }, editTags: ['常客'], newTag: '待添加', allTags: ['常客', '简约'], showTagEdit: true },
    setData(values) { for (const [key, value] of Object.entries(values)) {
      if (key.startsWith('customer.')) this.data.customer[key.slice(9)] = value;
      else this.data[key] = value;
    } }, loadAllTags() {} };
  const first = page.saveTags();
  await page.saveTags();
  page.removeTag({ currentTarget: { dataset: { tag: '常客' } } });
  page.addExistingTag({ currentTarget: { dataset: { tag: '简约' } } });
  page.addNewTag(); page.closeTagEdit(); page.openTagEdit();
  page.onNewTagInput({ detail: { value: '不应修改' } });
  assert.equal(page.data.editTags.join(','), '常客');
  assert.equal(page.data.newTag, '待添加');
  assert.equal(page.data.showTagEdit, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pending.length, 1);
  pending[0].reject(new Error('网络失败')); await first;
  assert.equal(page.data.savingTags, false);
  assert.equal(page.data.customer._tags[0], '旧标签');
  assert.equal(page.data.showTagEdit, true);
  const retry = page.saveTags();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pending[1].tags, '常客');
  pending[1].resolve(); await retry;
  assert.equal(page.data.customer._tags.join(','), pending[1].tags);
  assert.equal(page.data.customer.tags, pending[1].tags);
  assert.equal(page.data.showTagEdit, false);
  console.log('客户标签保存防重、编辑关闭互斥、失败保留及提交结果一致性通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
