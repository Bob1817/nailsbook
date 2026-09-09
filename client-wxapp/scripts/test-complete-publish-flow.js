// 静态/流程验证：完成服务 → 发布关联作品 一键引导
// 覆盖：页面注册、API 签名、保存成功后的后续行动入口、作品发布预填授权与关联订单
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---------- 1. 静态检查：路由与接线 ----------
const appJson = JSON.parse(read('app.json'));
const registeredPages = [
  ...appJson.pages,
  ...(appJson.subPackages || []).flatMap((pkg) =>
    pkg.pages.map((page) => `${pkg.root}/${page}`),
  ),
];
assert.ok(
  registeredPages.includes('pages/technician/complete-service/index'),
  'app.json 应注册 complete-service 页面'
);

assert.ok(
  /complete:\s*\(id,\s*data\)\s*=>\s*api\.patch\(`\$\{T\}\/orders\/\$\{id\}\/complete`,\s*data\s*\|\|\s*\{\}\)/.test(read('services/api.js')),
  'api.technician.orders.complete 应透传服务记录数据'
);

const orderDetailSrc = read('pages/technician/order-detail/index.js');
assert.ok(
  orderDetailSrc.includes('`/pages/technician/complete-service/index?id=${this.orderId}`'),
  'order-detail 完成操作应跳转 complete-service 页'
);

const completeWxml = read('pages/technician/complete-service/index.wxml');
assert.ok(completeWxml.includes('wx:if="{{!saved}}"'), 'WXML 应按保存状态切换表单/成功视图');
assert.ok(completeWxml.includes('goPublishWork'), 'WXML 应包含发布关联作品入口');
assert.ok(completeWxml.includes('finishAndBack'), 'WXML 应包含返回入口');

// ---------- 2. 流程验证：complete-service 保存成功 → 发布引导 ----------
let pageConfig;
global.getApp = () => ({ globalData: {} });
global.Page = (config) => { pageConfig = config; };
const toasts = [];
const redirects = [];
global.wx = {
  getStorageSync: () => null,
  setStorageSync: () => {},
  removeStorageSync: () => {},
  showToast: (opts) => toasts.push(opts.title),
  redirectTo: (opts) => redirects.push(opts.url),
  navigateBack: () => {},
  navigateTo: (opts) => redirects.push(opts.url),
  setNavigationBarTitle: () => {},
  showLoading: () => {},
  hideLoading: () => {}
};

