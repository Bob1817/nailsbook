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
for (const icon of ['clock-light.svg', 'client-white.svg', 'shop.svg', 'wallet.svg', 'status-progress.svg']) {
  assert(component.includes(icon), `下一单信息行缺少语义图标：${icon}`);
}
const heroInfoOrder = ['hero-time-range-row', 'hero-customer-row', 'hero-shop-row', 'hero-price-row', 'hero-deposit-row'].map((name) => component.indexOf(name));
assert(heroInfoOrder.every((position, index) => index === 0 || position > heroInfoOrder[index - 1]), '下一单信息顺序必须为时间、客户、店铺、价格、定金');
assert(!component.includes('hero-service-row') && !component.includes('order._serviceDisplay'), '首页下一单不应展示服务项目');
assert(component.includes('order._heroStatusLabel'), '首页下一单必须显示待到店或进行中的预约状态');
assert(component.includes('order._depositText'), '首页下一单必须显示定金状态');
const homeJs = read('pages/technician/home/index.js');
assert(homeJs.includes("? '无需定金'") && homeJs.includes('`已支付 ${formatMoney(depositAmount)}`') && homeJs.includes('`待支付 ${formatMoney(depositAmount)}`'), '定金必须区分无需、待支付和已支付状态');
assert(componentStyle.includes('min-height:88rpx'), '预约卡片按钮触控高度必须至少为 44px');
assert(component.includes('hero-action-surface') && componentStyle.includes('height: 64rpx'), '首页下一单按钮应使用轻薄视觉层并保留独立触控区');
assert(componentStyle.includes('padding: var(--space-xl) var(--space-xl) var(--space-sm);') && componentStyle.includes('margin-bottom: var(--space-sm);'), '首页下一单正文与底部操作区必须使用均衡的纵向间距');
assert(!componentStyle.includes('flex:0 0 auto'), '行程卡片操作按钮必须等宽对齐，不能挤在卡片右侧');
assert(componentStyle.includes('.booking-card-compact .address-row'), '行程卡片地址必须使用独立信息区域');

console.log('美甲师预约卡片复用检查通过');
