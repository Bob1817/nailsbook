const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '../..');

console.log('--- 开始执行 P3 专项测试：微信号防骚扰保护与提审静默模式 ---');

// 1. 验证后端 miniprogram-launch-mode.ts 中的 isMiniProgramAuditMode
const launchModePath = path.join(ROOT, 'backend/src/common/miniprogram-launch-mode.ts');
const launchModeContent = fs.readFileSync(launchModePath, 'utf8');
assert(launchModeContent.includes('export function isMiniProgramAuditMode()'), 'miniprogram-launch-mode.ts 必须导出 isMiniProgramAuditMode 函数');
assert(launchModeContent.includes('MINIPROGRAM_AUDIT_MODE'), 'isMiniProgramAuditMode 必须读取 MINIPROGRAM_AUDIT_MODE 环境变量');
console.log('✓ 1. 后端 miniprogram-launch-mode.ts 提审模式函数验证通过');

// 2. 验证后端 public-artist.controller.ts 与 technician-auth.service.ts
const publicArtistPath = path.join(ROOT, 'backend/src/technician-works/public-artist.controller.ts');
const publicArtistContent = fs.readFileSync(publicArtistPath, 'utf8');
assert(publicArtistContent.includes('isMiniProgramAuditMode'), 'public-artist.controller.ts 必须引入并使用 isMiniProgramAuditMode');
assert(publicArtistContent.includes('protectWechat'), 'public-artist.controller.ts 必须返回 protectWechat');
assert(publicArtistContent.includes('homeService: auditMode ? false : technician.homeService'), '提审模式下公开主页必须静默收起 homeService');

const techAuthPath = path.join(ROOT, 'backend/src/technician-auth/technician-auth.service.ts');
const techAuthContent = fs.readFileSync(techAuthPath, 'utf8');
assert(techAuthContent.includes('typeof value === \'boolean\''), 'technician-auth.service.ts 的 updateProfile 必须支持 boolean 类型的社交配置 (protectWechat)');
assert(techAuthContent.includes('auditMode: isMiniProgramAuditMode()'), 'technician-auth.service.ts 的 getProfile 必须下发 auditMode');
console.log('✓ 2. 后端公开名片与美甲师主数据防骚扰与提审模式验证通过');

// 3. 验证美甲师个人设置页面 (pages/technician/profile-settings)
const profileWxml = fs.readFileSync(path.join(ROOT, 'client-wxapp/pages/technician/profile-settings/index.wxml'), 'utf8');
const profileJs = fs.readFileSync(path.join(ROOT, 'client-wxapp/pages/technician/profile-settings/index.js'), 'utf8');
const profileWxss = fs.readFileSync(path.join(ROOT, 'client-wxapp/pages/technician/profile-settings/index.wxss'), 'utf8');

assert(profileWxml.includes('微信号防骚扰保护'), 'profile-settings/index.wxml 必须包含微信号防骚扰保护文案');
assert(profileWxml.includes('开启后仅已登录客户可查看完整微信号，避免游客骚扰'), 'profile-settings/index.wxml 必须展示防骚扰说明提示');
assert(profileWxml.includes('bindchange="onProtectWechatChange"'), 'profile-settings/index.wxml 必须绑定防骚扰切换事件');

assert(profileJs.includes('protectWechat: false'), 'profile-settings/index.js 必须在 data 中初始化 protectWechat');
assert(profileJs.includes('onProtectWechatChange(e)'), 'profile-settings/index.js 必须定义 onProtectWechatChange 处理函数');
assert(profileJs.includes('protectWechat: !!protectWechat'), 'profile-settings/index.js saveProfile 必须保存 protectWechat');
assert(profileWxss.includes('.switch-field'), 'profile-settings/index.wxss 必须定义 .switch-field 样式');
assert(profileWxss.includes('min-height:88rpx') || profileWxss.includes('min-height: 88rpx'), 'profile-settings 触控区域必须满足 >= 44px (88rpx)');
console.log('✓ 3. 美甲师个人设置防骚扰开关与保存闭环验证通过');

