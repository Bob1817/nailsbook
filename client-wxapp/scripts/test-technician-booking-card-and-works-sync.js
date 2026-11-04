const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// 1. 验证预约卡片组件与样式对齐 Airbnb 设计规范
const cardWxml = read('components/technician-booking-card/index.wxml');
const cardWxss = read('components/technician-booking-card/index.wxss');
const cardJs = read('components/technician-booking-card/index.js');

// 次要按钮必须是中性浅底 + 细边框，圆角统一为 16rpx
assert.match(cardWxss, /\.schedule-action\s*\{[^}]*min-height:\s*88rpx[^}]*border-radius:\s*16rpx/, '预约卡片操作按钮高度必须至少 44px (88rpx)，圆角必须为 16rpx');
assert.match(cardWxss, /\.schedule-action-secondary\s*\{[^}]*color:\s*var\(--nb-ink\)[^}]*background:\s*var\(--nb-page\)[^}]*border:\s*1rpx solid rgba\(0,\s*0,\s*0,\s*0\.08\)/, '预约卡片次要操作必须使用中性背景与极细边框，符合 Airbnb 规范');
assert.match(cardWxss, /\.schedule-action-primary\s*\{[^}]*color:\s*var\(--nb-inverse\)[^}]*background:\s*var\(--nb-action\)/, '预约卡片主要操作必须使用石墨黑高对比主色');

// 2. 验证卡片不再对美甲师高频展示【再次预约】，针对各状态区分操作
assert(!cardWxml.split("variant === 'schedule'")[1].split('<view wx:else')[0].includes('再次预约'), '美甲师行程预约卡片不得直接展示低频的再次预约主按钮');

// 已完成状态：必须提供【完善美甲记录】/【美甲记录】与【上传作品】/【查看作品】
assert.match(cardWxml, /order\.status === 'completed'/, '必须包含已完成状态专属操作分支');
assert.match(cardWxml, /完善美甲记录/, '已完成预约未填完整时必须提供完善美甲记录入口');
assert.match(cardWxml, /上传作品/, '已完成预约未关联作品时必须提供上传作品入口');
assert.match(cardWxml, /查看作品/, '已完成预约有关联作品时必须提供查看作品入口');

// 已取消/已驳回/已过期等终态：遵循 Airbnb 规范彻底隐藏底部操作栏，整卡点按查看详情，标题栏带轻微 arrow-right 指引
assert(!cardWxml.includes('schedule-action-single'), '终态卡片不得保留割裂畸形的 50% 孤立按钮操作栏');
assert(!cardWxss.includes('.schedule-action-single'), '不得保留 .schedule-action-single 样式');
assert.match(cardWxml, /wx:if="{{order\._hasScheduleActions}}"/, '仅在存在操作时渲染 schedule-actions 容器');
assert.match(cardWxml, /class="schedule-arrow"[^>]*src="\/static\/icons\/arrow-right\.svg"/, '终态卡片必须在标题行展示轻微 arrow-right 进入指引');

