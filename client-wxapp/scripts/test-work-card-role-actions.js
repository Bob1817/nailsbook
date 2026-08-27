const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const wxml = fs.readFileSync(path.join(root, 'components/work-card/index.wxml'), 'utf8');
const js = fs.readFileSync(path.join(root, 'components/work-card/index.js'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'components/work-card/index.wxss'), 'utf8');
const technicianHomeJs = fs.readFileSync(path.join(root, 'pages/technician/home/index.js'), 'utf8');

function expect(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

expect(wxml, /wx:if="\{\{manageable\}\}" class="wc-manage"[\s\S]*catchtap="onActionTap"/, '技师端应保留右上角管理入口');
expect(wxml, /wx:if="\{\{showClientActions\}\}" class="wc-client-actions"/, '客户端仅应在绑定发布者后展示独立操作区');
expect(wxml, /catchtap="onLikeTap"[\s\S]*catchtap="onFavoriteTap"[\s\S]*catchtap="onBookTap"/, '客户端操作顺序应为点赞、收藏、预约同款');
expect(js, /url: '\/pages\/client\/create-order\/index\?workId=' \+ work\.id/, '预约同款应携带作品 ID 进入下单页');
expect(wxss, /\.wc-manage \{[^}]*width:88rpx;[^}]*height:88rpx;/, '技师管理入口应满足 44px 触控尺寸');
expect(wxss, /\.wc-status-icons \{[^}]*left:12rpx;/, '作品状态胶囊左侧应使用统一卡片边距');
expect(wxss, /\.wc-manage \{[^}]*padding:17rpx 12rpx 0 0;[^}]*justify-content:flex-end;/, '管理图标右侧可见边距应与状态胶囊左侧一致');
expect(wxss, /\.wc-book-same \{[^}]*min-height:88rpx;/, '预约同款应满足 44px 触控尺寸');
expect(js, /showClientActions: !manageable && publisherBound/, '作品卡片操作应由发布者身份和绑定关系共同决定');
expect(js, /standardPriceFen \|\| w\.serviceSubtotalFen \|\| w\.priceCents/, '作品卡片应兼容服务标准价格字段');
expect(technicianHomeJs, /\.map\(\(w\) => \(\{\s*\.\.\.w,/, '美甲师首页应保留接口返回的完整作品价格字段');
if (/priceText: w\.price \? '¥' \+ w\.price : ''/.test(technicianHomeJs)) {
  throw new Error('美甲师首页不应使用旧 price 字段覆盖统一价格口径');
}
expect(wxss, /\.wc-book-label \{[^}]*height:64rpx;/, '预约同款可见按钮高度应保持紧凑');
expect(wxml, /class="wc-client-tools"[\s\S]*onLikeTap[\s\S]*onFavoriteTap[\s\S]*onBookTap/, '点赞和收藏应位于紧凑操作组，预约按钮独立靠右');
expect(wxss, /\.wc-client-tools \{[^}]*gap:2rpx;/, '点赞和收藏之间应使用紧凑间距');
expect(wxss, /\.wc-client-action \{[^}]*width:64rpx;[^}]*min-width:64rpx;/, '点赞和收藏应使用固定紧凑宽度');
expect(wxss, /\.wc-client-actions \{[^}]*gap:8rpx;[^}]*box-sizing:border-box;/, '收藏与预约同款之间应使用固定紧凑间距');
expect(wxss, /\.wc-book-same \{[^}]*flex:1;[^}]*min-width:112rpx;/, '预约按钮应填满剩余宽度，避免操作之间产生弹性空白');
expect(wxss, /\.wc-status-pill \{[^}]*border:0;/, '作品状态胶囊不应显示边框');
expect(wxss, /\.wc-status-icons \{[^}]*flex-direction:column;[^}]*align-items:flex-start;/, '作品状态胶囊应纵向排列');
expect(wxss, /\.wc-manage \{[^}]*background:transparent;[^}]*border:0;/, '技师管理按钮应使用透明热区');
expect(wxss, /\.wc-manage-icon \{[^}]*width:28rpx;[^}]*height:28rpx;/, '技师管理图标应使用紧凑尺寸');
expect(wxss, /\.wc-price-pill \{[^}]*background:rgba\(38,27,32,\.62\);[^}]*backdrop-filter:blur\(18rpx\) saturate\(135%\);/, '价格胶囊应使用高对比半透明毛玻璃背景');
expect(wxss, /\.wc-price-pill \{[^}]*border:0;/, '价格毛玻璃胶囊不应显示边框');
expect(wxss, /\.wc-price-pill \{[^}]*color:#fff;[^}]*font-weight:800;/, '价格文字应保持高对比亮色');
expect(fs.readFileSync(path.join(root, 'pages/technician/home/index.js'), 'utf8'), /'删除作品'[\s\S]*confirmDeleteWork\(id\)[\s\S]*works\.delete\(id\)/, '首页作品菜单应提供二次确认删除');

const discoverJs = fs.readFileSync(path.join(root, 'pages/client/discover/index.js'), 'utf8');
const discoverWxml = fs.readFileSync(path.join(root, 'pages/client/discover/index.wxml'), 'utf8');
const clientHomeJs = fs.readFileSync(path.join(root, 'pages/client/home/index.js'), 'utf8');
const artistHomeJs = fs.readFileSync(path.join(root, 'pages/client/artist-home/index.js'), 'utf8');
expect(discoverJs, /api\.client\.works\.list[\s\S]*api\.client\.featuredWorks/, '作品页应分别读取绑定美甲师全部作品和精选作品');
expect(discoverJs, /visible\.filter\(function \(work\) \{ return work\.isFeatured; \}\)/, 'Hero 只能使用美甲师设置的精选作品');
expect(discoverJs, /visible\.forEach\(function \(w, i\)/, '普通列表应保留全部作品，不能扣除 Hero 作品');
expect(discoverWxml, /class="hero-work"[\s\S]*class="all-works-head"/, '作品页应提供独立 Hero 与全部作品区域');
expect(clientHomeJs, /api\.client\.featuredWorks\([\s\S]*needAuth: !!this\._clientLoggedIn/, '客户端首页应读取专用精选作品接口，并兼容登录与游客状态');
expect(clientHomeJs, /viewWork\(e\)[\s\S]*\/pages\/client\/work-detail\/index\?id=/, '首页精选作品应进入与列表同口径的客户端作品详情');
if (/api\.public\.works\.list\(\{ page: page, limit: 10 \}\)/.test(clientHomeJs)) {
  throw new Error('客户端首页不应使用通用公开作品流替代精选作品接口');
}
expect(artistHomeJs, /api\.public\.artists\.detail[\s\S]*api\.client\.works\.list\([\s\S]*techId: this\.data\.artistId[\s\S]*needAuth: false/, '美甲师主页应分别读取公开资料和客户端可见作品');
expect(artistHomeJs, /sourceWorks\.some\(\(item\) => item\.isFeatured\)[\s\S]*sourceWorks\.filter\(\(item\) => item\.isFeatured\)/, '美甲师主页应在标准化前保留并筛选精选标记');

const detailWxss = fs.readFileSync(path.join(root, 'pages/client/work-detail/index.wxss'), 'utf8');
expect(detailWxss, /\.container \{[^}]*padding: 0;[^}]*background: var\(--bg-card\);/, '作品详情页应清除全局容器间距和黑色边框');
expect(detailWxss, /\.info-panel \{[^}]*margin-top: -40rpx;[^}]*border-radius: 40rpx 40rpx 0 0;/, '作品详情信息面板应以双侧圆弧覆盖图片');
const publicDetailWxss = fs.readFileSync(path.join(root, 'pages/client/public-work/index.wxss'), 'utf8');
expect(publicDetailWxss, /\.container \{[^}]*padding: 0;[^}]*background: var\(--bg-card\);/, '公开作品详情页也应清除全局容器间距和黑色边框');
expect(publicDetailWxss, /\.info-panel \{[^}]*margin-top: -40rpx;[^}]*border-radius: 40rpx 40rpx 0 0;/, '公开作品详情信息面板应保持相同圆弧过渡');

