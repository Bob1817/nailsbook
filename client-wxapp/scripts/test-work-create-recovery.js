const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

let definition;
let storage = {};
const api = {
  technician: {
    tagTemplates: { create: async () => ({}) },
    works: {
      create: async () => { throw new Error('网络结果不明确'); },
      updateAccess: async () => {},
      update: async (id) => ({ id })
    }
  }
};

vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/work-edit/index.js'), 'utf8'), {
  require: () => api,
  Page: value => { definition = value; },
  wx: {
    getStorageSync: key => storage[key],
    setStorageSync: (key, value) => { storage[key] = value; },
    removeStorageSync: key => { delete storage[key]; },
    showLoading() {}, hideLoading() {}, showToast() {},
    showModal: ({ success }) => success({ confirm: true })
  },
  setTimeout: () => 0
});

function page() {
  return {
    ...definition,
    _pageActive: true,
    data: {
      ...JSON.parse(JSON.stringify(definition.data)),
      title: '春日作品',
      coverUrl: '/cover.jpg',
      standardPrice: '198',
      selectedServiceIds: ['service-1'],
      visibilityScope: 'public'
    },
    setData(values) { Object.assign(this.data, values); }
  };
}

(async () => {
  storage = {};
  const first = page();
  await first.handleSubmit();
  assert.equal(first.data.submitting, false);
  assert(storage.technician_work_create_intent);
  assert.match(storage.technician_work_create_intent.requestId, /^work-/);
  assert.equal(storage.technician_work_create_intent.payload.createRequestId, storage.technician_work_create_intent.requestId);

  const second = page();
  await second.restoreCreateIntent();
  assert.equal(second._createRequestId, storage.technician_work_create_intent.requestId);
  assert.equal(second.data.title, '春日作品');
  console.log('作品创建结果不明可跨会话恢复，并复用同一幂等请求键');
})().catch(error => { console.error(error); process.exitCode = 1; });
