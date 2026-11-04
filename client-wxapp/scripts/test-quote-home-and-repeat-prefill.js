const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 1. 验证后端 DTO 与 Service 支持上门美甲和 addressId
const createQuoteDtoPath = path.join(__dirname, '../../backend/src/booking-quotes/dto/create-booking-quote.dto.ts');
const createQuoteDtoContent = fs.readFileSync(createQuoteDtoPath, 'utf8');
assert(createQuoteDtoContent.includes("'上门美甲'"), 'create-booking-quote.dto.ts 必须支持上门美甲');

const bookQuoteDtoPath = path.join(__dirname, '../../backend/src/booking-quotes/dto/book-booking-quote.dto.ts');
const bookQuoteDtoContent = fs.readFileSync(bookQuoteDtoPath, 'utf8');
assert(bookQuoteDtoContent.includes('addressId?: number'), 'book-booking-quote.dto.ts 必须包含 addressId');

const quotesServicePath = path.join(__dirname, '../../backend/src/booking-quotes/booking-quotes.service.ts');
const quotesServiceContent = fs.readFileSync(quotesServicePath, 'utf8');
assert(quotesServiceContent.includes("quote.serviceType === '上门美甲'"), 'booking-quotes.service.ts 必须对上门美甲进行差异化处理');
assert(quotesServiceContent.includes('addressId: quote.serviceType ==='), 'booking-quotes.service.ts 必须向上门订单传递 addressId');

// 2. 验证美甲师端快捷报价支持上门服务形式切换与传参
const quickQuoteJsPath = path.join(__dirname, '../pages/technician/quick-quote/index.js');
const quickQuoteJsContent = fs.readFileSync(quickQuoteJsPath, 'utf8');
assert(quickQuoteJsContent.includes('canChooseServiceType'), 'quick-quote/index.js 必须包含 canChooseServiceType');
assert(quickQuoteJsContent.includes('changeServiceType'), 'quick-quote/index.js 必须包含 changeServiceType 方法');
assert(quickQuoteJsContent.includes('serviceType: this.data.serviceType'), 'quick-quote/index.js 提交时必须携带 serviceType');

const quickQuoteWxmlPath = path.join(__dirname, '../pages/technician/quick-quote/index.wxml');
const quickQuoteWxmlContent = fs.readFileSync(quickQuoteWxmlPath, 'utf8');
assert(quickQuoteWxmlContent.includes('service-type-toggle'), 'quick-quote/index.wxml 必须渲染服务类型切换组件');

// 3. 验证客户确认报价页与预约选时间页
const quoteConfirmWxmlPath = path.join(__dirname, '../pages/client/quote-confirm/index.wxml');
const quoteConfirmWxmlContent = fs.readFileSync(quoteConfirmWxmlPath, 'utf8');
assert(quoteConfirmWxmlContent.includes("quote.serviceType === '上门美甲'"), 'quote-confirm/index.wxml 必须对上门美甲进行状态展示区分');

const quoteBookingWxmlPath = path.join(__dirname, '../pages/client/quote-booking/index.wxml');
const quoteBookingWxmlContent = fs.readFileSync(quoteBookingWxmlPath, 'utf8');
assert(quoteBookingWxmlContent.includes('address-card'), 'quote-booking/index.wxml 必须包含上门地址卡片');
assert(quoteBookingWxmlContent.includes("service-type=\"{{quote.serviceType === '上门美甲' ? 'home' : 'shop'}}\""), 'quote-booking/index.wxml 时间组件需正确绑定 home/shop');

const quoteBookingJsPath = path.join(__dirname, '../pages/client/quote-booking/index.js');
const quoteBookingJsContent = fs.readFileSync(quoteBookingJsPath, 'utf8');
assert(quoteBookingJsContent.includes('chooseAddress'), 'quote-booking/index.js 必须支持选择地址');
assert(quoteBookingJsContent.includes('loadDefaultAddress'), 'quote-booking/index.js 必须支持拉取默认上门地址');
assert(quoteBookingJsContent.includes('addressId: this.data.quote.serviceType ==='), 'quote-booking/index.js 提交时必须按上门服务传递 addressId');

// 4. 验证熟客再次预约【上次项目一键回填】
const orderDetailJsPath = path.join(__dirname, '../pages/client/order-detail/index.js');
const orderDetailJsContent = fs.readFileSync(orderDetailJsPath, 'utf8');
assert(orderDetailJsContent.includes('sourceOrderId='), 'order-detail/index.js 的再次预约必须携带 sourceOrderId');

const createOrderJsPath = path.join(__dirname, '../pages/client/create-order/index.js');
const createOrderJsContent = fs.readFileSync(createOrderJsPath, 'utf8');
assert(createOrderJsContent.includes('repeatService: null'), 'create-order/index.js 必须定义 repeatService 数据模型');
assert(createOrderJsContent.includes('applyRepeatServices:'), 'create-order/index.js 必须包含 applyRepeatServices 一键回填方法');
assert(createOrderJsContent.includes('this._sourceOrderId'), 'create-order/index.js 必须读取 sourceOrderId');

const createOrderWxmlPath = path.join(__dirname, '../pages/client/create-order/index.wxml');
const createOrderWxmlContent = fs.readFileSync(createOrderWxmlPath, 'utf8');
assert(createOrderWxmlContent.includes('repeat-service-card'), 'create-order/index.wxml 必须渲染上次预约快捷标签卡片');
assert(createOrderWxmlContent.includes('applyRepeatServices'), 'create-order/index.wxml 必须绑定 applyRepeatServices 触发事件');

console.log('快捷报价上门美甲与熟客再次预约一键回填测试全部通过');
