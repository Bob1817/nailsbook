const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const js = read('pages/technician/shop-management/index.js');
const wxml = read('pages/technician/shop-management/index.wxml');
const wxss = read('pages/technician/shop-management/index.wxss');
const app = JSON.parse(read('app.json'));

assert(app.requiredPrivateInfos && app.requiredPrivateInfos.includes('chooseLocation'), '小程序必须声明 chooseLocation 隐私能力');
assert(js.includes('privacy.requireWechatPrivacyAuthorization()'), '地图选址前必须请求微信隐私授权');
assert(js.includes("wx.chooseLocation({ success: resolve, fail: reject })"), '地图选址必须等待微信选点结果');
assert(js.includes('handleLocationFailure(err)'), '地图选址失败必须提供可恢复的反馈');
assert(!js.includes("if (!latitude || !longitude) { wx.showToast({ title: '请选择地图位置'"), '地图位置必须为可选项，不能阻止保存店铺');
assert(js.includes('privacy.openPrivacyContract()') && js.includes('wx.openSetting'), '隐私拒绝和系统权限拒绝必须分别处理');
assert(wxml.includes('form-section-title">基本信息') && wxml.includes('form-section-title">经营设置'), '店铺编辑表单必须按基本信息和经营设置分组');
assert(wxml.includes("locating ? '正在打开地图…'"), '地图选址必须提供即时加载反馈');
assert(wxml.includes('aria-label="选择店铺地图位置"'), '地图选址必须提供无障碍标签');
assert(wxml.includes('class="form-item guidance-setting form-item-last"') && wxml.includes('按到店顺序添加文字和图片'), '到店指引入口必须与开关形成清晰的设置分组');
assert(wxml.includes('class="bh-row"') && wxml.includes('class="bh-time-btn"'), '营业时间必须采用紧凑且可扫读的单行结构');
assert(/\.sheet-title \{[^}]*font-size: 36rpx;/.test(wxss) && /\.form-section-title \{[^}]*font-size:30rpx;/.test(wxss), '弹窗标题与分组标题必须建立明确字号层级');
assert(/\.sheet-close \{[^}]*width: 88rpx;[^}]*height: 88rpx;/.test(wxss), '关闭按钮必须满足 44px 触控尺寸');
assert(/\.sheet-footer \{[^}]*safe-area-inset-bottom/.test(wxss), '底部保存操作必须适配安全区');
assert(wxml.includes('<page-meta page-style="{{showAddModal ? \'overflow: hidden;\' : \'\'}}"/>'), '弹窗打开时必须锁定背景页面滚动');
assert(/\.container \{[^}]*box-sizing: border-box;/.test(wxss), '页面最小高度必须包含底部留白，避免单卡片页面产生空白滚动');
assert(js.includes("wx.pageScrollTo({ scrollTop: 0, duration: 0 })"), '关闭弹窗后必须恢复店铺卡片的可见位置');
assert(wxml.includes('class="card-settings"') && wxml.includes('class="guidance-card-action"'), '店铺卡片必须采用克制的分层信息结构');

console.log('店铺编辑弹窗与地图选址检查通过');
