const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'pages/technician/homepage-settings/index.js'), 'utf8');
const wxml = fs.readFileSync(path.join(root, 'pages/technician/homepage-settings/index.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'pages/technician/homepage-settings/index.wxss'), 'utf8');

['chooseHero', 'chooseAvatar', 'toggleSpecialty', 'toggleHomepageService', 'toggleHomepageWork', 'toggleReview', 'applyRuleTemplate', 'save'].forEach((token) => {
  if (!js.includes(token)) throw new Error(`homepage settings missing: ${token}`);
});

['basic', 'environment', 'professional', 'rules', 'faq', 'share'].forEach((section) => {
  if (!wxml.includes(`data-section="${section}"`)) throw new Error(`missing section save: ${section}`);
});

if (!/\.save\s*\{[^}]*min-height:\s*96rpx/.test(wxss)) throw new Error('save touch target must be at least 44px');
if (!/\.preview-link,\s*\.small-action\s*\{[^}]*min-height:\s*88rpx/.test(wxss)) throw new Error('small action touch target must be at least 44px');
if (!/\.input,\s*\.picker\s*\{[^}]*min-height:\s*88rpx/.test(wxss)) throw new Error('input touch target must be at least 44px');
if (!wxml.includes('<button class="hero-editor {{heroUploading') || !wxml.includes('catchtap="chooseHero"')) throw new Error('hero image picker must use an explicit tappable button');
if (!js.includes("typeof wx.chooseMedia === 'function'") || !js.includes('wx.chooseImage({')) throw new Error('hero image picker must support both current and legacy WeChat runtimes');
if (!js.includes('heroUploading:true') || !js.includes('heroUploading:false')) throw new Error('hero image upload must expose and clear its busy state');
if (!js.includes("title:'无法打开图片选择器'")) throw new Error('hero image picker failures must provide visible feedback');
if (js.includes("title:'公开主页前还需完善'")) throw new Error('homepage fields must remain optional when publishing');
if (js.includes('environmentPhotos:this.data.environmentPhotos')) throw new Error('shop environment photos must not be submitted by homepage settings');
if (!js.includes('heroImageUrl:this.data.heroImageUrl || undefined')) throw new Error('empty optional image URLs must not be submitted');
if (!wxml.includes('选择主页展示内容') || !wxml.includes('此处只选择，不重复编辑')) throw new Error('referenced homepage content must be presented as selection-only');
if (!js.includes('api.technician.services.list()') || !js.includes('featuredServiceIds:this.data.featuredServiceIds')) throw new Error('homepage service selection must load and persist managed services');
if (!js.includes('const RULE_TEMPLATE = Object.freeze({')) throw new Error('service rules must provide an editable standard template');
if (!js.includes("ruleValues[field] = brand[field] || (!brand.id ? RULE_TEMPLATE[field] : '')")) throw new Error('first homepage edit must preload the standard rules template');
if (!js.includes("if (!String(this.data[field] || '').trim()) updates[field]=RULE_TEMPLATE[field]")) throw new Error('template refill must preserve existing rule content');
if (!wxml.includes('首次编辑已带入推荐模板') || !wxml.includes('只会补全空白项目')) throw new Error('rule template behavior must be explained in the editor');

console.log('Homepage settings mobile checks passed.');
