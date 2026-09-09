const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let definition, resolveCreate, calls = [];
const api = { technician: { tagTemplates: {
  create: payload => { calls.push(payload); return new Promise(resolve => { resolveCreate = resolve; }); }
} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/tag-management/index.js'), 'utf8'), {
  Page: value => { definition = value; }, require: name => name.includes('services/api') ? api : {},
  wx: { showToast() {} }
});
function page() {
  return { ...definition, data: { ...definition.data, newTag: '常客', canAddTag: true },
    setData(v) { Object.assign(this.data, v); }, loadTags: async () => {} };
}
(async () => {
  for (const next of [{ activeType: 'work', newTag: '法式' }, { newTag: '复购' }, null]) {
    const p = page();
    const pending = p.addTag();
    const before = calls.length;
    await p.addTag();
    assert.equal(calls.length, before);
    if (next) p.setData(next);
    resolveCreate({}); await pending;
    assert.equal(p.data.newTag, next ? next.newTag : '');
    assert.equal(p.data.adding, false);
    assert.equal(calls.at(-1).type, 'customer');
  }
  console.log('标签保存：分类与新输入保留、原输入清理、重复提交拦截通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
