const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const { buildArtistShareTitle, buildWorkShareTitle } = require('../utils/share-copy');

assert.equal(buildArtistShareTitle({ name: '贝贝' }), '贝贝｜一对一私人美甲·作品与预约');
assert.equal(
  buildArtistShareTitle({ name: '贝贝', specialtiesText: '法式·延长' }, '贝贝'),
  '贝贝｜法式·延长美甲·作品与预约'
);
assert.equal(
  buildWorkShareTitle({ title: '美甲作品欣赏 1', technician: { name: '贝贝' } }),
  '美甲作品欣赏 1｜贝贝美甲·预约同款'
);

const publicWork = read('pages/client/public-work/index.js');
assert(!publicWork.includes('分享作品需先登录'), '公开作品页不应在加载前强制登录');
assert(publicWork.includes('source=work_share'), '公开作品应保留分享来源');
assert(publicWork.includes('/pages/client/artist-home/index?id='), '游客应可继续查看美甲师主页');
assert(publicWork.includes('onShareTimeline()'), '公开作品应支持朋友圈分享');
assert(publicWork.includes("invite=' + encodeURIComponent(this.inviteCode)"), '作品分享应携带所属美甲师邀请码');
assert(publicWork.includes("this.entrySource = options.source || 'work_share'"), '公开作品应保存原始分享来源');
assert(publicWork.includes("source=' + encodeURIComponent(this.entrySource || 'work_share')"), '作品继续分享时应保留原始来源');
assert(publicWork.indexOf('bindSharedWork(Number(work.id)') < publicWork.indexOf("'/pages/client/create-order/index?workId='"), '预约同款应先绑定再进入预约页');
assert(publicWork.includes('this.inviteCode = artist.invitationCode || workInviteCode'), '公开作品应以作品所属美甲师的服务端邀请码覆盖外部参数');
assert(publicWork.indexOf('this.inviteCode = artist.invitationCode || workInviteCode') < publicWork.indexOf("wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })"), '公开作品应在确认归属邀请码后再开放分享');

const artistHome = read('pages/client/artist-home/index.js');
const artistHomeWxml = read('pages/client/artist-home/index.wxml');
assert(artistHome.includes('onShareTimeline()'), '美甲师主页应支持朋友圈分享');
assert(artistHome.includes("'/pages/client/works/index?techId=' + this.data.artistId + invite + '&source=' + encodeURIComponent(source) + '&mode=gallery'"), '主页进入全部作品时应保留邀请码和来源，并使用纯画册模式');
assert(artistHomeWxml.includes("artist.acceptingBookings === false ? '暂未接单'"), '暂停接单时主页预约按钮应明确显示状态');
assert(artistHome.includes('quickBookingTechId: this.data.artistId'), '主页预约登录应保留自动绑定目标');
assert(artistHome.indexOf('bindQuickBooking(Number(this.data.artistId)') < artistHome.indexOf("'/pages/client/create-order/index?techId='"), '主页预约应先绑定再进入预约页');
assert(artistHome.includes("this.inviteCode = artist.invitationCode || ''"), '主页应以服务端返回的邀请码为准');
assert(artistHome.indexOf("this.inviteCode = artist.invitationCode || ''") < artistHome.indexOf("wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })"), '主页应在确认归属邀请码后再开放分享');

const createOrder = read('pages/client/create-order/index.js');
const submitBlock = createOrder.slice(createOrder.indexOf('doSubmit: async function'), createOrder.indexOf('var payload =', createOrder.indexOf('doSubmit: async function')));
assert(!submitBlock.includes('bindSharedWork('), '提交预约时不应再补做作品绑定');
assert(!submitBlock.includes('bindQuickBooking('), '提交预约时不应再补做主页邀请绑定');

const app = read('app.js');
assert(app.includes("options.path === 'pages/client/artist-home/index'"), '登录用户从分享打开美甲师主页时不应被送回首页');
assert(app.includes("options.path === 'pages/client/works/index'"), '登录用户从分享打开美甲师作品集时不应被送回首页');
assert(app.includes('isWorkTimelineEntry'), '朋友圈作品入口在内部详情页转换为公开页前不应被启动逻辑送回首页');

