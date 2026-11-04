const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const workCardFile = path.join(__dirname, '..', 'components/work-card/index.js');
const workDetailFile = path.join(__dirname, '..', 'pages/client/work-detail/index.js');
const createOrderFile = path.join(__dirname, '..', 'pages/client/create-order/index.js');
const createOrderWxml = fs.readFileSync(path.join(__dirname, '..', 'pages/client/create-order/index.wxml'), 'utf8');

// 1. 静态契约检查
assert.match(createOrderWxml, /submitSuccessType === 'quote'\s*\?\s*'等待' \+ submitSuccessTech \+ '为您确认时间并提供报价'\s*:\s*'等待' \+ submitSuccessTech \+ '确认预约时间与服务'/, '成功提示文案应区分待报价与待确认分支');
assert.match(createOrderWxml, /submit-price-main">\{\{sourceWork\.serviceSubtotalFen > 0 \? '¥' \+ \(sourceWork\.serviceSubtotalFen \/ 100\) : '待报价'\}\}/, '未定价作品在提交栏应明确展示待报价而非¥0');

// 2. 模拟运行测试
const storage = {};
let destination = '', boundTechs = [], createdOrders = [];
const wx = {
  getStorageSync: key => storage[key],
  setStorageSync: (key, value) => { storage[key] = value; },
  removeStorageSync: key => { delete storage[key]; },
  showToast() {},
  showLoading() {},
  hideLoading() {},
  navigateTo: ({ url }) => { destination = url; },
  redirectTo: ({ url }) => { destination = url; },
  reLaunch: ({ url }) => { destination = url; }
};

const api = {
  public: {
    artists: { detail: async id => ({ artist: { id: Number(id), invitationCode: 'INVITE_' + id, name: '美甲师' + id } }) },
    works: { detail: async id => ({ id: Number(id), technicianId: 7, title: '作品' + id, standardPriceFen: 28000, pricingReady: true }) },
    bookingSettings: async () => ({ quickBookingEnabled: false })
  },
  client: {
    works: { detail: async id => ({ id: Number(id), technicianId: 7, title: '作品' + id, standardPriceFen: 28000, pricingReady: true }) },
    profile: { bindQuickBooking: async (techId, code) => { boundTechs.push({ techId, code }); } },
    orders: { create: async payload => { createdOrders.push(payload); return { id: 99 }; } },
    auth: { getUserInfo: async () => ({ bindings: [{ technician: { id: 7, name: '美甲师7', status: 'active', shopAddresses: [{ name: '总店' }] } }] }) }
  },
  auth: {
    getUserInfo: async () => ({ bindings: [{ technician: { id: 7, name: '美甲师7', status: 'active', shopAddresses: [{ name: '总店' }] } }] })
  }
};

global.wx = wx;
global.getApp = () => ({ globalData: { role: storage.role, token: storage.token } });

function loadComponent(file) {
  let definition;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    Component: d => { definition = d; },
    getApp: global.getApp,
    wx,
    require: name => createRequire(file)(name),
    console
  });
  return definition;
}

function loadPage(file) {
  let definition;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    Page: d => { definition = d; },
    getApp: global.getApp,
    wx,
    require: name => name.includes('services/api') ? api : createRequire(file)(name),
    console,
    setTimeout: fn => { fn(); },
    clearTimeout() {}
  });
  return {
    ...definition,
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(update) { Object.assign(this.data, update); }
  };
}

