const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

let definition;
let resolveFirst;
let callCount = 0;
const api = {
  technician: {
    auth: {
      bindingApplications: () => {
        callCount += 1;
        if (callCount === 1) return new Promise(resolve => { resolveFirst = resolve; });
        return Promise.resolve([{ id: 2, name: '新客户' }]);
      }
    }
  }
};

vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/binding-applications/index.js'), 'utf8'), {
  require: () => api,
  Page: value => { definition = value; },
  wx: { stopPullDownRefresh() {}, showToast() {}, showModal() {} }
});

(async () => {
  const page = {
    ...definition,
    data: { ...definition.data },
    setData(values) { Object.assign(this.data, values); }
  };
  const first = page.loadApplications();
  const second = page.loadApplications();
  await second;
  resolveFirst([{ id: 1, name: '旧客户' }]);
  await first;
  assert.deepEqual(page.data.applications.map(item => item.id), [2]);

  const wxml = fs.readFileSync(path.join(__dirname, '../pages/technician/binding-applications/index.wxml'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../pages/technician/binding-applications/index.wxss'), 'utf8');
  assert.equal((wxml.match(/booking-action/g) || []).length, 3);
  assert(css.includes("@import '../../../styles/booking-actions.wxss'"));
  console.log('绑定申请旧响应隔离、重试状态和预约卡片按钮规格检查通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