// 4. 验证客户访问美甲师主页 (pages/client/artist-home)
const artistHomeWxml = fs.readFileSync(path.join(ROOT, 'client-wxapp/pages/client/artist-home/index.wxml'), 'utf8');
const artistHomeJs = fs.readFileSync(path.join(ROOT, 'client-wxapp/pages/client/artist-home/index.js'), 'utf8');
const artistHomeWxss = fs.readFileSync(path.join(ROOT, 'client-wxapp/pages/client/artist-home/index.wxss'), 'utf8');

assert(artistHomeJs.includes("'******已开启隐私保护'"), 'artist-home/index.js 必须在未登录且开启防骚扰时对微信号进行脱敏');
assert(artistHomeJs.includes('loginToViewWechat()'), 'artist-home/index.js 必须支持引导登录查看微信号');
assert(artistHomeJs.includes('refreshLoginState()'), 'artist-home/index.js onShow 必须刷新登录状态以即时解密微信号');
assert(artistHomeWxml.includes('artist.protectWechat && !isClientLoggedIn'), 'artist-home/index.wxml 必须根据登录态和保护开关区分微信号展示');
assert(artistHomeWxml.includes('catchtap="loginToViewWechat"'), 'artist-home/index.wxml 未登录受保护状态必须提供登录查看按钮');
assert(artistHomeWxss.includes('.nb-wechat-val.is-masked'), 'artist-home/index.wxss 必须包含脱敏微信号的样式规则');
console.log('✓ 4. 美甲师主页联系弹窗微信号脱敏与登录解密验证通过');

// 5. 验证客户访问公开作品详情 (pages/client/public-work)
const publicWorkWxml = fs.readFileSync(path.join(ROOT, 'client-wxapp/pages/client/public-work/index.wxml'), 'utf8');
const publicWorkJs = fs.readFileSync(path.join(ROOT, 'client-wxapp/pages/client/public-work/index.js'), 'utf8');
assert(publicWorkJs.includes("'******已开启隐私保护'"), 'public-work/index.js 必须保持相同的微信号脱敏保护口径');
assert(publicWorkWxml.includes('visitorInfo.protectWechat && !isLoggedIn'), 'public-work/index.wxml 必须支持防骚扰微信号受控脱敏');
console.log('✓ 5. 公开作品分享落地页微信号脱敏与保护口径验证通过');

// 6. 验证提审静默保护机制对下单页与快捷报价的联动
const createOrderJs = fs.readFileSync(path.join(ROOT, 'client-wxapp/pages/client/create-order/index.js'), 'utf8');
assert(createOrderJs.includes('var isAudit = Boolean(tech.auditMode || this.data.auditMode)'), 'create-order/index.js 必须感知 auditMode');
assert(createOrderJs.includes('if (tech.homeService && !isAudit)'), '提审模式下 create-order 必须静默收起上门服务选项');

const quickQuoteJs = fs.readFileSync(path.join(ROOT, 'client-wxapp/pages/technician/quick-quote/index.js'), 'utf8');
assert(quickQuoteJs.includes('const isAuditMode = Boolean(userInfo && userInfo.auditMode)'), 'quick-quote/index.js 必须识别 auditMode');
assert(quickQuoteJs.includes('const homeOn = Boolean(userInfo && userInfo.homeService) && !isAuditMode'), '提审模式下 quick-quote 必须静默禁用上门美甲单轨');

const homeSettingsWxml = fs.readFileSync(path.join(ROOT, 'client-wxapp/pages/technician/home-service-settings/index.wxml'), 'utf8');
assert(homeSettingsWxml.includes('wx:if="{{auditMode}}"'), 'home-service-settings 页面在审核模式下必须展示合规提示');
console.log('✓ 6. 提审静默保护机制在下单页、报价单和上门配置页的联动验证通过');

console.log('--- 全部 P3 专项测试 100% 验证通过！ ---');
