const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const file = path.join(root, 'pages/technician/quick-quote/index.js');
const template = fs.readFileSync(path.join(root, 'pages/technician/quick-quote/index.wxml'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'pages/technician/quick-quote/index.wxss'), 'utf8');
let definition;
let submitted;
let navigatedTo = '';
let historyRequests = 0;
const api = {
  technician: {
    services: { list: async () => ({ list: [
      { id: 'active', price: 198, isActive: true, isBookable: true },
      { id: 'inactive', price: 198, isActive: false },
      { id: 'unbookable', price: 198, isBookable: false },
      { id: 'unpriced', price: null }
    ] }) },
    bookingQuotes: {
      list: async () => { historyRequests += 1; throw new Error('Cannot GET /api/technician/booking-quotes'); },
      create: async payload => {
        submitted = payload;
        return { id: 1, quoteNo: 'Q1', finalPriceFen: payload.finalPriceFen, lines: [], referenceImages: [] };
      }
    }
  }
};
const wx = {
  showToast() {},
  showModal(options) { options.success({ confirm: true }); },
  navigateTo({ url }) { navigatedTo = url; }
};
vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
  Page: value => { definition = value; },
  require: name => name.includes('services/api') ? api : require(name),
  wx,
  console
});

const page = {
  ...definition,
  data: JSON.parse(JSON.stringify(definition.data)),
  setData(value) { Object.assign(this.data, value); }
};
page.data.services = [{ id: 'basic', name: '基础护理', price: 198, durationMinutes: 60, _priceText: '198.00' }];
page.openServicePicker();
page.changeDraftServiceQuantity({ currentTarget: { dataset: { id: 'basic', delta: 1 } } });
page.changeDraftServiceQuantity({ currentTarget: { dataset: { id: 'basic', delta: 1 } } });
assert.equal(page.data.servicePickerCount, 2, '服务弹窗应按份数统计');
assert.equal(page.data.servicePickerTotalText, '396.00', '服务弹窗应实时计算价格');
assert.equal(page.data.servicePickerDurationText, '2小时', '服务弹窗应实时累计服务时长');
page.confirmServicePicker();
assert.equal(page.data.selectedServices[0].quantity, 2, '确认后应保留服务份数');
assert.equal(page.data.duration, 120, '预计时长应按份数累加');
assert.equal(page.data.durationText, '2小时', '整小时应使用参考图中的小时表达');
assert.equal(page.data.quoteItemCount, 1, '项目数应按报价行统计');
assert.equal(page.data.calculatedText, '396.00', '系统价格应按份数累加');

const editFee = (field, value) => page.editTemporaryFee({ currentTarget: { dataset: { field } }, detail: { value } });
page.data.duration = 150;
editFee('name', '夜间服务费');
assert.equal(page.data.displayFees.length, 0, '未点击添加前新增项目不得进入组合清单');
assert.equal(page.data.calculatedText, '396.00', '输入中的临时项目不计入合计');
assert.equal(page.data.finalPrice, '396.00', '最终报价应与项目合计保持一致');
assert.equal(page.data.duration, 150, '修改临时费用应保留手动填写的服务时长');
editFee('price', '50');
page.addTemporaryFee();
assert.equal(page.data.displayFees[0].name, '夜间服务费', '点击添加后项目才进入组合清单');
assert.equal(page.data.otherFees.length, 1, '点击添加应保留该项目');
assert.equal(page.data.temporaryFee.name, '', '添加后清空输入以便继续填写');
assert.equal(page.data.calculatedText, '446.00', '点击添加后临时费用计入系统合计');
assert.equal(page.data.finalPrice, '446.00', '最终报价应同步项目合计');
editFee('name', '待删除项目');
page.addTemporaryFee();
assert.equal(page.data.feePriceError, true, '金额为空时应标红金额输入框');
assert.equal(page.data.otherFees.length, 1, '金额为空不得添加');
editFee('price', '20');
page.addTemporaryFee();
assert.equal(page.data.otherFees.length, 2, '信息完整后可继续添加');
page.removeFee({ currentTarget: { dataset: { index: 1 } } });
assert.equal(page.data.finalPrice, '446.00', '删除已添加项目应同步扣除费用');
page.openServicePicker();
assert.equal(page.data.servicePickerTotalText, '396.00', '服务弹窗只汇总已生效的服务项目');
page.confirmServicePicker();
assert.equal(page.data.calculatedText, '446.00', '其他费用应计入系统合计');

page.changeSelectedServiceQuantity({ currentTarget: { dataset: { id: 'basic', delta: -1 } } });
assert.equal(page.data.selectedServices[0].quantity, 1, '已选服务应可直接减少数量');
page.changeSelectedServiceQuantity({ currentTarget: { dataset: { id: 'basic', delta: -1 } } });
assert.equal(page.data.selectedServices.length, 0, '数量为一时确认后应移除服务');
page.data.serviceQuantities = { basic: 2 };
page.syncSelectedServices();
page.recalculate();

