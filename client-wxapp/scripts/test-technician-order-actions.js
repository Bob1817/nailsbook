const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'pages/technician/order-detail/index.js'), 'utf8');
const wxml = fs.readFileSync(path.join(root, 'pages/technician/order-detail/index.wxml'), 'utf8');

assert(!js.includes("label: '编辑预约'"), '底部操作不得保留编辑预约');
assert(!js.includes("label: '修改报价'"), '报价已在价格信息内编辑，底部不得重复显示修改报价');
const bottomActions = wxml.split('<!-- ============ 底部操作栏 ============ -->')[1].split('</view>\n</view>')[0];
assert(!bottomActions.includes('bindtap="openCancel"'), '底部不得额外硬编码取消预约');
assert.match(wxml, /order\._actions\.length === 2/, '两个操作必须并列展示');
assert.match(wxml, /更多操作/, '三个及以上操作必须收起到更多操作');
assert.match(wxml, /wx:for="{{order\._actions}}"/, '更多操作弹层必须展示全部可用操作');
assert.match(wxml, /order\._depositStatusText/, '定金状态展示必须使用独立的状态文案，不能与金额条件耦合');
assert.match(js, /raw\.isDepositPaid[\s\S]*depositAmount > 0[\s\S]*'定金已支付'/, '已支付开关为真且金额为零时仍必须回显定金已支付');
assert.match(js, /depositAmount > 0 \? `待支付定金/, '未支付但已设置金额时必须展示待支付状态和金额');
assert.match(js, /quoteDepositPaid && \(!depositAmt \|\| !Number\.isFinite\(depositFen\) \|\| depositFen <= 0\)/, '发送报价时，已支付定金必须填写大于 0 的金额');
assert.match(js, /editDepositPaid && depositFen <= 0/, '更新作品标准报价时，已支付定金必须填写大于 0 的金额');
assert.match(js, /payload\.depositAmount = Number\(depositAmt\)/, '发送报价必须按元提交定金，不能再次乘以100');
assert.match(js, /depositAmount: Number\(depositStr \|\| 0\)/, '调整报价必须按元提交定金');
assert(!js.includes('depositAmount: depositFen'), '不得把以分计算的临时值提交到元字段');
assert.match(wxml, /source-work-title[\s\S]*sourceWork\._priceFen \/ 100/, '预约来源作品标题下方必须展示统一口径的作品价格');
assert.match(js, /raw\.sourceWorkId[\s\S]*api\.technician\.works\.detail\(sourceWorkId\)/, '线上详情仅返回作品 ID 时必须补拉作品详情');

const normalizeWork = fs.readFileSync(path.join(root, 'utils/normalize-work.js'), 'utf8');
assert.match(normalizeWork, /standardPriceFen \|\| raw\.serviceSubtotalFen \|\| raw\.priceCents/, '预约详情作品价格必须复用作品卡片的多字段价格口径');

console.log('美甲师预约详情操作布局检查通过');
