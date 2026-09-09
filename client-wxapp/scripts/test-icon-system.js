const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const semantic = JSON.parse(read('../design-system/nailbook/miniprogram-semantics.json'));
assert(read('static/icons/check-circle.svg').includes(`fill="${semantic.success}"`), '已选择标记必须使用绿色');
const palette = JSON.parse(read('../design-system/nailbook/colors.json'));
for (const [name, color] of [['social-heart-active', semantic.like], ['social-star-active', semantic.favorite]]) {
  const svg = read(`static/icons/${name}.svg`);
  assert(svg.includes(`fill="${color}"`), `${name} 必须使用对应语义色实心填充`);
  assert(!/fill="none"/.test(svg), `${name} 选中态不得退回空心`);
  const inactive = read(`static/icons/${name.replace('-active', '')}.svg`);
  assert(inactive.includes('fill="none"'), `${name} 未选中态必须保持空心`);
  assert.notStrictEqual(color, palette.muted, '选中态不能使用灰色');
}

const workDetail = read('pages/client/work-detail/index.wxml');
const publicWork = read('pages/client/public-work/index.wxml');
const sharedWorkDetail = read('components/work-detail-view/index.wxml');
const artistHome = read('pages/client/artist-home/index.wxml');
const clientOrder = read('pages/client/order-detail/index.wxml');
const clientHome = read('pages/client/home/index.wxml');
const technicianOrder = read('pages/technician/order-detail/index.wxml');
const technicianHome = read('pages/technician/home/index.wxml');
const technicianBookingCard = read('components/technician-booking-card/index.wxml');
assert(read('pages/client/orders/index.wxml').includes('class="footer-clock" src="/static/icons/clock.svg"'), '预约卡片底部必须使用完整时钟SVG');
assert(!read('pages/client/orders/index.wxss').includes('.footer-clock::'), '不得用边框和伪元素拼接时钟');
for (const tab of ['home', 'calendar', 'compass', 'chat', 'profile', 'customers']) {
  const svg = read(`static/icons/tab-${tab}-active.svg`);
  assert(svg.slice(0, svg.indexOf('>')).includes(`fill="${semantic.textLink}"`), `${tab}选中图标必须为实心蓝色`);
  assert(read(`static/icons/tab-${tab}.svg`).includes('fill="none"'), `${tab}未选中图标必须保持线框`);
}
const sourceFiles = [];
const collect = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (/\.(wxml|wxss)$/.test(entry.name)) sourceFiles.push(full);
  }
};
collect(path.join(root, 'pages'));
collect(path.join(root, 'components'));

for (const content of [sharedWorkDetail]) {
  assert(!content.includes('data:image/svg+xml'), '作品详情页不应内嵌独立 SVG 图标');
  assert(content.includes('/static/icons/social-heart.svg'), '点赞必须使用统一爱心图标');
  assert(content.includes('/static/icons/social-star.svg'), '收藏必须使用统一星标图标');
  assert(content.includes('/static/icons/share.svg'), '分享必须使用统一分享图标');
}

assert(artistHome.includes("social-heart-active.svg' : '/static/icons/social-heart.svg"), '美甲师主页点赞语义必须是爱心');
assert(artistHome.includes("social-star-active.svg' : '/static/icons/social-star.svg"), '美甲师主页收藏语义必须是星标');
for (const file of ['components/work-card/index.wxml', 'components/work-detail-view/index.wxml', 'pages/client/artist-home/index.wxml']) {
  const content = read(file);
  for (const icon of ['heart', 'star']) {
    assert(content.includes(`social-${icon}-active.svg' : '/static/icons/social-${icon}.svg`), `${file} 必须根据状态切换${icon}图标`);
  }
}
assert(clientOrder.includes('/static/icons/phone.svg'), '客户端预约详情必须使用统一电话图标');
assert(clientOrder.includes('/static/icons/tab-chat-active.svg'), '客户端预约详情必须使用统一消息图标');
assert(clientHome.includes('/static/icons/phone-white.svg'), '客户端首页电话操作必须使用统一电话图标');
assert(clientHome.includes('/static/icons/tab-chat.svg'), '客户端首页消息操作必须使用统一消息图标');
assert(technicianOrder.includes('/static/icons/phone.svg'), '美甲师端预约详情必须使用统一电话图标');
assert(technicianHome.includes('technician-booking-card'), '美甲师首页预约信息必须使用统一预约卡片');
assert(technicianBookingCard.includes('/static/icons/phone-active.svg'), '美甲师预约卡片联系客户必须使用统一电话图标');
assert(technicianBookingCard.includes('/static/icons/navigation.svg'), '美甲师预约卡片开始导航必须使用统一导航图标');

