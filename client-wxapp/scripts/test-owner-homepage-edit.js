const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const profile = fs.readFileSync(path.join(root, 'pages/technician/profile/index.js'), 'utf8');
const homeJs = fs.readFileSync(path.join(root, 'pages/client/artist-home/index.js'), 'utf8');
const homeWxml = fs.readFileSync(path.join(root, 'pages/client/artist-home/index.wxml'), 'utf8');
const editorWxml = fs.readFileSync(path.join(root, 'pages/technician/homepage-settings/index.wxml'), 'utf8');
const editorWxss = fs.readFileSync(path.join(root, 'pages/technician/homepage-settings/index.wxss'), 'utf8');
const homeWxss = fs.readFileSync(path.join(root, 'pages/client/artist-home/index.wxss'), 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'services/api.js'), 'utf8');
const interactionsJs = fs.readFileSync(path.join(root, 'pages/technician/artist-interactions/index.js'), 'utf8');
const interactionsWxml = fs.readFileSync(path.join(root, 'pages/technician/artist-interactions/index.wxml'), 'utf8');

assert(profile.includes("&preview=1&owner=1"), '经营工具中的我的主页必须先进入本人预览');
assert(homeJs.includes("options.owner === '1'"), '公开主页必须识别本人预览');
assert(homeJs.includes('showOwnerMenu()'), '本人预览必须提供右上角主页管理菜单');
assert(homeWxml.includes('wx:if="{{isOwner}}" class="owner-menu"'), '本人编辑入口必须收敛到右上角三点菜单');
assert(homeWxml.includes('class="artist-hero-sticky" style="top: {{navBarHeight}}px;"'), '主页背景图与美甲师信息必须按实际导航栏高度整体吸顶');
assert.match(homeWxml, /class="artist-hero-sticky"[\s\S]*class="banner-section"[\s\S]*class="artist-sticky \{\{isOwner \? 'has-owner-menu' : ''\}\}"/, '整体吸顶容器必须同时包含主页背景图和美甲师信息');
assert.match(homeWxss, /\.artist-hero-sticky\s*\{[^}]*position:\s*sticky;[^}]*z-index:\s*90;/s, '主页头部整体必须保持吸顶');
assert.match(homeWxss, /\.artist-sticky\s*\{[^}]*min-height:\s*156rpx;[^}]*margin-top:\s*-156rpx;[^}]*padding:\s*12rpx\s+40rpx\s+32rpx;/s, '美甲师信息必须覆盖背景图并与底部边界保留明确间距');
assert.match(homeWxss, /\.artist-sticky\s*\{[^}]*background:\s*transparent;/s, '美甲师信息区必须融入背景图，不得使用独立纯色块');
assert.match(homeWxss, /\.banner-gradient\s*\{[^}]*linear-gradient\([^;]*rgba\(0, 0, 0, 0\.82\) 100%\);/s, '背景图底部必须使用渐深遮罩保证信息可读性');
assert(homeJs.includes('wx.getMenuButtonBoundingClientRect()') && homeJs.includes('this.setData({ navBarHeight })'), '吸顶位置必须适配微信导航栏和设备安全区');
assert(!homeJs.includes('wx.showActionSheet'), '主页管理菜单不得继续使用字号和留白不可控的系统 ActionSheet');
assert(homeJs.includes('showOwnerMenuSheet: false') && homeWxml.includes('wx:if="{{showOwnerMenuSheet}}"'), '主页管理操作必须使用项目内的紧凑底部菜单');
assert(homeWxml.includes('data-action="edit"') && homeWxml.includes('data-action="interactions"'), '自定义主页管理菜单必须保留编辑主页和互动记录入口');
assert.match(homeWxss, /\.owner-action-item,[\s\S]*?min-height:\s*44px;[\s\S]*?font-size:\s*var\(--font-sm\);/, '主页管理菜单必须使用正文层级字号并保留 44px 触控高度');
assert.match(homeWxss, /\.owner-menu\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;[^}]*background:\s*transparent;/s, '主页管理入口必须保留 44px 透明触控热区');
assert.match(homeWxss, /\.owner-menu image\s*\{[^}]*width:\s*20px;[^}]*height:\s*20px;[^}]*padding:\s*4px;/s, '主页管理图标的可见底面必须保持克制');
assert(!homeWxml.includes('btn-edit-homepage'), '本人底部不得使用独立编辑按钮替换客户主页操作栏');
assert(!homeWxml.includes('btn-book-now'), '主页顶部不得重复展示预约按钮');
assert(homeWxml.includes('bindtap="toggleLike"') && homeWxml.includes('bindtap="toggleFavorite"') && homeWxml.includes('bindtap="openComments"'), '底部必须展示主页点赞、收藏和评论入口');
assert(/class="btn-book-main booking-action/.test(homeWxml), '本人和客户必须复用同一预约按钮结构');
assert(!homeWxml.includes('class="booking-availability-summary'), '档期摘要不得单独占用底部一行');
assert(homeWxml.includes("availabilitySummary || '发起预约'"), '动态档期文案必须直接融入预约按钮');
assert(homeJs.includes('buildAvailabilitySummary(artist, bookingSettings)') && homeJs.includes('api.public.bookingSettings(this.data.artistId)'), '档期摘要必须根据真实预约设置动态计算');
for (const stateText of ['已暂停接单', '今日可约', '明日可约', '后日可约', '暂无可约档期']) {
  assert(homeJs.includes(stateText), `档期摘要缺少${stateText}状态`);
}
assert(!homeWxss.includes('.booking-availability-summary'), '独立档期提示样式必须同步移除');

class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [2026, 9, 16, 10, 0, 0])); }
}
const availabilityContext = {
  Date: FixedDate,
  Page: () => {},
  require: (request) => request.includes('booking-time-engine')
    ? { activeScheduleForDate: () => ({}) }
    : {},
  console
};
vm.runInNewContext(`${homeJs}\n;globalThis.buildSummaryForTest = buildAvailabilitySummary;`, availabilityContext);
const buildSummary = availabilityContext.buildSummaryForTest;
const artist = { acceptingBookings: true, serviceSchedule: {} };
const settings = (dailyBookingLimit, bookingCounts = {}) => ({ dailyBookingLimit, bookingCounts, days: [] });
assert.equal(buildSummary(artist, settings(4)).text, '今日可约', '今日剩余4个及以上名额时应使用简短可约文案');
assert.equal(buildSummary(artist, settings(3)).text, '仅剩 3 名额', '今日剩余1至3个名额时应显示具体余量');
assert.equal(buildSummary(artist, settings(4, { '2026-10-16': 3 })).text, '仅剩 1 名额', '今日只剩1个名额时必须明确提示稀缺性');
assert.equal(buildSummary(artist, settings(1, { '2026-10-16': 1 })).text, '明日可约', '今日约满时应显示明日档期且不显示余量');
assert.equal(buildSummary(artist, settings(1, { '2026-10-16': 1, '2026-10-17': 1 })).text, '后日可约', '今日和明日约满时应显示后日档期');
assert.equal(buildSummary(artist, settings(1, { '2026-10-16': 1, '2026-10-17': 1, '2026-10-18': 1 })).text, '10月19日可约', '后日以后只显示月日和可约状态');
for (const title of ['简介', '履历', '店铺', '精选作品', '精选评论']) {
  assert(homeWxml.includes(`<text class="section-title">${title}</text>`), `精简主页缺少${title}模块`);
}
for (const hiddenTitle of ['近期档期', '擅长风格', '服务流程', '服务内容', '常见问题', '客户评价', '主页评论']) {
  assert(!homeWxml.includes(`<text class="section-title">${hiddenTitle}</text>`), `${hiddenTitle}不应继续占用主页主流程`);
}
assert(homeWxml.includes('wx:if="{{detailModal}}"') && homeJs.includes("detailModal: ''"), '简介、履历、店铺与评论详情应收敛到弹窗');
for (const handler of ['openAboutDetail()', 'openCareerDetail()', 'openStudioDetail()', 'openReviewDetail()', 'closeDetailModal()']) {
  assert(homeJs.includes(handler), `主页缺少${handler}弹窗交互`);
}
assert(homeWxml.includes('wx:if="{{showStudioPolicyModal}}"') && homeJs.includes('openStudioPolicies()') && homeJs.includes('closeStudioPolicies()'), '服务政策必须通过详情弹窗展示');
assert(homeWxml.includes('class="shop-actions"') && homeWxml.includes('bindtap="openNavigation"') && homeWxml.includes('bindtap="callPhone"'), '店铺摘要必须保留导航和电话操作');
assert.match(homeWxss, /\.shop-summary-image\s*\{[^}]*height:\s*360rpx;/s, '店铺摘要必须优先展示足够高度的环境图片');
assert.equal((homeWxml.match(/class="detail-icon-wrap"/g) || []).length, 2, '店铺地址与营业时间图标必须使用统一固定列');
assert.match(homeWxss, /\.detail-icon-wrap\s*\{[^}]*width:\s*32rpx;[^}]*min-height:\s*38rpx;[^}]*align-items:\s*center;/s, '店铺图标必须与首行文字垂直居中');
assert.match(homeWxss, /\.shop-info\s*\{[^}]*padding:\s*24rpx\s+32rpx\s+20rpx;/s, '店铺按钮下方必须使用紧凑留白');
assert.match(homeWxss, /\.shop-detail-row\s*\{[^}]*margin-bottom:\s*16rpx;/s, '店铺信息行之间必须保留可读间距');
assert.match(homeWxss, /\.shop-actions\s*\{[^}]*margin-top:\s*20rpx;/s, '店铺信息与操作按钮之间必须保留明确间距');
assert.match(homeWxss, /\.profile-detail-panel\s*\{[^}]*max-height:\s*82vh;/s, '主页详情弹窗必须限制高度并在内部滚动');
assert.match(homeWxss, /\.profile-detail-close\s*\{[^}]*min-height:\s*44px;/s, '主页详情弹窗关闭入口必须满足触控尺寸');
assert(apiSource.includes('homepageInteractions') && apiSource.includes('toggleHomepageLike') && apiSource.includes('addHomepageComment'), '主页互动必须接入真实后端接口');
assert(interactionsWxml.includes('data-type="like"') && interactionsWxml.includes('data-type="favorite"') && interactionsWxml.includes('data-type="comment"'), '美甲师互动记录页必须区分点赞、收藏和评论');
assert(interactionsJs.includes("itemList: [item.isPinned ? '取消置顶' : '置顶评论'"), '美甲师必须能够管理主页评论');
assert(editorWxml.includes('<nav-bar title="编辑主页"'), '配置页标题必须明确为编辑主页');
['主页形象', '公开资料', '擅长风格', '个人介绍', '服务项目与价格', '主页精选作品'].forEach((title) => assert(editorWxml.includes(title), `编辑页缺少${title}模块`));
assert(editorWxml.includes('均为选填') && editorWxml.includes('未填写的内容不会展示'), '编辑页必须明确主页资料为选填');
assert(homeWxml.includes('wx:if="{{timeline.length || qualifications.length}}"'), '空的履历模块不得展示');
assert(homeWxml.includes('wx:if="{{featuredComments.length}}"'), '空的精选评论模块不得展示');
assert(homeWxml.includes('wx:if="{{works.length}}"'), '空的精选作品模块不得展示');
assert(homeWxml.includes('<work-card work="{{item}}" show-artist="{{false}}" bind:cardtap="viewWork"'), '主页精选作品必须复用标准作品卡片的公开展示形态');
assert(!homeWxml.includes('gallery-item') && !homeWxss.includes('.gallery-item'), '主页不得继续维护独立作品卡片结构和样式');
assert(homeJs.includes('const useHomepageDefaults = brand.featuredServiceIds == null'), '公开主页必须识别尚未配置展示选择的状态');
assert(homeJs.includes('api.public.brands.works(this.data.artistId') && homeJs.includes('worksRes.items || worksRes.works'), '主页精选作品必须从支持美甲师身份的品牌作品接口读取并兼容分页结构');
assert(homeJs.includes('if (this._reloadOnShow)') && homeJs.includes('this.loadHome();'), '保存后返回本人主页时必须重新加载已生效内容');
assert(homeJs.includes('sourceWorks.slice(0, 6)'), '尚未配置精选作品时必须使用前六个公开作品作为默认展示');
assert.match(editorWxss, /\.save\s*\{[^}]*min-height:\s*96rpx/s, '保存按钮必须满足移动端触控尺寸');

console.log('Owner homepage preview and editor hierarchy checks passed.');