const api = read('services/api.js');
[
  'works: (id, params) => api.get(`${P}/brands/${id}/works`, params, { needAuth: false })',
  'detail: (id) => api.get(`${P}/works/${id}`, null, { needAuth: false })',
  'shared: (token) => api.get(`${P}/works/shared/${token}`, null, { needAuth: false })'
].forEach((snippet) => assert(api.includes(snippet), `${snippet} 必须允许匿名读取`));

const works = read('pages/client/works/index.js');
const worksWxml = read('pages/client/works/index.wxml');
assert(works.includes('api.public.brands.works(self.data.targetTechId'), '美甲师公开作品列表不得依赖客户登录接口');
assert(works.includes("galleryOnly: options.mode === 'gallery'"), '作品页应识别纯画册模式');
assert(works.includes('bindQuickBooking(Number(artist.id), artist.invitationCode)'), '公开作品列表预约应直接完成客户关联');
assert(works.includes('buildClientLoginUrl(target'), '作品集预约登录应使用统一登录恢复链路');
assert(works.includes('quickBookingTechId: artist.id'), '作品集预约登录应保存自动绑定的美甲师');
assert(works.includes("self.inviteCode = artist.invitationCode || ''"), '作品集应以服务端返回的邀请码为准');
assert(!works.includes('绑定申请已提交'), '公开分享获客不应再提示等待美甲师审批');
assert(worksWxml.includes("artist.acceptingBookings === false ? '暂未接单'"), '公开作品列表在暂停接单时应禁用预约入口');
assert(worksWxml.includes('businessPage && artist && !galleryOnly'), '纯画册模式不应重复展示美甲师业务资料');
assert(worksWxml.includes('show-artist="{{!galleryOnly}}"'), '纯画册模式的作品卡片不应重复展示美甲师信息');
assert(works.includes("query: 'techId=' + encodeURIComponent(artist.id)"), '作品画册朋友圈入口应恢复当前美甲师作品页');

const technicianWorks = read('pages/technician/works/index.js');
assert(technicianWorks.includes("text: '可公开分享'"), '作品管理应明确显示可公开分享状态');
assert(technicianWorks.includes("work.assetStatus !== 'public'"), '作品管理应校验素材公开状态');
assert(technicianWorks.includes("work.publicAuthorizationStatus !== 'authorized'"), '作品管理应校验公开授权状态');

const technicianWorkDetail = read('pages/technician/work-detail/index.js');
assert(technicianWorkDetail.includes("+ '&invite=' + encodeURIComponent(inviteCode)"), '美甲师从作品详情分享时应携带邀请码');
assert(technicianWorkDetail.includes('api.public.artists.detail(String(technicianId))'), '美甲师作品分享应从作品归属美甲师公开资料核对邀请码');
assert(technicianWorkDetail.includes('onShareTimeline()'), '美甲师作品详情应支持朋友圈分享');
assert(technicianWorkDetail.includes("wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })"), '作品详情应开启好友和朋友圈分享');
assert(technicianWorkDetail.includes("wx.redirectTo({ url: '/pages/client/public-work/index?'"), '美甲师作品朋友圈入口应转换到匿名公开作品页');

const clientWorkDetail = read('pages/client/work-detail/index.js');
assert(clientWorkDetail.includes('resolveInviteCode: async function'), '登录态作品详情应解析作品所属美甲师邀请码');
assert(clientWorkDetail.includes("'&invite=' + encodeURIComponent(inviteCode) + '&source=work_share&channel=wechat_share'"), '登录态作品分享路径应携带邀请码和来源');
assert(clientWorkDetail.includes('onShareTimeline: function'), '登录态作品详情应支持朋友圈分享');
assert(clientWorkDetail.includes("'&invite=' + encodeURIComponent(inviteCode) + '&source=work_detail'"), '登录态预约同款应携带邀请码');
assert(clientWorkDetail.includes("wx.redirectTo({ url: '/pages/client/public-work/index?'"), '客户端作品朋友圈入口应转换到匿名公开作品页');

const technicianProfile = read('pages/technician/profile/index.js');
assert(technicianProfile.includes('source=artist_share&invite=${encodeURIComponent(code)}'), '美甲师端转发公开主页时应携带本人的邀请码');

assert(createOrder.includes("this.inviteCode = artist.invitationCode || ''"), '游客预约页应以预约目标美甲师的服务端邀请码为准');

console.log('公开分享浏览与分享标题检查通过');
