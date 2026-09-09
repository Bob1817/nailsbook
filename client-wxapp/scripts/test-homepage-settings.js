const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'pages/technician/homepage-settings/index.js'), 'utf8');
const wxml = fs.readFileSync(path.join(root, 'pages/technician/homepage-settings/index.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'pages/technician/homepage-settings/index.wxss'), 'utf8');

['chooseHero', 'chooseAvatar', 'toggleSpecialty', 'toggleHomepageWork', 'toggleReview', 'save'].forEach((token) => {
  if (!js.includes(token)) throw new Error(`homepage settings missing: ${token}`);
});

['basic', 'environment', 'professional', 'rules', 'faq', 'share'].forEach((section) => {
  if (!wxml.includes(`data-section="${section}"`)) throw new Error(`missing section save: ${section}`);
});

if (!/\.save\s*\{[^}]*min-height:96rpx/.test(wxss)) throw new Error('save touch target must be at least 44px');
if (!/\.preview-link,\.small-action\s*\{[^}]*min-height:88rpx/.test(wxss)) throw new Error('small action touch target must be at least 44px');
if (!/\.input,\.picker\s*\{[^}]*min-height:88rpx/.test(wxss)) throw new Error('input touch target must be at least 44px');
if (!wxml.includes('<button class="hero-editor {{heroUploading') || !wxml.includes('catchtap="chooseHero"')) throw new Error('hero image picker must use an explicit tappable button');
if (!js.includes("typeof wx.chooseMedia === 'function'") || !js.includes('wx.chooseImage({')) throw new Error('hero image picker must support both current and legacy WeChat runtimes');
if (!js.includes('heroUploading:true') || !js.includes('heroUploading:false')) throw new Error('hero image upload must expose and clear its busy state');
if (!js.includes("title:'无法打开图片选择器'")) throw new Error('hero image picker failures must provide visible feedback');

console.log('Homepage settings mobile checks passed.');
