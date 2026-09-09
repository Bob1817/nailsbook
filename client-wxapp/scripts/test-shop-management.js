const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const js = read('pages/technician/shop-management/index.js');
const wxml = read('pages/technician/shop-management/index.wxml');
const wxss = read('pages/technician/shop-management/index.wxss');
const switchWxss = read('components/nb-switch/index.wxss');
const app = JSON.parse(read('app.json'));

assert(!app.requiredPrivateInfos && !app.permission, '首发版不得声明位置权限');
assert(!js.includes('chooseLocation') && !wxml.includes('地图定位'), '首发版店铺管理不得提供地图选址');
assert(!js.includes("if (!latitude || !longitude) { wx.showToast({ title: '请选择地图位置'"), '地图位置必须为可选项，不能阻止保存店铺');
assert(wxml.includes('<nb-switch checked="{{guidanceEnabled}}" bindchange="toggleGuidanceEnabled" label="启用到店指引"/>') && !wxml.includes('disabled="{{!detailAddress}}"'), '到店指引开关不能依赖地址或指引内容才能操作');
assert(!js.includes('if (value && !this.data.detailAddress)') && js.includes('this.setData({ guidanceEnabled: e.detail.value })'), '到店指引开关只控制入口展示状态');
assert(/\.switch-track\s*\{[^}]*background:var\(--nb-secondary\)/.test(switchWxss)
  && /\.switch-track\.is-on\s*\{[^}]*background:var\(--nb-success\)/.test(switchWxss), '所有开关必须统一为关闭灰色、开启绿色');
assert(wxml.includes('form-section-title">基本信息') && wxml.includes('form-section-title">经营设置'), '店铺编辑表单必须按基本信息和经营设置分组');
assert(wxml.includes('class="form-item guidance-setting form-item-last"') && wxml.includes('按到店顺序添加文字和图片'), '到店指引入口必须与开关形成清晰的设置分组');
assert(wxml.includes('class="bh-row"') && wxml.includes('class="bh-time-btn"'), '营业时间必须采用紧凑且可扫读的单行结构');
assert(/\.sheet-title \{[^}]*font-size: 36rpx;/.test(wxss) && /\.form-section-title \{[^}]*font-size:30rpx;/.test(wxss), '弹窗标题与分组标题必须建立明确字号层级');
assert(/\.label\s*\{[^}]*font-size:\s*var\(--font-sm\);[^}]*font-weight:var\(--weight-medium\);/.test(wxss), '字段标签必须使用标准表单文字层级');
assert(/\.input\s*\{[^}]*height:\s*var\(--input-height\);/.test(wxss)
  && /\.input\s*\{[^}]*background:\s*var\(--nb-soft-surface\);/.test(wxss)
  && /\.input\s*\{[^}]*border:\s*2rpx solid transparent;/.test(wxss), '输入框必须使用统一高度、边界和表面样式');
assert(/\.input:focus\s*\{[^}]*border-color:var\(--border-focus\);/.test(wxss), '输入框必须提供清晰的聚焦反馈');
assert(/\.picker-input\.placeholder\s*\{[^}]*font-size:\s*var\(--font-sm\);/.test(wxss), '地区选择提示文字必须与输入框提示文字字号一致');
assert(!wxml.includes('class="sheet-close"') && wxml.includes('<button class="btn-cancel" bindtap="closeModal"'), '弹窗关闭操作必须移出微信右上角系统控制区');
assert(/\.btn-cancel,\s*\.btn-save\s*\{[^}]*height: 88rpx;/.test(wxss), '取消与保存按钮必须满足 44px 触控尺寸');
assert(/\.sheet-footer \{[^}]*safe-area-inset-bottom/.test(wxss), '底部保存操作必须适配安全区');
assert(wxml.includes('<page-meta page-style="{{showAddModal ? \'overflow: hidden;\' : \'\'}}"/>'), '弹窗打开时必须锁定背景页面滚动');
assert(/\.container \{[^}]*box-sizing: border-box;/.test(wxss), '页面最小高度必须包含底部留白，避免单卡片页面产生空白滚动');
assert(js.includes("wx.pageScrollTo({ scrollTop: 0, duration: 0 })"), '关闭弹窗后必须恢复店铺卡片的可见位置');
assert(wxml.includes('class="card-settings"') && wxml.includes('class="shop-guidance-link"'), '开启指引后必须在店铺地址下方显示入口');
assert(/\.shop-guidance-link\s*\{[^}]*height:40rpx;[^}]*margin:4rpx 0 0 40rpx;[^}]*color:var\(--nb-text-link\)/.test(wxss), '地址与到店指引使用 4rpx 标准间距及蓝色链接样式');
assert(/\.card-settings\s*\{[^}]*margin-top:\s*20rpx;/.test(wxss) && /\.card-actions\s*\{[^}]*margin-top:\s*20rpx;/.test(wxss), '店铺卡片模块间距必须统一为 20rpx');
assert(/\.shop-guidance-link\s*\{[^}]*height:40rpx;[^}]*margin:4rpx 0 0 40rpx;[^}]*color:var\(--nb-text-link\);/.test(wxss), '地址与到店指引链接必须使用标准间距和蓝色链接色');
assert(wxml.includes('class="shop-icon-wrap"') && wxml.includes('接受到店预约'), '店铺卡片必须分开展示店铺身份与预约状态');
assert(/\.shop-enabled-sub\s*\{[^}]*width:\s*100%;[^}]*white-space:\s*nowrap;/.test(wxss), '店铺开关说明必须保持单行展示');
assert(wxml.includes('class="fab" bindtap="openAdd" role="button" aria-label="添加店铺"'), '添加店铺悬浮按钮必须提供无障碍标签');
assert(/\.fab-icon::before,\s*\.fab-icon::after\s*\{[^}]*left:\s*50%;[^}]*top:\s*50%;[^}]*transform:\s*translate\(-50%, -50%\);/.test(wxss), '悬浮按钮加号必须使用中心定位绘制');
assert(wxml.includes('编辑店铺') && wxml.includes('删除店铺'), '店铺卡片管理操作必须使用明确且一致的四字文案');
assert(/\.card-edit, \.delete-card-action\s*\{[^}]*flex:\s*1;[^}]*height:\s*44px;[^}]*font-size:\s*24rpx;[^}]*border-radius:\s*8px/.test(wxss), '店铺卡片底部操作必须使用预约卡片的紧凑按钮标准');
assert(/\.delete-card-action\s*\{[^}]*background:\s*var\(--nb-danger-surface\)/.test(wxss), '删除店铺必须使用独立危险操作样式');

console.log('店铺编辑弹窗与首发无位置权限检查通过');
