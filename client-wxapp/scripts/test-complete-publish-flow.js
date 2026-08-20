// 静态/流程验证：完成服务 → 发布关联作品 一键引导
// 覆盖：页面注册、API 签名、保存成功后的后续行动入口、作品发布预填授权与关联订单
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---------- 1. 静态检查：路由与接线 ----------
const appJson = JSON.parse(read('app.json'));
assert.ok(
  appJson.pages.includes('pages/technician/complete-service/index'),
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
    setData(patch) { Object.keys(patch).forEach((key) => { this.data[key] = patch[key]; }); }
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
  await page.onLoad({ id: '12' });
  assert.strictEqual(page.id, 12);
  assert.strictEqual(page.data.actualAmount, '288', '应预填实收金额');
  assert.strictEqual(page.data.customerName, '小美', '应加载客户名用于成功视图');

  // 填写服务记录并提交
  page.data.actualStartTime = '2026-08-15T14:00';
  page.data.actualEndTime = '2026-08-15T16:00';
  page.data.materials = 'OPI #H42';
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

  // 后续行动：发布关联作品（预填订单）
  page.goPublishWork();
  assert.strictEqual(
    redirects[redirects.length - 1],
    '/pages/technician/work-edit/index?orderId=12',
    '应携带 orderId 跳转作品发布'
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

  const workPage = createPage('../pages/technician/work-edit/index');
  await workPage.onLoad({ orderId: '12' });
  await new Promise((r) => setTimeout(r, 20)); // 等待 accessOptions 异步加载

  assert.strictEqual(workPage.data.visibilityScope, 'authorized_clients', '应切换到授权客户模式');
  assert.strictEqual(workPage.data.accessGrants.length, 1, '应预填一条授权');
  const grant = workPage.data.accessGrants[0];
  assert.strictEqual(grant.customerId, 9, '授权客户应为订单所属客户');
  assert.strictEqual(grant.customerOrders[grant.selectedOrderIndex - 1].id, 12, '应预选本次完成的订单');
  assert.ok(grant.selectedOrderText.includes('猫眼'), '关联预约文案应显示所选订单');

  // buildGrants 提交载荷应携带该订单
  workPage.data.title = '小美猫眼';
  workPage.data.coverUrl = '/uploads/c.jpg';
  assert.strictEqual(workPage.validate(), true, '预填后应满足必填校验');
  const payloadGrants = workPage.buildGrants();
  assert.strictEqual(payloadGrants[0].orderId, 12, '提交载荷应关联本次订单');

  // 客户未绑定时降级提示
  const noMatch = createPage('../pages/technician/work-edit/index');
  await noMatch.onLoad({ orderId: '999' });
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(noMatch.data.accessGrants.length, 0, '找不到客户时不应生成授权');
  assert.ok(toasts.some((t) => t.includes('尚未绑定')), '应提示客户未绑定');

  console.log('Complete-service → publish-work flow checks passed.');
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
