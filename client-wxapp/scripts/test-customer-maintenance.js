const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
(async () => {
  let definition, modal, timer, archiveCalls = 0, modalCalls = 0, failArchive = true, rejectRemark;
  const api = { technician: { customers: {
    updateName: () => new Promise((resolve, reject) => { rejectRemark = reject; }),
    archive: async () => { archiveCalls++; if (failArchive) throw new Error('网络失败'); }
  } } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/customer-detail/index.js'), 'utf8'), {
    Page: value => { definition = value; }, require: () => api,
    wx: { showToast() {}, showModal(value) { modal = value; modalCalls++; } },
    setTimeout: callback => { timer = callback; return 1; }, clearTimeout: () => { timer = null; }
  });
  const page = { ...definition, customerId: 7, data: { ...definition.data, customer: { _remarkName: '原备注' }, remarkDraft: '待保存', showRemarkEdit: true }, setData(value) { Object.assign(this.data, value); } };
  const saving = page.saveRemark();
  page.onRemarkInput({ detail: { value: '不能修改' } });
  page.closeRemarkEdit(); page.openRemarkEdit();
  assert.equal(page.data.remarkDraft, '待保存');
  assert.equal(page.data.showRemarkEdit, true);
  rejectRemark(new Error('网络失败')); await saving;
  assert.equal(page.data.savingRemark, false);
  assert.equal(page.data.remarkDraft, '待保存');
  page.archiveCustomer(); page.archiveCustomer();
  assert.equal(modalCalls, 1);
  await modal.success({ confirm: false });
  assert.equal(archiveCalls, 0);
  assert.equal(page.data.archiving, false);
  page.archiveCustomer();
  const failing = modal.success({ confirm: true });
  page.archiveCustomer();
  assert.equal(modalCalls, 2);
  await failing;
  assert.equal(archiveCalls, 1);
  assert.equal(page.data.archiving, false);
  failArchive = false;
  page.archiveCustomer(); await modal.success({ confirm: true });
  assert.equal(archiveCalls, 2);
  assert.equal(page.data.archiving, true);
  assert.equal(typeof timer, 'function');
  page.onUnload(); assert.equal(timer, null);
  console.log('客户备注保存互斥、归档确认防重、取消失败恢复及离页清理通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