function createPage(name) {
  global.__page = undefined;
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

const api = require('../services/api');
const completeCalls = [];
api.technician.orders.detail = async () => ({
  customerId: 9, customerName: '小美', paidAmount: 288,
  confirmedStartTime: '2026-08-15T02:00:00.000Z', startTime: '2026-08-15T02:00:00.000Z'
});
api.technician.orders.complete = async (id, data) => { completeCalls.push({ id, data }); return { id }; };

(async () => {
  const page = createPage('../pages/technician/complete-service/index');
  const detail = api.technician.orders.detail;
  api.technician.orders.detail = async () => { throw new Error('网络失败'); };
  await page.onLoad({ id: '12' });
  assert.strictEqual(page.data.loaded, false);
  assert.strictEqual(page.data.loading, false);
  assert.strictEqual(page.data.loadError, '网络失败');
  await page.submit();
  assert.strictEqual(completeCalls.length, 0, '加载失败不允许提交');
  api.technician.orders.detail = detail;
  await page.onLoad({ id: '12' });
  assert.strictEqual(page.id, 12);
  assert.strictEqual(page.data.actualAmount, '288', '应预填实收金额');
  assert.strictEqual(page.data.customerName, '小美', '应加载客户名用于成功视图');

  api.technician.orders.detail = async () => ({
    customerId: 9, quotePrice: 300, paidAmount: 50,
    startTime: '2026-08-15T02:00:00.000Z'
  });
  await page.onLoad({ id: '12' });
  assert.strictEqual(page.data.actualAmount, '300', '部分定金不能替代最终服务金额');

  const selectTime = (field, value) => page.changeTime({ currentTarget: { dataset: { field } }, detail: { value } });
  selectTime('startDate', '2026-08-15');
  selectTime('startTime', '23:30');
  selectTime('endDate', '2026-08-16');
  selectTime('endTime', '01:00');
  assert.strictEqual(page.data.actualStartTime, '2026-08-15T23:30');
  assert.strictEqual(page.data.actualEndTime, '2026-08-16T01:00');
  page.data.submitting = true;
  selectTime('endTime', '02:00');
  assert.strictEqual(page.data.endTime, '01:00', '提交期间不能修改时间');
  page.data.submitting = false;
  await page.submit();
  assert.strictEqual(completeCalls.length, 1, '跨日服务可以正常保存');
  assert.strictEqual(new Date(completeCalls[0].data.actualEndTime) - new Date(completeCalls[0].data.actualStartTime), 90 * 60000);
  completeCalls.length = 0;
  page.data.saved = false;

  // 填写服务记录并提交
  page.data.actualStartTime = '2026-08-15T14:00';
  page.data.actualEndTime = '2026-08-15T16:00';
  page.data.materials = 'OPI #H42';
  page.data.actualEndTime = '2026-08-15T13:00';
  await page.submit();
  assert.strictEqual(completeCalls.length, 0, '非法时间不得调用完成接口');
  page.data.actualEndTime = '2026-08-15T16:00';
  page.data.actualAmount = '';
  await page.submit();
  assert.strictEqual(completeCalls.length, 0, '空金额不能按零元提交');
  page.data.actualAmount = '300';
  page.data.materialCost = '';
  await page.submit();
  assert.strictEqual(completeCalls.length, 0, '空成本不能按零元提交');
  page.data.materialCost = '0';
  await page.submit();
  assert.strictEqual(completeCalls.length, 1, 'complete 应被调用一次');
  assert.strictEqual(completeCalls[0].id, 12);
  assert.strictEqual(completeCalls[0].data.materials, 'OPI #H42', '服务记录字段应透传');
  assert.strictEqual(completeCalls[0].data.materialCost, 0);
  assert.ok(completeCalls[0].data.actualStartTime.endsWith('Z'), '时间应转 ISO 格式');
  assert.strictEqual(page.data.saved, true, '保存后进入成功态');

  // 重复提交应被拦截
  await page.submit();
  assert.strictEqual(completeCalls.length, 1, '保存成功后不允许重复提交');

  page.data.saved = false;
  api.technician.orders.complete = async () => { throw new Error('网络失败'); };
  await page.submit();
  assert.strictEqual(page.data.saved, false, '网络失败不能显示保存成功');
  assert.strictEqual(page.data.submitting, false, '网络失败后应允许手动重试');
  page.data.saved = true;

  // 后续行动：发布关联作品（预填订单）
  let draftCalls = 0;
  api.technician.works.createFromOrder = async (id) => {
    assert.strictEqual(id, 12);
    draftCalls++;
    return { id: 99 };
  };
  await Promise.all([page.goPublishWork(), page.goPublishWork()]);
  assert.strictEqual(draftCalls, 1, '重复点击不能创建多个关联作品');
  assert.strictEqual(
    redirects[redirects.length - 1],
    '/pages/technician/work-edit/index?id=99',
    '应编辑订单唯一关联的草稿'
  );

  // ---------- 3. 流程验证：work-edit 按 orderId 预填授权并预选关联订单 ----------
  api.technician.works.accessOptions = async () => ([
    { id: 3, name: '客户A', canAuthorize: false, orders: [] },
    {
      id: 9, name: '小美', canAuthorize: true,
      orders: [
        { id: 7, startTime: '2026-07-01T02:00:00.000Z', status: 'completed', serviceType: '法式' },
        { id: 12, startTime: '2026-08-15T06:00:00.000Z', status: 'completed', serviceType: '猫眼' },
        { id: 15, startTime: '2026-06-01T02:00:00.000Z', status: 'pending_home', serviceType: '延长' }
      ]
    }
  ]);
  api.technician.services.list = async () => ([
    { id: 'basic', name: '基础护理', price: 88, durationMinutes: 60, isActive: true }
  ]);

  const workPage = createPage('../pages/technician/work-edit/index');
  await workPage.onLoad({ orderId: '12' });
  await new Promise((r) => setTimeout(r, 20)); // 等待 accessOptions 异步加载

  assert.strictEqual(workPage.data.visibilityScope, 'authorized_clients', '应切换到授权客户模式');
  assert.strictEqual(workPage.data.accessGrants.length, 1, '应预填一条授权');
  const grant = workPage.data.accessGrants[0];
  assert.strictEqual(grant.customerId, 9, '授权客户应为订单所属客户');
  assert.strictEqual(grant.customerOrders[grant.selectedOrderIndex - 1].id, 12, '应预选本次完成的订单');
  assert.ok(grant.selectedOrderText.includes('猫眼'), '关联预约文案应显示所选订单');

  // 基础服务数量应同步累加原价与时长，综合报价差额应区分优惠/其他
  workPage.incrementService({ currentTarget: { dataset: { id: 'basic' } } });
  workPage.incrementService({ currentTarget: { dataset: { id: 'basic' } } });
  assert.deepStrictEqual(workPage.data.selectedServiceIds, ['basic', 'basic'], '同一基础服务应允许多份累加');
  assert.strictEqual(workPage.data.serviceSubtotalFen, 17600, '服务原价应按单价 × 数量累加');
  assert.strictEqual(workPage.data.totalDurationMinutes, 120, '预计时长应按基础时长 × 数量累加');
  workPage.data.standardPrice = '128';
  workPage.recalculatePricing();
  assert.strictEqual(workPage.data.priceDifferenceType, 'discount', '综合报价低于原价应显示优惠');
  assert.strictEqual(workPage.data.priceDifferenceFen, 4800, '优惠应为原价与综合报价差额');
  workPage.data.standardPrice = '200';
  workPage.recalculatePricing();
  assert.strictEqual(workPage.data.priceDifferenceType, 'surcharge', '综合报价高于原价应显示其他');
  assert.strictEqual(workPage.data.priceDifferenceFen, 2400, '其他应为综合报价与原价差额');
  workPage.decrementService({ currentTarget: { dataset: { id: 'basic' } } });
  assert.strictEqual(workPage.data.selectedServiceIds.length, 1, '减少服务应仅扣减一份数量');

  // buildGrants 提交载荷应携带该订单
  workPage.data.title = '小美猫眼';
  workPage.data.coverUrl = '/uploads/c.jpg';
  workPage.data.selectedServiceIds = ['basic'];
  workPage.data.standardPrice = '128';
  assert.strictEqual(workPage.validate(), true, '预填后应满足必填校验');
  const payloadGrants = workPage.buildGrants();
  assert.strictEqual(payloadGrants[0].orderId, 12, '提交载荷应关联本次订单');

  // 客户未绑定时降级提示
  const noMatch = createPage('../pages/technician/work-edit/index');
  await noMatch.onLoad({ orderId: '999' });
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(noMatch.data.accessGrants.length, 0, '找不到客户时不应生成授权');
  assert.ok(toasts.some((t) => t.includes('尚未绑定')), '应提示客户未绑定');

  // 真实详情接口使用 imageUrls；编辑保存必须保留所有照片。
  const photoUrls = ['/uploads/a.jpg', '/uploads/b.jpg'];
  api.technician.works.detail = async () => ({
    id: 99, title: '订单草稿', imageUrls: photoUrls, coverUrl: photoUrls[0],
    serviceLines: [{ serviceId: 'basic', quantity: 1 }], standardPrice: 128,
    visibilityScope: 'authorized_clients', clientAccesses: [{ ...payloadGrants[0] }],
  });
  workPage.setData({ isEdit: true, workId: 99, submitting: false });
  await workPage.loadWork(99);
  assert.deepStrictEqual(workPage.data.images, photoUrls, '加载草稿不得丢失 imageUrls');
  let savedPhotos;
  api.technician.works.update = async (id, payload) => {
    savedPhotos = JSON.parse(payload.images);
    return { id };
  };
  api.technician.works.updateAccess = async () => ({});
  await workPage.handleSubmit();
  clearTimeout(workPage._navTimer);
  assert.deepStrictEqual(savedPhotos, photoUrls, '保存应原样传回全部照片');
  api.technician.works.detail = async () => ({ images: JSON.stringify(photoUrls) });
  await workPage.loadWork(99);
  assert.deepStrictEqual(workPage.data.images, photoUrls, '兼容旧版 images 字符串');
  api.technician.works.detail = async () => ({ imageUrls: [], images: JSON.stringify(photoUrls) });
  await workPage.loadWork(99);
  assert.deepStrictEqual(workPage.data.images, [], '明确空 imageUrls 不应恢复旧照片');

  console.log('Complete-service → publish-work flow checks passed.');
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
