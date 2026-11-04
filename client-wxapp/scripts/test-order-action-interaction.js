const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const clientResolverPath = '../pages/client/utils/action-layout-resolver';
const technicianResolverPath = '../pages/technician/utils/action-layout-resolver';
const { resolveActionLayout } = require(clientResolverPath);
const { resolveActionLayout: resolveTechnicianActionLayout } = require(technicianResolverPath);

// 1. 验证 resolveActionLayout 纯函数算法
// 1.1 空与单操作
assert.deepStrictEqual(resolveActionLayout([]), {
  visibleActions: [],
  overflowActions: [],
  hasMore: false,
  totalCount: 0
}, '空操作清单必须返回空');

const a1 = { key: 'a1', label: '操作1', priority: 1 };
const r1 = resolveActionLayout([a1]);
assert.equal(r1.visibleActions.length, 1, '1个操作必须外露展示');
assert.equal(r1.overflowActions.length, 0, '1个操作折叠列表必须为空');
assert.equal(r1.hasMore, false, '1个操作不应标记更多');

// 1.2 两个与三个操作（全部外露展示，绝不收起到“更多操作”）
const a2 = { key: 'a2', label: '操作2', priority: 2 };
const a3 = { key: 'a3', label: '操作3', priority: 3 };
const r2 = resolveActionLayout([a2, a1]);
assert.equal(r2.visibleActions.length, 2);
assert.equal(r2.visibleActions[0].key, 'a1', '必须按 priority 升序排序');
assert.equal(r2.overflowActions.length, 0);

const r3 = resolveActionLayout([a3, a1, a2]);
assert.equal(r3.visibleActions.length, 3, '3个操作必须全部直接外露展示');
assert.equal(r3.overflowActions.length, 0, '3个操作折叠列表必须为空');
assert.equal(r3.hasMore, false, '3个操作不应折叠更多');
assert.equal(r3.visibleActions[0].key, 'a1');
assert.equal(r3.visibleActions[1].key, 'a2');
assert.equal(r3.visibleActions[2].key, 'a3');

// 1.3 超过三个操作（前2个外露，第3个固定为【更多】，剩余进入 overflowActions）
const a4 = { key: 'a4', label: '操作4', priority: 4 };
const a5 = { key: 'a5', label: '操作5', priority: 5 };
const r4 = resolveActionLayout([a4, a2, a1, a3]);
assert.equal(r4.visibleActions.length, 3, '4个操作外露按钮必须恰好为3个');
assert.equal(r4.visibleActions[0].key, 'a1', '第1个必须是最高优先级操作');
assert.equal(r4.visibleActions[1].key, 'a2', '第2个必须是次高优先级操作');
assert.equal(r4.visibleActions[2].key, '__more__', '第3个必须固定为【更多】');
assert.equal(r4.visibleActions[2].label, '更多', '第3个按钮文案必须为【更多】');
assert.equal(r4.visibleActions[2].isMore, true, '更多按钮必须标记 isMore: true');
assert.equal(r4.overflowActions.length, 2, '剩余2个操作必须收纳在折叠清单中');
assert.equal(r4.overflowActions[0].key, 'a3');
assert.equal(r4.overflowActions[1].key, 'a4');
assert.equal(r4.hasMore, true);

const r5 = resolveActionLayout([a5, a4, a3, a2, a1]);
assert.equal(r5.visibleActions.length, 3);
assert.equal(r5.overflowActions.length, 3);
assert.equal(r5.overflowActions[0].key, 'a3');
assert.equal(r5.overflowActions[1].key, 'a4');
assert.equal(r5.overflowActions[2].key, 'a5');

// 2. 验证客户端预约详情页 (pages/client/order-detail/)
const clientJs = read('pages/client/order-detail/index.js');
const clientWxml = read('pages/client/order-detail/index.wxml');
const clientWxss = read('pages/client/order-detail/index.wxss');

assert(clientJs.includes("require('../utils/action-layout-resolver')"), '客户端详情页必须接入分包内操作布局解析器');
assert(clientWxml.includes('order._visibleActions'), '客户端详情页底部操作栏必须绑定 _visibleActions');
assert(!clientWxml.includes('order._actions.length < 3') && !clientWxml.includes('仅展示「更多操作」'), '客户端详情页必须移除3项及以上整包折叠为单按钮的反模式');
assert(clientJs.includes("key:'reject'") && clientJs.includes("key:'agree'") && clientJs.includes("key:'edit'") && clientJs.includes("key:'cancel'"), '客户端待确认报价必须提供同意、拒绝、修改、取消完整动作集');
assert(clientWxml.includes('data-is-more'), '客户端操作按钮必须传递 isMore 属性');
assert(clientJs.includes('openActionsSheet'), '点击更多按钮时必须唤起更多操作抽屉');

// 3. 验证美甲师端预约详情页 (pages/technician/order-detail/)
const techJs = read('pages/technician/order-detail/index.js');
const techWxml = read('pages/technician/order-detail/index.wxml');
const techWxss = read('pages/technician/order-detail/index.wxss');

assert(techJs.includes("require('../utils/action-layout-resolver')"), '美甲师详情页必须接入分包内操作布局解析器');

assert.deepStrictEqual(
  resolveTechnicianActionLayout([a5, a4, a3, a2, a1]),
  resolveActionLayout([a5, a4, a3, a2, a1]),
  '两个分包的操作布局规则必须保持一致'
);
assert(techWxml.includes('order._visibleActions'), '美甲师详情页底部操作栏必须绑定 _visibleActions');
assert(techWxml.includes('action-btns-row-3'), '美甲师详情页必须提供三按钮等宽并列排布样式容器');
assert(techJs.includes("key: 'confirm', label: '确认排期'"), '美甲师详情页 pending_confirm 必须提供确认排期核心操作');
assert(techJs.includes("case 'confirm':  return this.confirmOrder()"), '美甲师详情页必须分发确认排期动作');
assert(techWxml.includes('data-is-more'), '美甲师操作按钮必须传递 isMore 属性');
assert(techJs.includes('openActionMenu'), '点击更多按钮时必须唤起更多操作抽屉');

// 4. 触控友好度与防折行契约
assert(clientWxss.includes('min-width: 0') && clientWxss.includes('white-space: nowrap'), '客户端底部按钮必须支持 flex 均分防挤压防折行');
assert(techWxss.includes('action-btns-row-3 .action-btn') && techWxss.includes('font-size: var(--font-sm)'), '美甲师三按钮并列时文字应使用 font-sm 保证四字不折行');
assert(clientWxss.includes('height: 88rpx') && techWxss.includes('height: 88rpx'), '操作按钮高度必须满足 44px 移动端触控标准');

console.log('预约卡片与预约详情页操作按钮交互逻辑（最多三按钮+更多折叠）检查通过！');