// 组件 JS 必须暴露 triggerEvent: record, uploadwork, viewwork
assert.match(cardJs, /triggerEvent\('record'/, '预约卡片必须触发 record 事件');
assert.match(cardJs, /triggerEvent\('uploadwork'/, '预约卡片必须触发 uploadwork 事件');
assert.match(cardJs, /triggerEvent\('viewwork'/, '预约卡片必须触发 viewwork 事件');

// 3. 验证 4 个主要列表页接入共享事件处理
const sharedActions = read('pages/technician/utils/technician-booking-actions.js');
assert.match(sharedActions, /onBookingCardUploadWork[\s\S]*work-edit\/index\?orderId=/, '共享操作必须提供上传作品并预填订单参数处理');
assert.match(sharedActions, /onBookingCardViewWork[\s\S]*work-detail\/index\?id=/, '共享操作必须提供查看作品详情处理');
assert.match(sharedActions, /onBookingCardRecord[\s\S]*complete-service\/index\?id=/, '共享操作必须提供美甲记录入口与模式跳转处理');

for (const page of ['all-bookings', 'orders', 'all-itineraries', 'schedule']) {
  const wxml = read(`pages/technician/${page}/index.wxml`);
  const js = read(`pages/technician/${page}/index.js`);
  for (const event of ['record', 'uploadwork', 'viewwork']) {
    assert(wxml.includes(`bind:${event}=`), `${page} 必须绑定 bind:${event}`);
  }
  for (const handler of ['onBookingCardRecord', 'onBookingCardUploadWork', 'onBookingCardViewWork']) {
    assert(js.includes(handler), `${page} 必须接入 ${handler}`);
  }
}

// 4. 验证订单装饰 logic (order.js)
const { decorateTechnicianOrder } = require('../utils/order');
const testOrderNoWork = {
  id: 101,
  status: 'completed',
  startTime: '2026-10-28T14:00:00.000Z',
  customer: { id: 1, name: '小红' },
  serviceLines: [{ nameSnapshot: '法式美甲' }]
};
const decoratedNoWork = decorateTechnicianOrder(testOrderNoWork);
assert.equal(decoratedNoWork._canRebook, false, '美甲师端 _canRebook 必须为 false');
assert.equal(decoratedNoWork._hasWork, false, '未关联作品时 _hasWork 应为 false');
assert.equal(decoratedNoWork._recordCompleted, false, '未完成记录时 _recordCompleted 应为 false');

const testOrderWithWork = {
  id: 102,
  status: 'completed',
  startTime: '2026-10-28T14:00:00.000Z',
  customer: { id: 2, name: '小芳' },
  serviceRecord: { id: 99, status: 'complete' },
  worksFromOrder: [{ id: 501, title: '秋冬焦糖美甲' }]
};
const decoratedWithWork = decorateTechnicianOrder(testOrderWithWork);
assert.equal(decoratedWithWork._hasWork, true, '关联作品时 _hasWork 应为 true');
assert.equal(decoratedWithWork._workId, 501, '关联作品时 _workId 必须正确提取');
assert.equal(decoratedWithWork._recordCompleted, true, '完成服务记录时 _recordCompleted 应为 true');
assert.equal(decoratedWithWork._hasScheduleActions, true, '已完成状态存在操作条');

const terminalOrder = {
  id: 103,
  status: 'expired',
  startTime: '2026-10-28T14:00:00.000Z',
  customer: { id: 3, name: '方人也' }
};
const decoratedTerminal = decorateTechnicianOrder(terminalOrder);
assert.equal(decoratedTerminal._hasScheduleActions, false, '已过期等终态预约不应渲染底部操作栏');

// 5. 验证作品「多少人做过」统计与展示模型
const { normalizeWork, normalizeWorkDetail } = require('../utils/normalize-work');
const workWithOrders = {
  id: 88,
  title: '经典猫眼',
  sourceOrders: [
    { id: 1, status: 'completed' },
    { id: 2, status: 'completed' },
    { id: 3, status: 'cancelled' }
  ]
};
const normalizedWork = normalizeWork(workWithOrders);
assert.equal(normalizedWork.completedBookingsCount, 2, '作品已完成预约次数必须统计准确');
assert.equal(normalizedWork.doneCountText, '2人做过', '作品做过人数展示文案必须格式化正确');

const normalizedDetail = normalizeWorkDetail(workWithOrders);
assert.equal(normalizedDetail.completedBookingsCount, 2, '作品详情已完成预约次数必须统计准确');
assert.equal(normalizedDetail.doneCountText, '2人做过', '作品详情做过人数文案必须格式化正确');

// 验证 0 次时文本为空
const workZeroDone = normalizeWork({ id: 89, title: '新款首发' });
assert.equal(workZeroDone.completedBookingsCount, 0);
assert.equal(workZeroDone.doneCountText, '');

// 6. 验证作品卡片与作品详情页组件展示「多少人做过」
const workCardWxml = read('components/work-card/index.wxml');
const workCardWxss = read('components/work-card/index.wxss');
const workCardJs = read('components/work-card/index.js');
assert.match(workCardWxml, /doneCountText/, '作品卡片必须包含 doneCountText 渲染');
assert.match(workCardWxss, /\.wc-editorial-tag-done/, '作品卡片必须定义 editorial 模式做过人数样式');
assert.match(workCardWxss, /\.wc-grid-done-count/, '作品卡片必须定义 grid 模式做过人数样式');
assert.match(workCardWxss, /\.wc-bar-done-count/, '作品卡片必须定义 compact-bar 模式做过人数样式');
assert.match(workCardJs, /doneCountText/, '作品卡片 JS 必须同步 doneCountText');

const detailWxml = read('components/work-detail-view/index.wxml');
const detailWxss = read('components/work-detail-view/index.wxss');
assert.match(detailWxml, /work\.doneCountText/, '作品详情页必须展示作品做过人数');
assert.match(detailWxss, /\.work-done-count/, '作品详情页必须定义做过人数气泡样式');

console.log('美甲师预约卡片 Airbnb 规范与作品「多少人做过」统计关联验证全部通过！');