const technicianDetailWxml = fs.readFileSync(path.join(root, 'pages/technician/work-detail/index.wxml'), 'utf8');
const technicianDetailJs = fs.readFileSync(path.join(root, 'pages/technician/work-detail/index.js'), 'utf8');
const clientDetailWxml = fs.readFileSync(path.join(root, 'pages/client/work-detail/index.wxml'), 'utf8');
const publicDetailWxml = fs.readFileSync(path.join(root, 'pages/client/public-work/index.wxml'), 'utf8');
const publicDetailJs = fs.readFileSync(path.join(root, 'pages/client/public-work/index.js'), 'utf8');
const sharedDetailWxml = fs.readFileSync(path.join(root, 'components/work-detail-view/index.wxml'), 'utf8');
const sharedDetailJs = fs.readFileSync(path.join(root, 'components/work-detail-view/index.js'), 'utf8');
expect(technicianDetailWxml, /<work-detail-view[^>]*isAuthor[^>]*bind:manage="showWorkActions"/, '美甲师作品详情页应以作者权限接入共享管理菜单');
expect(technicianDetailWxml, /showBookSame="\{\{false\}\}"/, '美甲师作品详情页不得展示预约同款操作');
expect(clientDetailWxml, /<work-detail-view[^>]*bind:like="toggleLike"/, '客户端作品详情页应复用共享组件');
expect(publicDetailWxml, /<work-detail-view[^>]*canComment="\{\{false\}\}"/, '公开作品详情页应复用共享组件并关闭登录态评论权限');
expect(publicDetailJs, /api\.client\.works\.detail\(this\.workId, \{ needAuth: false, silent: true \}\)/, '小程序普通作品 ID 详情应与客户端列表使用同一可见性口径');
expect(publicDetailJs, /this\.shareToken[\s\S]*api\.public\.works\.shared\(this\.shareToken\)/, '限时分享令牌仍应使用公开分享接口');
expect(sharedDetailWxml, /class="title-row"[\s\S]*wx:if="\{\{isAuthor\}\}" class="manage-button"[^>]*aria-label="管理作品"[\s\S]*more-horizontal\.svg/, '共享详情组件应在标题右侧仅向作者展示三点管理入口');
expect(sharedDetailWxml, /wx:if="\{\{work\._priceText\}\}" class="work-price-row"[\s\S]*服务原价[\s\S]*优惠[\s\S]*其他/, '共享详情组件必须统一展示综合报价及价格差额');
expect(technicianDetailWxml, /bind:commentmanage="manageComment"/, '美甲师详情页应接入作者评论管理权限');
expect(sharedDetailWxml, /wx:if="\{\{isAuthor\}\}" class="comment-manage"[^>]*catchtap="manageComment"/, '评论管理入口只能向作品作者展示');
expect(technicianDetailJs, /manageComment\(e\)[\s\S]*置顶评论[\s\S]*隐藏评论[\s\S]*删除评论/, '作者评论菜单应支持置顶、隐藏和删除');
expect(technicianDetailJs, /editWork\(\)[\s\S]*\/pages\/technician\/work-edit\/index\?id=\$\{this\.workId\}/, '作品详情编辑入口应携带当前作品 ID');
expect(technicianDetailJs, /showWorkActions\(e\)[\s\S]*隐藏作品[\s\S]*置顶作品[\s\S]*推荐作品[\s\S]*编辑作品[\s\S]*删除作品/, '详情页三点菜单必须与作品卡片管理逻辑一致');
const introIndex = sharedDetailWxml.indexOf('class="intro-section"');
const engagementIndex = sharedDetailWxml.indexOf('class="engagement-section"');
const commentsIndex = sharedDetailWxml.indexOf('class="comments-section"');
const composerIndex = sharedDetailWxml.indexOf('class="composer-section"');
if (!(introIndex < engagementIndex && engagementIndex < commentsIndex && commentsIndex < composerIndex)) {
  throw new Error('作品介绍区顺序必须为标题描述、互动操作、评论、输入框');
}
expect(sharedDetailWxml, /点赞[\s\S]*收藏[\s\S]*分享[\s\S]*wx:if="\{\{showBookSame\}\}"[\s\S]*预约同款/, '共享作品详情应按权限展示预约同款');
expect(sharedDetailWxml, /class="engagement-section" style="display:flex;[^"]*overflow:hidden;"/, '互动操作区必须使用微信兼容的 Flex 等分布局');
const equalActions = sharedDetailWxml.match(/style="flex:1 1 0;width:0;min-width:0;"/g) || [];
if (equalActions.length !== 4) throw new Error('点赞、收藏、分享和预约同款必须严格四等分，不能按内容宽度互相挤压');

console.log('作品卡片角色交互检查通过');
