// 验证美甲记录页自动保存：800ms 防抖、失败落本机、重试、离页 flush
const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pageConfig;
global.getApp = () => ({ globalData: {} });
global.Page = (config) => { pageConfig = config; };

const storage = {};
const toasts = [];
global.wx = {
  getStorageSync: (key) => storage[key] || null,
  setStorageSync: (key, value) => { storage[key] = value; },
  removeStorageSync: (key) => { delete storage[key]; },
  showToast: (opts) => toasts.push(opts.title),
  showModal: ({ success }) => success({ confirm: false }),
  previewImage: () => {},
  navigateTo: () => {},
  navigateBack: () => {}
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = require('../services/api');
api.technician.orders.detail = async () => ({
  id: 12,
  status: 'in_progress',
  startTime: '2026-08-15T02:00:00.000Z',
  customerName: '小美',
  customer: {
    id: 9,
    name: '小美',
    profileFacts: [{ category: 'preference', content: '偏好短甲', status: 'active' }],
    serviceRecords: [{
      materials: '裸色胶、加固胶',
      tools: '短柄笔',
      nailCondition: '甲面偏薄',
      preferenceNotes: '偏好自然色'
    }]
  },
  intentWorks: [{ work: {
    id: 6,
    title: '法式渐变',
    preparation: { materials: '渐变胶', tools: '晕染笔', preparation: '提前试色' }
  } }],
  serviceRecord: { id: 3, status: 'draft', photos: [] }
});

function createPage() {
  global.__page = undefined;
  const name = require.resolve(path.join(ROOT, 'pages/technician/complete-service/index.js'));
  delete require.cache[name];
  require(name);
  const config = pageConfig;
  return {
    ...config,
    data: JSON.parse(JSON.stringify(config.data)),
    setData(patch, callback) {
      Object.keys(patch).forEach((key) => { this.data[key] = patch[key]; });
      if (callback) callback();
    }
  };
}

function type(page, field, value) {
  page.input({ currentTarget: { dataset: { field } }, detail: { value } });
}

(async () => {
  const saved = [];
  api.technician.orders.saveServiceRecord = async (id, payload) => {
    saved.push({ id, payload });
    return { id: 3, status: 'draft' };
  };

  const page = createPage();
  await page.onLoad({ id: '12' });
  assert.strictEqual(page.data.loaded, true, '页面应加载成功');
  assert.deepStrictEqual(page.data.preparations.map(item => item.title), ['法式渐变'], '应读取全部关联作品准备方案');
  assert.ok(page.data.materialSuggestions.includes('渐变胶') && page.data.materialSuggestions.includes('裸色胶'), '材料快捷项应合并作品方案与历史记录');
  assert.ok(page.data.toolSuggestions.includes('晕染笔') && page.data.toolSuggestions.includes('短柄笔'), '工具快捷项应合并作品方案与历史记录');
  assert.ok(page.data.nailConditionSuggestions.includes('甲面偏薄'), '甲面情况应复用历史记录');
  assert.ok(page.data.preferenceSuggestions.includes('偏好短甲') && page.data.preferenceSuggestions.includes('偏好自然色'), '偏好快捷项应复用客户档案与历史记录');

  type(page, 'materials', 'OPI');
  assert.strictEqual(saved.length, 0, '输入后应先等待防抖，不立即保存');
  await delay(300);
  type(page, 'materials', 'OPI #H42');
  await delay(600);
  assert.strictEqual(saved.length, 0, '持续输入应重置防抖计时');
  await delay(400);
  assert.strictEqual(saved.length, 1, '停止输入 800ms 后应保存一次');
  assert.strictEqual(saved[0].payload.materials, 'OPI #H42', '应保存最新内容');
  assert.ok(!Object.prototype.hasOwnProperty.call(saved[0].payload, 'profileFacts'), '自动保存不得将草稿观察写入长期客户档案');
  assert.strictEqual(page.data.saveState, 'saved', '保存成功应展示已保存状态');

  // 失败：落本机草稿并允许重试
  let failing = true;
  api.technician.orders.saveServiceRecord = async (id, payload) => {
    if (failing) throw new Error('网络失败');
    saved.push({ id, payload });
    return { id: 3, status: 'draft' };
  };
  type(page, 'tools', '打磨头');
  await delay(900);
  assert.strictEqual(page.data.saveState, 'failed', '保存失败应提示本机留存');
  assert.ok(storage.service_record_draft_12, '失败后应写入本机草稿');
  assert.strictEqual(page.data.saveErrorText, '自动保存失败，已存本机');

  failing = false;
  page.retrySave();
  await delay(60);
  assert.strictEqual(page.data.saveState, 'saved', '重试成功后应恢复已保存状态');
  assert.strictEqual(saved[saved.length - 1].payload.tools, '打磨头');
  assert.ok(!storage.service_record_draft_12, '保存成功后应清除本机草稿');

  // 离页立即 flush，不等待防抖
  type(page, 'careAdvice', '保持干燥');
  page.onHide();
  await delay(60);
  assert.strictEqual(saved[saved.length - 1].payload.careAdvice, '保持干燥', '离页应立刻保存未提交内容');

  console.log('Service-record autosave checks passed.');
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
