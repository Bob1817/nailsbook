const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const component = read('components/technician-booking-card/index.wxml');
const componentStyle = read('components/technician-booking-card/index.wxss');
const home = read('pages/technician/home/index.wxml');
const orders = read('pages/technician/orders/index.wxml');
const chatDetail = read('pages/technician/chat-detail/index.wxml');
const allBookings = read('pages/technician/all-bookings/index.wxml');
const allItineraries = read('pages/technician/all-itineraries/index.wxml');

assert(home.includes('technician-booking-card') && home.includes('variant="hero"'), '首页下一单必须使用预约卡片 hero 模式');
assert(!home.includes('今日行程') && !home.includes('variant="compact"'), '首页不应保留无用途的今日行程卡片');
assert(orders.includes('technician-booking-card') && orders.includes('variant="compact"'), '行程页必须使用预约卡片 compact 模式');
assert(chatDetail.includes('technician-booking-card') && chatDetail.includes('variant="message"'), '聊天预约通知必须使用预约卡片 message 模式');
assert(!chatDetail.includes('order-card-msg'), '聊天页不应保留重复的预约卡片实现');
assert(allBookings.includes('technician-booking-card') && allBookings.includes('variant="compact"'), '全部预约页必须使用预约卡片 compact 模式');
assert(!allBookings.includes('class="trip-card"'), '全部预约页不应保留重复的预约卡片实现');
assert(allItineraries.includes('technician-booking-card') && allItineraries.includes('variant="compact"'), '全部行程页必须使用预约卡片 compact 模式');
assert(!allItineraries.includes('class="trip-card"'), '全部行程页不应保留重复的预约卡片实现');
assert(component.includes('/static/icons/navigation.svg'), '预约卡片导航操作必须显示统一图标');
assert(component.includes('/static/icons/phone-active.svg'), '预约卡片联系操作必须显示统一图标');
for (const heroClass of ['hero-card-head', 'hero-status-stack', 'hero-time-section', 'hero-time-range-row', 'hero-customer-row', 'hero-shop-row', 'hero-price-row', 'hero-deposit-row']) {
  assert(component.includes(heroClass), `首页下一单缺少结构：${heroClass}`);
}
assert(!component.includes('hero-location'), '首页下一单不得展示地址信息');
assert(!component.includes('hero-detail-label'), '下一单所有信息行均不得保留前置字段名称');
assert(!component.includes('hero-date-time'), '首页下一单左侧日期区域不得重复展示预约时间');
for (const icon of ['clock.svg', 'client.svg', 'shop.svg', 'wallet.svg', 'status-progress.svg']) {
  assert(component.includes(icon), `下一单信息行缺少语义图标：${icon}`);
}
assert(/\.booking-card-hero\s*\{[^}]*background:\s*var\(--nb-surface\)/.test(componentStyle), '下一单主体必须使用白色卡片，避免整卡黑色过重');
assert(/\.hero-date-box\s*\{[^}]*background:\s*var\(--nb-soft-surface\)/.test(componentStyle), '下一单日期块必须使用浅色背景，避免深色块过于突兀');
assert(/\.hero-date-day\s*\{[^}]*color:\s*var\(--nb-ink\)/.test(componentStyle), '日期数字应通过深色文字而非黑色背景突出');
const heroInfoOrder = ['hero-time-range-row', 'hero-customer-row', 'hero-shop-row', 'hero-price-row', 'hero-deposit-row'].map((name) => component.indexOf(name));
assert(heroInfoOrder.every((position, index) => index === 0 || position > heroInfoOrder[index - 1]), '下一单信息顺序必须为时间、客户、店铺、价格、定金');
assert(!component.includes('hero-service-row') && !component.includes('order._serviceDisplay'), '首页下一单不应展示服务项目');
assert(component.includes('order._heroStatusLabel'), '首页下一单必须显示待到店或进行中的预约状态');
assert(component.includes('order._depositText'), '首页下一单必须显示定金状态');
const homeJs = read('pages/technician/home/index.js');
assert(homeJs.includes("? '无需定金'") && homeJs.includes('`已支付 ${formatMoney(depositAmount)}`') && homeJs.includes('`待支付 ${formatMoney(depositAmount)}`'), '定金必须区分无需、待支付和已支付状态');
assert(componentStyle.includes('min-height:88rpx'), '预约卡片按钮触控高度必须至少为 44px');
assert(component.includes('hero-action-surface') && /\.hero-action-surface\s*\{[^}]*height:\s*44px[^}]*border-radius:\s*8px/.test(componentStyle), '首页下一单按钮必须与通用预约卡片保持相同高度和圆角');
assert(/\.hero-action-icon\s*\{[^}]*width:\s*14px;\s*height:\s*14px/.test(componentStyle), '首页下一单操作图标必须与通用预约卡片对齐');
assert(!component.includes('hero-action-surface semantic-link'), '查看详情主按钮不能被全局链接样式覆盖背景');
assert(/\.hero-action-primary \.hero-action-surface\s*\{[^}]*background:\s*var\(--nb-action\)[^}]*color:\s*var\(--nb-inverse\)/.test(componentStyle), '查看详情必须显示黑底白字主按钮');
assert(component.includes('<text>发送消息</text>') && component.includes('<text>拨打电话</text>') && component.includes('<view class="hero-action-surface">查看详情</view>'), '首页下一单三个操作按钮必须统一使用四字文案');
assert(componentStyle.includes('padding: var(--space-xl) var(--space-xl) var(--space-sm);') && componentStyle.includes('margin-bottom: var(--space-sm);'), '首页下一单正文与底部操作区必须使用均衡的纵向间距');
assert(!componentStyle.includes('flex:0 0 auto'), '行程卡片操作按钮必须等宽对齐，不能挤在卡片右侧');
assert(componentStyle.includes('.booking-card-compact .address-row'), '行程卡片地址必须使用独立信息区域');

