const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let definition, calls, failAt, releaseCreate;
const api = { technician: { tagTemplates: { create: async () => ({}) }, works: {
  create: async payload => {
    calls.push(['create', payload]);
    if (releaseCreate) await new Promise(resolve => { releaseCreate = resolve; });
    return { id: 71 };
  },
  update: async (id, payload) => {
    calls.push(['update', id, payload]);
    if (payload.isVisible && failAt === 'publish') throw new Error('公开失败');
    return { id };
  },
  updateAccess: async (id, payload) => {
    calls.push(['access', id, payload]);
    if (failAt === 'access') throw new Error('权限保存失败');
  }
} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/work-edit/index.js'), 'utf8'), {
  require: () => api, Page: value => { definition = value; },
  wx: { showLoading() {}, hideLoading() {}, showToast() {} }, setTimeout: () => 0
});
function page(scope = 'authorized_clients') {
  return { ...definition, _pageActive: true,
    data: { ...JSON.parse(JSON.stringify(definition.data)), title: '作品', coverUrl: '/cover.jpg',
      standardPrice: '198', selectedServiceIds: ['1'], visibilityScope: scope,
      accessGrants: [{ customerId: 9, selectedOrderIndex: 0 }] },
    setData(values) { Object.assign(this.data, values); }
  };
}
(async () => {
  for (const scope of ['public', 'authorized_clients']) {
    for (const failure of ['access', 'publish']) {
      calls = []; failAt = failure;
      const p = page(scope);
      await p.handleSubmit();
      assert.equal(p.data.submitting, false);
      assert.equal(calls[0][1].isVisible, false, '新作品必须先隐藏');
      if (failure === 'access') assert(!calls.some(c => c[0] === 'update' && c[2].isVisible));
      failAt = '';
      await p.handleSubmit();
      assert.equal(calls.filter(c => c[0] === 'create').length, 1, '重试不能重复创建');
      assert(calls.filter(c => c[0] !== 'create').every(c => c[1] === 71));
      assert.equal(calls.at(-2)[0], 'access');
      assert.equal(calls.at(-1)[2].isVisible, true, '权限成功后才公开');
    }
  }
  calls = []; failAt = ''; releaseCreate = true;
  const p = page();
  p.data.uploading = true;
  await p.handleSubmit();
  assert.equal(calls.length, 0, '上传中不能保存');
  p.data.uploading = false;
  const pending = p.handleSubmit();
  await new Promise(resolve => setImmediate(resolve));
  await p.handleSubmit();
  assert.equal(calls.length, 1, '提交中重复点击不能发起第二次保存');
  releaseCreate();
  await pending;
  console.log('作品保存：权限／公开失败重试不重复创建、权限先于公开、上传与重复提交保护通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
