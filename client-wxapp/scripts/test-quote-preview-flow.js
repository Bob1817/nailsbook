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

assert.match(previewWxml, /title="\{\{booked \? '预约成功' : '报价单预览'\}\}"/);
assert.match(previewWxml, /preview-hero[\s\S]*preview-cover[\s\S]*preview-cover-scrim[\s\S]*onlynail-logo\.jpg[\s\S]*专属美甲方案/);
assert.match(previewJs, /artists\.detail\(quote\.technicianId\)[\s\S]*coverImage/);
assert.match(previewWxml, /quote\.technicianName[\s\S]*quote\.shopName[\s\S]*quote\.priceText[\s\S]*quote\.lines[\s\S]*durationText/);
// 预览页三卡片布局：品牌主图卡 + 美甲师卡 + 店铺卡 + 报价卡
assert.match(previewWxml, /quote-hero-card[\s\S]*class="quote-tile" bindtap="viewArtist"[\s\S]*class="quote-tile" bindtap="viewShop"[\s\S]*quote-tile-plain/);
assert.doesNotMatch(previewWxml, /preview-divider|artist-row|shop-row/, '预览页不得再用分割线拼接信息区');
// 价格判断展示：有优惠时展示原价与已优惠，最终价始终展示
assert.match(previewWxml, /discountFen > 0[\s\S]*price-original[\s\S]*price-save[\s\S]*price-final/);
assert.match(previewJs, /linesTotalFen[\s\S]*discountFen: linesTotalFen - Number\(quote\.finalPriceFen \|\| 0\)/);
assert.match(previewWxml, /owner && !booked[\s\S]*返回修改[\s\S]*open-type="share">确认转发/);
assert.match(previewWxml, /我再想想[\s\S]*同意并预约/);
assert.match(previewWxml, /showReasons[\s\S]*太贵了|reasons/);
assert.match(previewJs, /reasons: \['太贵了', '距离太远了', '最近没空', '只是问问而已'/);
assert.match(previewJs, /bookingQuotes\.decline\(this\.token, reason\)/);
assert.match(previewJs, /buildClientLoginUrl\(path, \{ inviteCode: this\.inviteCode, source: 'booking_quote' \}\)/);
assert.match(previewJs, /bookingQuotes\.accept\(this\.token\)[\s\S]*quote-booking\/index\?token=/);
assert.match(previewWxss, /\.preview-actions\s*\{[^}]*position:fixed/s);
assert.match(previewWxss, /\.preview-actions button\s*\{[^}]*align-items:center;[^}]*justify-content:center/s);

// 死循环修复：accepted_pending_schedule 状态提供"选择预约时间"按钮，所有状态提供回主页 reLaunch 出口
assert.match(previewWxml, /wx:elif="\{\{!booked && accepted\}\}"[\s\S]*bindtap="goBooking"/);
assert.match(previewWxml, /class="home-exit" hover-class="link-pressed" bindtap="goHome"\>\{\{owner \? '返回美甲师工作台' : '进入小程序首页'\}/);
assert.match(previewWxml, /class="state-exit" hover-class="link-pressed" bindtap="goHome"/);
assert.match(previewJs, /goHome\(\) \{[\s\S]*?wx\.reLaunch\(\{ url: role === 'technician' \? '\/pages\/technician\/home\/index' : '\/pages\/client\/home\/index' \}\)/);
assert.match(bookingWxml, /class="state-exit" hover-class="link-pressed" bindtap="goHome"/);
assert.match(bookingWxml, /class="home-exit"[\s\S]*bindtap="goHome"/);
assert.match(bookingJs, /goHome\(\) \{[\s\S]*?wx\.reLaunch/);

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

// 报价作为预约前置状态统一在预约页管理；旧地址仅保留兼容跳转。
assert.doesNotMatch(profileJs, /quoteRecords|报价记录/);
assert.ok(app.subPackages.find(item => item.root === 'pages/technician').pages.includes('quote-records/index'));
assert.match(recordsJs, /redirectTo\(\{ url: '\/pages\/technician\/all-bookings\/index\?view=quotes' \}\)/);
assert.match(recordsWxml, /正在打开预约中的报价/);
assert.match(allBookingsJs, /PRE_BOOKING_FILTER[\s\S]*pre_booking[\s\S]*bookingQuotes\.list\(\)[\s\S]*designs\.list\(\)[\s\S]*customService\.list\(\)/);
assert.match(allBookingsJs, /accepted_pending_schedule: '待客户选时间'/);
assert.match(allBookingsJs, /openQuoteOrder[\s\S]*order-detail\/index\?id=/);
assert.match(allBookingsJs, /submitRequestQuote[\s\S]*designs\.quote[\s\S]*customService\.quote/);
assert.match(allBookingsWxml, /快速报价[\s\S]*activeFilter === 'pre_booking'[\s\S]*客户设计[\s\S]*立即报价|_kindText[\s\S]*立即报价/);
assert.match(designRequestsJs, /redirectTo\(\{ url: '\/pages\/technician\/all-bookings\/index\?view=requests' \}\)/);
assert.match(apiJs, /customService:\s*\{[\s\S]*?`\$\{T\}\/custom-service-requests`[\s\S]*?\/quote/);

assert.match(bookingWxml, /booking-time-picker[\s\S]*tech-id="\{\{quote\.technicianId\}\}"[\s\S]*duration-minutes="\{\{quote\.totalDurationMinutes\}\}"/);
assert.match(bookingWxml, /quote\.lines[\s\S]*nameSnapshot[\s\S]*subtotalFen/);
assert.match(bookingWxml, /客户[\s\S]*client \? client\.displayName/);
assert.match(bookingJs, /auth\.getUserInfo\('client'\)/);
assert.match(bookingWxml, /项目、店铺和价格已由报价单带入[\s\S]*确认预约/);
assert.match(bookingJs, /bookingQuotes\.book\(this\.token, \{ version: this\.data\.quote\.version, serviceDate: this\.data\.serviceDate, startTime: this\.data\.startTime \}\)/);
assert.ok(app.subPackages.find(item => item.root === 'pages/client').pages.includes('quote-booking/index'));

console.log('报价单预览、转发、反馈与报价预约流程检查通过');