(async () => {
  // Test 2.1: work-card onBookTap - 游客点击进入登录，并携带 quickBookingTechId 与作品信息
  storage.role = undefined;
  storage.token = undefined;
  destination = '';
  const workCardDef = loadComponent(workCardFile);
  const cardInst = {
    data: { work: { id: 101, technicianId: 7, invitationCode: 'INVITE_7', standardPriceFen: 28000, pricingReady: true } },
    methods: workCardDef.methods
  };
  await cardInst.methods.onBookTap.call(cardInst);
  assert(destination.includes('/pages/login/index'), '未登录游客点击作品卡片预约应进入快捷登录');
  assert(destination.includes('quickBookingTechId=7'), '登录回跳应携带美甲师绑定目标');
  assert(decodeURIComponent(destination).includes('workId=101'), '回跳链接中应包含目标作品 ID');

  // Test 2.2: work-detail bookSameStyle - 未登录进入登录，登录后自动绑定并进入 create-order
  destination = '';
  const workDetailInst = loadPage(workDetailFile);
  workDetailInst.data.work = { id: 102, technicianId: 7, invitationCode: 'INVITE_7', standardPriceFen: 28000, pricingReady: true };
  workDetailInst.resolveInviteCode = async () => 'INVITE_7';
  await workDetailInst.bookSameStyle();
  assert(destination.includes('/pages/login/index'), '未登录客户在作品详情页点击预约同款应进入登录');

  storage.role = 'client';
  storage.token = 'client-token';
  storage.client_token = 'client-token';
  destination = '';
  boundTechs = [];
  storage.client_bindings = []; // 未绑定
  await workDetailInst.bookSameStyle();
  assert.equal(boundTechs.length, 1, '已登录未绑定客户预约同款应自动发起美甲师绑定');
  assert.equal(boundTechs[0].techId, 7);
  assert(destination.includes('/pages/client/create-order/index?workId=102&techId=7'), '绑定完成后应直接进入创建预约页');

  // Test 2.3: create-order 游客直接打开应前置拦截重定向至登录
  storage.role = undefined;
  storage.token = undefined;
  storage.client_token = undefined;
  destination = '';
  const orderPageGuest = loadPage(createOrderFile);
  orderPageGuest.onLoad({ workId: '102', techId: '7' });
  assert(destination.includes('/pages/login/index'), '未登录用户直接进入 create-order 必须前置重定向至快捷登录');
  assert(destination.includes('quickBookingTechId=7'), '重定向参数应保留美甲师 ID 供快捷注册自动绑定');

  // Test 2.4: create-order 定价作品提交 → pending_confirm (待我确认)
  storage.role = 'client';
  storage.token = 'client-token';
  storage.client_token = 'client-token';
  createdOrders = [];
  const pricedOrder = loadPage(createOrderFile);
  pricedOrder.data.selectedTech = { id: 7, name: '美甲师7' };
  pricedOrder.data.selectedTechId = 7;
  pricedOrder.data.serviceType = '到店美甲';
  pricedOrder.data.selectedShopName = '总店';
  pricedOrder.data.shopAddresses = [{ name: '总店' }];
  pricedOrder.data.serviceDate = '2099-01-01';
  pricedOrder.data.startTime = '10:00';
  pricedOrder.data.bookingReady = true;
  pricedOrder.data.settingsReady = true;
  pricedOrder.data.sourceWork = {
    pricingReady: true,
    standardPriceFen: 28000,
    serviceSubtotalFen: 28000,
    serviceLines: [{ name: '款式', subtotalFen: 28000 }]
  };
  pricedOrder.sourceWorkId = 102;
  pricedOrder.data.referenceOnly = false;
  pricedOrder._pageActive = true;
  await pricedOrder.doSubmit();
  assert.equal(createdOrders.length, 1);
  assert.equal(createdOrders[0].expectedPriceFen, 28000, '有价格作品提交时应携带期望价格');
  assert.equal(createdOrders[0].referenceOnly, undefined, '定价作品不应标记为 referenceOnly');
  assert.equal(pricedOrder.data.submitSuccess, true);
  assert.equal(pricedOrder.data.submitSuccessType, 'confirm', '定价作品应展示待确认成功反馈');

  // Test 2.5: create-order 未定价作品提交 → pending_quote (待报价)
  createdOrders = [];
  const unpricedOrder = loadPage(createOrderFile);
  unpricedOrder.data.selectedTech = { id: 7, name: '美甲师7' };
  unpricedOrder.data.selectedTechId = 7;
  unpricedOrder.data.serviceType = '到店美甲';
  unpricedOrder.data.selectedShopName = '总店';
  unpricedOrder.data.shopAddresses = [{ name: '总店' }];
  unpricedOrder.data.serviceDate = '2099-01-01';
  unpricedOrder.data.startTime = '10:00';
  unpricedOrder.data.bookingReady = true;
  unpricedOrder.data.settingsReady = true;
  unpricedOrder.data.sourceWork = {
    pricingReady: false,
    standardPriceFen: 0,
    serviceSubtotalFen: 0,
    serviceLines: []
  };
  unpricedOrder.sourceWorkId = 103;
  unpricedOrder.data.referenceOnly = true;
  unpricedOrder._pageActive = true;
  await unpricedOrder.doSubmit();
  assert.equal(createdOrders.length, 1);
  assert.equal(createdOrders[0].expectedPriceFen, undefined, '未定价作品提交不得包含确定价格');
  assert.equal(createdOrders[0].referenceOnly, true, '未定价作品必须标记 referenceOnly=true');
  assert.equal(unpricedOrder.data.submitSuccess, true);
  assert.equal(unpricedOrder.data.submitSuccessType, 'quote', '未定价作品应展示待报价成功反馈');

  console.log('第二主线（被动预约闭环与双分支定价）单元测试全部通过！');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