(async () => {
  const freshPage = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData: page.setData };
  await freshPage.onLoad();
  assert.equal(historyRequests, 0, '新建报价页不得请求未展示的历史报价列表');
  assert.equal(freshPage.data.loading, false, '历史报价接口不可用时也应正常加载服务');
  assert.deepEqual(Array.from(freshPage.data.services, item => item.id), ['active'], '只显示生效、可预约且已设置价格的服务');
  await freshPage.submit();
  assert.equal(submitted, undefined, '初次进入未选服务时转发操作不得提交');
  freshPage.toggleMore();
  freshPage.editTemporaryFee({ currentTarget: { dataset: { field: 'name' } }, detail: { value: '特殊饰品' } });
  assert.equal(freshPage.data.showMore, true, '未选择服务时也应可持续填写补充信息');
  assert.equal(freshPage.data.calculatedText, '0.00', '初始金额应显示零');
  page.onDurationInput({ detail: { value: '2.5' } });
  assert.equal(page.data.duration, 150, '小时输入应换算为分钟');
  page.input({ currentTarget: { dataset: { field: 'requirement' } }, detail: { value: '按本次需求临时添加特殊饰品' } });
  await page.submit();
  assert.equal(submitted.requirement, '按本次需求临时添加特殊饰品', '展示的补充备注应随报价提交');
  assert.equal(submitted.lines[0].quantity, 2, '提交报价时应携带服务份数');
  assert.equal(submitted.lines[1].lineType, 'surcharge', '其他费用应作为附加费用提交');
  assert.equal(submitted.finalPriceFen, 44600, '未手动改价时使用系统合计');
  assert.equal(submitted.totalDurationMinutes, 150, '提交时应保留编辑后的服务时长');
  assert.equal(navigatedTo, '/pages/client/quote-confirm/index?id=1', '创建后应进入新版报价单预览页');
  assert.equal(page.data.quote.id, 1, '创建后的报价应保留在当前页，返回时可继续预览和转发');
  editFee('name', '特殊饰品');
  const previousSubmission = submitted;
  await page.submit();
  assert.equal(submitted, previousSubmission, '已填写未添加的临时项目应阻止提交');
  editFee('price', '20');
  page.addTemporaryFee();
  await page.submit();
  assert.equal(submitted.lines[2].name, '特殊饰品', '点击添加后的临时项目应随报价提交');
  assert.equal(submitted.finalPriceFen, 46600, '提交金额应与实时显示金额一致');
  page.removeFee({ currentTarget: { dataset: { index: 1 } } });
  page.removeFee({ currentTarget: { dataset: { index: 0 } } });
  assert.equal(page.data.finalPrice, '396.00', '删除已添加项目应同步恢复服务总价');
  assert.match(template, /class="service-sheet"[\s\S]*data-delta="-1"[\s\S]*draftServiceQuantities\[item\.id\][\s\S]*data-delta="1"/, '服务应在底部弹窗中使用份数步进器');
  assert.doesNotMatch(template, /sheet-fee-section|draftOtherFees|addDraftFee|新增其他项目/, '服务弹窗不得提供新增其他项目');
  assert.match(template, /添加临时收费项目[\s\S]*temporary-fee-form[\s\S]*bindinput="editTemporaryFee"[\s\S]*bindtap="addTemporaryFee"/, '补充信息区应提供实时填写及添加临时费用的操作');
  assert.match(template, /class="quote-fee-heading"[\s\S]*class="quote-fee-tag">临时项目<\/text>[\s\S]*quote-fee-note">\{\{requirement \|\| '按本次需求临时添加'\}\}/, '临时项目应在名称后展示标签，下方显示备注或默认说明');
  assert.doesNotMatch(template, /sheet-fee-title|<text[^>]*>其他费用<\/text>/, '未新增费用时不应显示额外标题');
  assert.doesNotMatch(template, /empty-quote-card|empty-service-action/, '初始页面不得回退到旧版独立选择服务卡片');
  assert.match(template, /<block wx:elif="\{\{!quote\}\}">\s*<view class="compose-card">/, '新建报价应直接显示新版报价卡');
  assert.match(template, /class="compose-card"[\s\S]*新建报价单[\s\S]*意向报价[\s\S]*组合本次美甲服务[\s\S]*selectedServices[\s\S]*继续添加系统服务[\s\S]*系统预计时长[\s\S]*calculatedText/, '已选服务后应显示参考图中的报价组合卡');
  assert.match(template, /class="adjust-card"[\s\S]*最终报价调整[\s\S]*可编辑[\s\S]*最终报价（元）[\s\S]*服务时长（小时）/, '应显示可编辑的最终报价调整卡且时长以小时展示');
  assert.doesNotMatch(template, /unit-switch|unit-option|setDurationUnit/, '不得再提供时长单位切换');
  assert.doesNotMatch(styles, /\.unit-option|\.unit-switch/, '切换器样式应清理干净');
  assert.match(template, /temporary-fee-input temporary-fee-name \{\{feeNameError \? 'is-error' : ''\}\}/, '名称为空时输入框应标红提示');
  assert.match(template, /temporary-fee-input temporary-fee-price \{\{feePriceError \? 'is-error' : ''\}\}/, '金额为空时输入框应标红提示');
  assert.match(template, /adjust-value price-value \{\{finalPriceError \? 'is-error' : ''\}\}/, '最终报价高于合计时输入框应标红提示');
  assert.match(styles, /\.quote-fee-tag[^}]*color:\s*var\(--nb-favorite\)/s, '临时项目标签应使用五角星黄色');
  assert.match(styles, /\.quote-line-fee\s*\{[^}]*align-items:\s*flex-start/s, '临时项目价格应与名称首行对齐');
  assert.match(styles, /\.quote-fee-note[^}]*margin-top:\s*6rpx/s, '说明文字应紧贴项目名称');
  assert.match(styles, /\.quote-fee-remove\s*\{[^}]*margin:\s*-22rpx 0/s, '删除按钮保持 44px 触控区且不撑高名称行');
  assert.match(styles, /\.temporary-fee-input\.is-error[^}]*border-color:\s*var\(--nb-danger\)/s, '为空的输入框应标红提示');
  assert.doesNotMatch(styles, /\.adjust-field\s*\{[^}]*min-height/s, '标签与输入不得被最小高度拉开间距');
  assert.match(template, /class="supplement-card"[\s\S]*补充报价信息[\s\S]*showMore[\s\S]*备注/, '补充报价信息应展开临时费用和备注');
  assert.doesNotMatch(template, /chooseImages|removeImage|添加参考图片/, '补充报价信息不得再提供参考图片功能');
  assert.match(template, /报价单会自动带上你的主页[\s\S]*预览并转发报价单[\s\S]*客户接受报价后/, '应显示主页说明和底部转发操作');
  assert.doesNotMatch(template, /客户称呼|客户与需求信息/, '报价阶段不得采集客户信息');
  assert.match(template, /<nav-bar title="快捷报价" showBack backTitleLeft\/>/, '导航标题和对齐方式应匹配参考图');
  assert.match(template, /class="quote-submit \{\{!selectedServices.length \|\| submitting \? 'is-disabled' : ''\}\}"[\s\S]*aria-disabled="\{\{!selectedServices.length \|\| submitting\}\}"/, '未选服务和提交中应禁用主操作');
  assert.doesNotMatch(template, /wx:if="\{\{selectedServices.length \|\| otherFees.length\}\}"/, '空状态也必须显示汇总与完整报价表单');
  assert.match(template, /class="service-entry"[\s\S]*选择系统服务[\s\S]*按客户需求组合多个项目/, '空状态应显示截图中的服务入口');
  assert.match(styles, /\.compose-card[^}]*border-radius:\s*var\(--radius-xl\)/s, '主报价卡应使用参考图的大圆角');
  assert.match(styles, /\.adjust-fields[^}]*display:\s*flex/s, '报价和时长输入应双列排列');
  assert.match(styles, /\.quote-submit[^}]*min-height:\s*104rpx[^}]*background:\s*var\(--nb-text-link\)/s, '底部主操作应使用高触控蓝色按钮');
  assert.match(styles, /\.quote-submit\.is-disabled[^}]*background:\s*var\(--nb-pressed\)[^}]*color:\s*var\(--text-muted\)/s, '禁用态背景和文字应使用统一的中性语义色');
  assert.match(template, /is-disabled[\s\S]*navigation\.svg'[\s\S]*navigation-white\.svg'/, '禁用态应切换为与文字同色的中性图标');
  page.data.showMore = true;
  page.data.finalPrice = '100';
  page.data.serviceQuantities = {};
  page.syncSelectedServices();
  page.recalculate();
  assert.equal(page.data.showMore, false, '清空服务后折叠更多');
  assert.equal(page.data.finalPrice, '', '清空服务后重置手动报价');
  page.newQuote();
  assert.equal(page.data.quote, null, '创建新报价时应退出上一张报价预览');
  assert.equal(Object.prototype.hasOwnProperty.call(page.data, 'showHistory'), false, '快速报价页不保留重复的历史报价状态');
  assert.equal(Object.prototype.hasOwnProperty.call(page.data, 'quotes'), false, '报价记录统一由预约页管理');
  console.log('快速报价购物车式服务选择与固定汇总检查通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