for (const icon of ['social-heart.svg', 'social-heart-active.svg', 'social-star.svg', 'social-star-active.svg', 'share.svg', 'phone.svg', 'phone-white.svg', 'tab-chat.svg', 'tab-chat-active.svg']) {
  assert(fs.existsSync(path.join(root, 'static/icons', icon)), `缺少统一图标资源：${icon}`);
}

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  assert(!content.includes('data:image/svg'), `功能图标必须引用 static/icons，禁止内嵌 SVG：${path.relative(root, file)}`);
  if (file.endsWith('.wxss')) {
    assert(!/url\(["']?\/static\/icons\/[^)]*\.svg/.test(content), `微信小程序本地 SVG 必须通过 image 标签加载：${path.relative(root, file)}`);
  }
}

const migratedCss = [
  'pages/client/profile/index.wxss',
  'pages/client/home/index.wxss',
  'pages/client/order-detail/index.wxss',
  'pages/client/design-detail/index.wxss',
  'pages/client/address-edit/index.wxss',
  'pages/client/chat-detail/index.wxss',
  'pages/client/orders/index.wxss',
  'pages/technician/profile/index.wxss',
].map(read).join('\n');
for (const legacySelector of ['.btn-icon-phone::', '.btn-icon-chat::', '.m-icon-heart::', '.tech-menu-icon-info::', '.menu-icon-image::', '.menu-icon-booking::', '.action-icon-edit::', '.action-icon-delete::']) {
  assert(!migratedCss.includes(legacySelector), `禁止继续使用 CSS 拼接功能图标：${legacySelector}`);
}

console.log('图标系统专项检查通过');

// 消息通知：实心按钮由容器统一提供白色前景，链接只用于浅色卡片内导航。
const semanticActions = read('styles/semantic-actions.wxss');
assert(/\.semantic-primary \{[^}]*color: #FFFFFF !important/.test(semanticActions));
for (const role of ['client', 'technician']) {
  const chat = read(`pages/${role}/chat/index.wxml`);
  assert(!chat.includes('modal-btn-primary-text semantic-link'));
  for (const button of chat.matchAll(/class="([^"\n]*modal-btn-primary[^"\n]*)"/g)) {
    if (!button[1].includes('modal-btn-primary-text')) assert(button[1].includes('semantic-primary'));
  }
}
assert(read('pages/client/design-detail/index.wxml').includes('btn-view-order full semantic-primary'));
const chatStyles = read('pages/client/chat/index.wxss');
const statusDot = chatStyles.match(/\.msg-online-dot \{([^}]+)\}/)[1];
assert(statusDot.includes('width: 14rpx'));
assert(statusDot.includes('border: 0'));
assert(statusDot.includes('box-shadow: none'));
assert(read('pages/client/chat-detail/index.wxml').includes('/static/icons/booking-calendar.svg'));
assert(!read('pages/client/chat-detail/index.wxss').includes('.card-calendar-icon::'));
assert(fs.existsSync(path.join(root, 'static/icons/booking-calendar.svg')));
console.log('通知按钮白字、状态圆点和预约卡片图标检查通过');
