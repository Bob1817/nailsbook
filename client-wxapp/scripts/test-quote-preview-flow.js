const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const previewJs = fs.readFileSync(path.join(root, 'pages/client/quote-confirm/index.js'), 'utf8');
const previewWxml = fs.readFileSync(path.join(root, 'pages/client/quote-confirm/index.wxml'), 'utf8');
const previewWxss = fs.readFileSync(path.join(root, 'pages/client/quote-confirm/index.wxss'), 'utf8');
const bookingJs = fs.readFileSync(path.join(root, 'pages/client/quote-booking/index.js'), 'utf8');
const bookingWxml = fs.readFileSync(path.join(root, 'pages/client/quote-booking/index.wxml'), 'utf8');
const recordsJs = fs.readFileSync(path.join(root, 'pages/technician/quote-records/index.js'), 'utf8');
const recordsWxml = fs.readFileSync(path.join(root, 'pages/technician/quote-records/index.wxml'), 'utf8');
const profileJs = fs.readFileSync(path.join(root, 'pages/technician/profile/index.js'), 'utf8');
const allBookingsJs = fs.readFileSync(path.join(root, 'pages/technician/all-bookings/index.js'), 'utf8');
const allBookingsWxml = fs.readFileSync(path.join(root, 'pages/technician/all-bookings/index.wxml'), 'utf8');
const designRequestsJs = fs.readFileSync(path.join(root, 'pages/technician/design-requests/index.js'), 'utf8');
const apiJs = fs.readFileSync(path.join(root, 'services/api.js'), 'utf8');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));

assert.match(previewWxml, /title="\{\{isInvalid \? '报价已失效' : \(booked \? '预约成功' : '报价单预览'\)\}\}"/);
assert.match(previewWxml, /isInvalid[\s\S]*quote-invalid-card[\s\S]*该报价已失效[\s\S]*viewArtist/);
assert.match(previewWxml, /preview-hero[\s\S]*preview-cover[\s\S]*preview-cover-scrim[\s\S]*onlynail-logo\.jpg[\s\S]*专属美甲方案/);
assert.match(previewJs, /artists\.detail\(quote\.technicianId\)[\s\S]*coverImage/);
assert.match(previewJs, /owner && !booked\) wx\.hideShareMenu\(\)[\s\S]*else wx\.showShareMenu/,
  '美甲师预览应隐藏系统分享入口，避免绕过确认流程');
