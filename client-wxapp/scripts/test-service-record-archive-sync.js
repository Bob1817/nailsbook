const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
let pageConfig;
global.getApp = () => ({ globalData: {} });
global.Page = config => { pageConfig = config; };
global.wx = {
  getStorageSync: () => null,
  removeStorageSync: () => {},
  showToast: () => {},
  navigateTo: () => {},
  navigateBack: () => {},
  previewImage: () => {}
};

const api = require('../services/api');
api.technician.orders.detail = async () => ({
  id: 21,
  orderNo: 'OD21',
  status: 'completed',
  startTime: '2026-10-26T02:00:00.000Z',
  customer: { id: 5, name: '测试客户', profileFacts: [
    { category: 'preference', content: '偏好自然色', sourceRecordId: 31, confirmationCount: 2, lastConfirmedAt: '2026-10-26T04:00:00.000Z', status: 'active' },
    { category: 'preference', content: '偏好短甲', sourceRecordId: 22, confirmationCount: 1, lastConfirmedAt: '2026-10-20T04:00:00.000Z', status: 'active' }
  ] },
  sourceWork: { id: 8, title: '测试作品', preparation: {
    tools: '标准笔',
    materials: '标准胶',
    steps: '标准步骤',
    estimatedMinutes: 90,
    sourceRecordId: 22,
    updatedAt: '2026-10-20T04:00:00.000Z',
    version: 1
  } },
  serviceRecord: {
    id: 31,
    updatedAt: '2026-10-26T05:00:00.000Z',
    status: 'complete',
    actualStartTime: '2026-10-26T02:00:00.000Z',
    actualEndTime: '2026-10-26T04:00:00.000Z',
    nailCondition: '甲面正常',
    reactionLevel: 'normal',
    tools: '标准笔、点钻笔',
    materials: '标准胶、银色钻饰',
    techniques: '调整后的制作步骤',
    preferenceNotes: '偏好自然色',
    photos: [
      { stage: 'before', url: 'https://img/before.jpg' },
      { stage: 'after', url: 'https://img/after.jpg' }
    ]
  }
});

function createPage() {
  const file = require.resolve(path.join(root, 'pages/technician/complete-service/index.js'));
  delete require.cache[file];
  require(file);
  return {
    ...pageConfig,
    data: JSON.parse(JSON.stringify(pageConfig.data)),
    setData(patch, callback) {
      Object.assign(this.data, patch);
      if (callback) callback();
    }
  };
}

(async () => {
  const detailWxml = fs.readFileSync(path.join(root, 'pages/technician/complete-service/index.wxml'), 'utf8');
  assert.match(detailWxml, /美甲记录[\s\S]*客户档案[\s\S]*作品档案/, '详情页应连续展示三类核心信息');
  assert.doesNotMatch(detailWxml, /<swiper|<tab/, '三类核心信息不应使用 Tab 或轮播隐藏');
  assert.match(detailWxml, /标准化复盘建议[\s\S]*workReviewItems/, '作品档案应展示可解释的标准化复盘建议');
  const workWxml = fs.readFileSync(path.join(root, 'pages/technician/work-detail/index.wxml'), 'utf8');
  assert.match(workWxml, /作品档案[\s\S]*仅当前美甲师可见[\s\S]*preparation\.tools[\s\S]*preparation\.materials/, '作品详情应展示私密工具与材料档案');

  const saves = [];
  api.technician.orders.saveServiceRecord = async (id, payload) => {
    saves.push({ id, payload });
    return { id: 31, status: 'complete' };
  };

  const page = createPage();
  await page.onLoad({ id: '21', mode: 'record' });
  assert.equal(page.data.isRecordMode, true, '已完善记录默认应进入详情态');
  assert.equal(page.data.customerFactCandidates[0].content, '偏好自然色', '应从记录生成客户档案候选');
  assert.equal(page.data.customerFactCandidates[0].needsResync, true, '记录在确认后更新应提示重新同步');
  assert.equal(page.data.customerFactCandidates[0].conflictText, '偏好短甲', '同分类不同内容应作为冲突提示而不是自动覆盖');
  assert.deepEqual(page.data.workReviewItems.map(item => item.key), ['tools', 'materials', 'steps', 'duration'], '应提示工具、材料、步骤和耗时差异');

  page.editRecord();
  assert.equal(page.data.isRecordMode, false, '详情页应允许进入编辑态');
  page.input({ currentTarget: { dataset: { field: 'tools' } }, detail: { value: '标准笔' } });
  assert.equal(page.data.workReviewItems.some(item => item.key === 'tools'), false, '修改记录后应即时刷新作品差异提示');
  page.toggleCustomerFact({ currentTarget: { dataset: { key: page.data.customerFactCandidates[0].key } } });
  assert.equal(page.data.customerFactCandidates[0].selected, true, '未同步候选应支持手动选择');

  await page.submit();
  assert.equal(saves.length, 2, '应先保存记录，再单独同步客户档案');
  assert.equal(saves[0].payload.profileFacts, undefined, '记录保存请求不得携带客户档案，避免档案失败影响记录');
  assert.deepEqual(saves[1].payload.profileFacts, [
    { category: 'preference', content: '偏好自然色' }
  ], '只有手动选择的候选才应同步到客户档案');
  assert.match(page.data.customerSyncNotice, /已同步 1 条客户档案/, '成功态应反馈客户档案同步结果');
  assert.equal(page.data.customerFactCandidates[0].confirmationCount, 3, '重新确认后应更新页面确认次数');

  let failureCalls = 0;
  api.technician.orders.saveServiceRecord = async () => {
    failureCalls += 1;
    if (failureCalls === 2) throw new Error('profile sync failed');
    return { id: 31, status: 'complete' };
  };
  const recoveryPage = createPage();
  await recoveryPage.onLoad({ id: '21', mode: 'record' });
  recoveryPage.editRecord();
  recoveryPage.toggleCustomerFact({ currentTarget: { dataset: { key: recoveryPage.data.customerFactCandidates[0].key } } });
  await recoveryPage.submit();
  assert.equal(recoveryPage.data.saved, true, '客户档案同步失败时记录仍应显示保存成功');
  assert.equal(recoveryPage.data.customerSyncFailed, true, '同步失败后应提供可恢复状态');
  assert.equal(recoveryPage.data.customerFactCandidates[0].selected, true, '同步失败后应保留人工选择');
  api.technician.orders.saveServiceRecord = async () => ({ id: 31, status: 'complete' });
  await recoveryPage.retryCustomerSync();
  assert.equal(recoveryPage.data.customerSyncFailed, false, '重试成功后应清除失败状态');
  assert.equal(recoveryPage.data.customerFactCandidates[0].synced, true, '重试成功后应更新候选同步状态');

  console.log('Service-record archive sync checks passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
