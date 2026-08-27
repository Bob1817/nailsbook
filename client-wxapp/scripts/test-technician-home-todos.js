const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const home = read('pages/technician/home/index.js');
const homeWxml = read('pages/technician/home/index.wxml');
const homeWxss = read('pages/technician/home/index.wxss');
const orders = read('pages/technician/orders/index.js');
const tradeOrders = read('pages/technician/trade-orders/index.js');

assert(home.includes("'/pages/technician/orders/index?task=pending'"), '待处理预约必须进入可处理预约筛选');
assert(home.includes("'/pages/technician/trade-orders/index?filter=pending'"), '未支付定金必须进入待支付交易订单');
assert(orders.includes("options.task === 'pending'"), '预约列表必须读取待处理筛选参数');
assert(orders.includes("o.status === 'pending_quote' || o.status === 'pending_confirm'"), '待处理预约必须包含待报价和待我确认');
assert(home.includes("o.status === 'pending_confirm'"), '待我确认必须由预约状态驱动，不能依赖消息未读状态');
assert(home.includes('confirmationTodos'), '首页必须展示待我确认预约的核心信息');
assert(home.includes('openOrderDetail'), '待我确认预约必须可直接进入预约详情');
assert(!homeWxml.includes('今日行程'), '首页必须移除无用途的今日行程卡片');
assert(homeWxml.includes('{{item._dateLabel}} {{item._clock}}') && homeWxml.includes('{{item._priceText}}'), '待确认卡片必须突出时间和价格');
assert(homeWxml.includes('预约金额') && home.includes('confirmationSummary(order)'), '预约金额文案和二次确认弹窗必须提供明确预约摘要');
assert(homeWxml.includes("{{item.customerName || '客户'}}") && homeWxml.includes("{{item._shopName || '店铺待确认'}}"), '待确认卡片必须展示客户与店铺');
assert(!homeWxml.includes('confirmation-todo-address') && !homeWxml.includes('item.serviceName'), '待确认卡片不应展示服务内容和地址');
assert(homeWxml.includes('refuseConfirmation') && homeWxml.includes('confirmConfirmation') && homeWxml.includes('查看详情'), '待确认卡片必须并列提供拒绝、确认和详情操作');
assert(homeWxss.includes('grid-template-columns:repeat(3,minmax(0,1fr))') && homeWxss.includes('height:64rpx'), '三个操作应使用紧凑等宽视觉按钮');
assert(homeWxss.includes('min-height:88rpx'), '紧凑视觉按钮仍需保留 44px 触控热区');
assert(home.includes("label: '个预约待支付定金'"), '定金待办必须使用预约工作流口径');
assert(tradeOrders.includes("options.filter === 'pending'"), '交易订单必须读取待支付筛选参数');

console.log('美甲师首页待处理事项导航检查通过');