assert.match(previewWxml, /quote\.technicianName[\s\S]*quote\.shopName[\s\S]*quote\.priceText[\s\S]*quote\.lines[\s\S]*durationText/);
// 预览页三卡片布局：品牌主图卡 + 美甲师卡 + 店铺卡 + 报价卡
assert.match(previewWxml, /quote-hero-card[\s\S]*class="quote-tile" bindtap="viewArtist"[\s\S]*class="quote-tile" bindtap="viewShop"[\s\S]*quote-tile-plain/);
assert.doesNotMatch(previewWxml, /preview-divider|artist-row|shop-row/, '预览页不得再用分割线拼接信息区');
// 价格判断展示：有优惠时展示原价与已优惠，最终价始终展示
assert.match(previewWxml, /discountFen > 0[\s\S]*price-original[\s\S]*price-save[\s\S]*price-final/);
assert.match(previewJs, /linesTotalFen[\s\S]*discountFen: linesTotalFen - Number\(quote\.finalPriceFen \|\| 0\)/);
assert.match(previewWxml, /owner && !booked[\s\S]*这是客户将看到的最终报价[\s\S]*修改报价/);
assert.doesNotMatch(previewWxml, /owner-edit-link/, '预览说明不应重复提供第二个修改入口');
assert.match(previewWxml, /bindtap="openShareConfirm">确认并分享[\s\S]*showShareConfirm[\s\S]*确认分享这份报价[\s\S]*open-type="share" bindtap="markShareStarted"/);
assert.doesNotMatch(previewWxml, /class="primary" open-type="share">确认转发/, '正式预览不得绕过确认层直接分享');
assert.match(previewJs, /returnToEdit\(\)[\s\S]*redirectTo\(\{ url: `\/pages\/technician\/quick-quote\/index\?quoteId=/,
  '正式预览返回修改时应替换当前页，避免简化预览或重复预览堆栈');
assert.match(previewJs, /completeQuoteShare\(\)[\s\S]*报价单已分享[\s\S]*reLaunch\(\{ url: '\/pages\/technician\/all-bookings\/index\?view=quotes'/,
  '分享完成后应提示并进入预约中的报价列表');
assert.match(previewJs, /payload\.success = \(\) => this\.completeQuoteShare\(\)[\s\S]*payload\.fail = \(\) => \{[\s\S]*showShareCompletion: false[\s\S]*未完成分享，请重试/,
  '微信返回分享结果时应区分成功与失败');
assert.match(previewJs, /markShareStarted\(\)[\s\S]*setTimeout\(\(\) => this\.setData\(\{ showShareConfirm: false, showShareCompletion: true \}\), 300\)/,
  '应先唤起原生分享面板，再显示结果确认，避免提前移除分享按钮');
assert.match(previewWxml, /showShareCompletion[\s\S]*部分微信版本不会返回分享结果[\s\S]*已完成分享，返回列表/,
  '微信不返回分享结果时应由美甲师确认，避免把取消分享误报为成功');
assert.match(previewWxss, /\.share-sheet[^}]*position:fixed[\s\S]*\.share-sheet-primary[^}]*min-height:96rpx/,
  '分享确认层应固定展示且操作按钮满足触控尺寸');
assert.match(previewWxml, /我再想想[\s\S]*同意并预约/);
assert.match(previewWxml, /showReasons[\s\S]*太贵了|reasons/);
assert.match(previewJs, /reasons: \['太贵了', '距离太远了', '最近没空', '只是问问而已'/);
assert.match(previewJs, /bookingQuotes\.decline\(this\.token, reason\)/);
assert.match(previewJs, /buildClientLoginUrl\(path, \{ inviteCode: this\.inviteCode, source: 'booking_quote' \}\)/);
assert.match(previewJs, /bookingQuotes\.accept\(this\.token\)[\s\S]*quote-booking\/index\?token=/);
assert.match(previewWxss, /\.preview-actions\s*\{[^}]*position:fixed/s);
assert.match(previewWxss, /\.preview-actions button\s*\{[^}]*align-items:center;[^}]*justify-content:center/s);

// 死循环修复：accepted_pending_schedule 状态提供"选择预约时间"按钮；单页栈出口由公共导航统一处理
assert.match(previewWxml, /wx:elif="\{\{!booked && accepted\}\}"[\s\S]*bindtap="goBooking"/);
assert.match(previewWxml, /class="state-exit" hover-class="link-pressed" bindtap="goHome"/);
assert.match(previewJs, /goHome: goEntryHome[\s\S]*goHome\(\) \{\s*goEntryHome\(\)/,
  '报价预览的显式首页入口应复用登录态导航');
assert.match(bookingWxml, /class="state-exit" hover-class="link-pressed" bindtap="goHome"/);
assert.match(bookingWxml, /class="home-exit"[\s\S]*bindtap="goHome"/);
assert.match(bookingJs, /goHome: goEntryHome[\s\S]*goHome\(\) \{\s*goEntryHome\(\)/,
  '报价预约的显式首页入口应复用登录态导航');

// 登录链路修复：未登录点"同意并预约"必须唤起登录（navigateTo 失败时 reLaunch 兜底），过期登录态视为未登录以保留报价回跳
assert.match(previewJs, /const loginUrl = buildClientLoginUrl\(path, \{ inviteCode: this\.inviteCode, source: 'booking_quote' \}\)/);
assert.match(previewJs, /navigateTo\(\{ url: loginUrl, fail: \(\) => wx\.reLaunch\(\{ url: loginUrl \}\) \}\)/);
assert.match(previewJs, /getTokenExpiresAt\(token\)[\s\S]*?expiresAt <= Date\.now\(\)/);
assert.match(bookingJs, /getTokenExpiresAt\(token\)[\s\S]*?expiresAt <= Date\.now\(\)/);

// 登录用户冷启动打开分享报价页不被强制拉回首页
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
assert.match(appJs, /preserveSharePage[^\n]*pages\/client\/quote-confirm\/index[^\n]*pages\/client\/quote-booking\/index/);

// 报价单下载/转发：下载图为带小程序码的报价单，支持存相册与转发图片
assert.match(previewWxml, /bindtap="downloadQuote"/);
assert.match(previewJs, /bookingQuotes\.image\(this\.data\.quote\.id\)/);
assert.match(previewJs, /saveImageToPhotosAlbum/);
assert.match(previewJs, /showShareImageMenu/);
assert.match(previewJs, /showActionSheet\(\{\s*itemList: \['下载到相册', '转发给好友'\]/);
assert.match(previewJs, /parseWorkScene\(options\.scene\)[\s\S]*token: scene\.shareToken/);

// 我再想想：支持自定义填写理由
assert.match(previewWxml, /customReason[\s\S]*reason-input[\s\S]*submitCustomReason/);
assert.match(previewJs, /selectReason[\s\S]*其他原因[\s\S]*customReason: true/);
assert.match(previewJs, /submitCustomReason[\s\S]*bookingQuotes\.decline\(this\.token, reason\)/);

// 营销工具模块中的【我的报价】独立页面与报价记录管理
assert.ok(app.subPackages.find(item => item.root === 'pages/technician').pages.includes('quote-records/index'));
assert.match(recordsJs, /api\.technician\.bookingQuotes\.list\(\)/);
assert.match(recordsJs, /decorateItem[\s\S]*_category[\s\S]*_statusLabel/);
assert.match(recordsWxml, /nav-bar title="我的报价"/);
assert.match(recordsWxml, /quote-card[\s\S]*quote-no[\s\S]*decline-box[\s\S]*order-box/);
const marketingWxml = fs.readFileSync(path.join(root, 'pages/technician/marketing-materials/index.wxml'), 'utf8');
const marketingJs = fs.readFileSync(path.join(root, 'pages/technician/marketing-materials/index.js'), 'utf8');
assert.match(marketingWxml, /data-route="quoteRecords"[\s\S]*我的报价/);
assert.match(marketingJs, /route === 'quoteRecords'[\s\S]*navigateTo\(\{ url: '\/pages\/technician\/quote-records\/index' \}\)/);
const loginJs = fs.readFileSync(path.join(root, 'pages/login/index.js'), 'utf8');
assert.match(loginJs, /isDirectBookingFlow = nextPage\.includes\('quote-'\)[\s\S]*!isDirectBookingFlow/);
assert.match(apiJs, /customService:\s*\{[\s\S]*?`\$\{T\}\/custom-service-requests`[\s\S]*?\/quote/);

assert.match(bookingWxml, /booking-time-picker[\s\S]*tech-id="\{\{quote\.technicianId\}\}"[\s\S]*duration-minutes="\{\{quote\.totalDurationMinutes\}\}"/);
assert.match(bookingWxml, /quote\.lines[\s\S]*nameSnapshot[\s\S]*subtotalFen/);
assert.match(bookingWxml, /客户[\s\S]*client \? client\.displayName/);
assert.match(bookingJs, /auth\.getUserInfo\('client'\)/);
assert.match(bookingJs, /bookingQuotes\.book\(this\.token,[\s\S]*version: this\.data\.quote\.version[\s\S]*serviceDate: this\.data\.serviceDate[\s\S]*startTime: this\.data\.startTime/);
assert.ok(app.subPackages.find(item => item.root === 'pages/client').pages.includes('quote-booking/index'));

console.log('报价单预览、转发、反馈与报价预约流程检查通过');