console.log('美甲师预约卡片复用检查通过');

const { normalizeOrder } = require('../utils/order');
const base = { id: 1, startTime: '2026-08-30T14:00:00', customer: { id: 8, name: '测试客户' } };
assert.equal(normalizeOrder(base)._cardDate, '8月30日');
assert.equal(normalizeOrder(base)._cardWeekday, '周日');
assert.equal(normalizeOrder({ ...base, sourceWork: { title: '法式作品' }, customTitle: '系统摘要' }).serviceName, '法式作品');
assert.equal(normalizeOrder({ ...base, customTitle: '自定义设计' }).serviceName, '自定义设计');
assert.equal(normalizeOrder({ ...base, serviceLines: [{ nameSnapshot: '护理' }, { nameSnapshot: '纯色' }] }).serviceName, '护理、纯色');
assert.equal(normalizeOrder({ ...base, service: { name: '基础服务' } }).serviceName, '基础服务');
assert.equal(normalizeOrder({ ...base, quickBooking: true }).serviceName, '快捷预约 · 款式待沟通');
assert(!component.includes('{{order._typeLabel}} · {{order.serviceName}}'));
assert(component.includes("order.status === 'completed'") && component.includes('发送消息') && component.includes('拨打电话') && component.includes('查看详情'));
for (const page of ['all-bookings', 'all-itineraries', 'orders']) {
  assert(read(`pages/technician/${page}/index.wxml`).includes('bind:message="onBookingCardMessage"'));
}
console.log('预约日期、项目来源及已完成操作检查通过');

// 客户详情只使用该客户详情接口中的订单，并补齐通用卡片的客户身份。
(async () => {
  const vm = require('vm');
  let detailPage;
  const navigation = [];
  let requestedId;
  const api = {
    technician: { customers: { detail: async id => {
      requestedId = id;
      return { id: 8, name: '测试客户', phone: '13800000000', clientUserId: 93, orders: [
        { id: 41, status: 'completed', startTime: '2026-08-30T14:00:00', address: '测试地址', quotePrice: 198, sourceWork: { title: '法式作品' } },
        { id: 42, status: 'pending_quote', startTime: '2026-08-31T10:00:00', quickBooking: true }
      ] };
    } } },
    chat: { technician: { conversations: async () => [] } }
  };
  vm.runInNewContext(read('pages/technician/customer-detail/index.js'), {
    Page: value => { detailPage = value; },
    require: name => name.includes('services/api') ? api : require(require('path').resolve(__dirname, '../pages/technician/customer-detail', name)),
    wx: { navigateTo: value => navigation.push(value.url), showToast: () => {} },
    console,
  });
  detailPage.customerId = 8;
  detailPage.setData = values => Object.assign(detailPage.data, values);
  await detailPage.loadCustomer();
  assert.equal(requestedId, 8);
  assert.equal(detailPage.data.loadFailed, false);
  const orders = detailPage.data.customer.orders;
  assert.equal(orders.length, 2);
  assert.equal(orders[0].customerName, '测试客户');
  assert.equal(orders[0].clientUserId, 93);
  assert.equal(orders[0].serviceName, '法式作品');
  assert.equal(orders[0]._clock, '14:00');
  assert.equal(orders[1].serviceName, '快捷预约 · 款式待沟通');
  detailPage.onBookingCardOpen({ detail: { id: 41 } });
  detailPage.onBookingCardMessage({ detail: { clientId: 93 } });
  assert.equal(navigation[0], '/pages/technician/order-detail/index?id=41');
  assert.equal(navigation[1], '/pages/technician/chat-detail/index?clientId=93');
  assert(read('pages/technician/customer-detail/index.wxml').includes('<technician-booking-card'));
  console.log('客户详情预约范围、卡片字段及身份跳转检查通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
