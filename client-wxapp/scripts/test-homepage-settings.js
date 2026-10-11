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
if (!js.includes("ruleValues[field] = brand[field] || (!hasSavedRules ? RULE_TEMPLATE[field] : '')")) throw new Error('an entirely blank rules group must preload the standard template');
if (!js.includes("if (!String(this.data[field] || '').trim()) updates[field]=RULE_TEMPLATE[field]")) throw new Error('template refill must preserve existing rule content');
if (!wxml.includes('首次编辑已带入推荐模板') || !wxml.includes('只会补全空白项目')) throw new Error('rule template behavior must be explained in the editor');
if (!js.includes('const homepageDefaultsPending = brand.featuredServiceIds == null')) throw new Error('unconfigured homepages must be distinguishable from intentionally saved selections');
if (!js.includes('serviceItems.slice(0, 6).map((item) => item.id)')) throw new Error('the first six managed services must be selected by default');
if (!js.includes('const featuredShop = savedShop || defaultShop || null')) throw new Error('an available managed shop must be selected by default');
if (!js.includes('homepageDefaultsPending && !hasFeaturedWorks && index < 6')) throw new Error('the first six public works must be selected by default');
if (!js.includes('pendingDefaultWorks.map((work)=>api.technician.works.toggleFeatured(work.id))')) throw new Error('default work selections must be persisted when the homepage is saved');
if (!wxml.includes('已为你生成默认展示') || !wxml.includes('保存主页后生效')) throw new Error('automatic defaults must be explained before saving');
if (!/\.hero-editor\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;[^}]*min-width:\s*100%;/.test(wxss)) throw new Error('hero picker must fill the card width');
if (!wxml.includes('建议比例 2:1') || !wxml.includes('hero-image-footer')) throw new Error('hero picker must explain its landscape crop and replacement state');
if (!wxml.includes('class="input form-input" type="number"') || !wxml.includes('bindinput="onExperienceInput"') || !wxml.includes('placeholder="填写 1–30 年，未填写则不展示"')) throw new Error('experience must reuse the standard optional numeric input');
if (wxml.includes('experience-help') || wxml.includes('experience-suffix')) throw new Error('experience guidance must appear only in the input placeholder');
if (wxml.includes('<slider') || wxml.includes('mode="selector" range="{{experienceOptions}}"') || wxml.includes('experience-sheet') || js.includes('openExperiencePicker')) throw new Error('experience must not use a slider, picker, or custom selection sheet');
if (!js.includes("const value=digits ? Math.max(1,Math.min(30,Number(digits))) : ''")) throw new Error('experience input must accept only 1 to 30 years and support an empty hidden state');
if (!js.includes('experienceYears:Number(this.data.experienceYears) > 0 ? Math.min(30, Math.round(Number(this.data.experienceYears))) : 0')) throw new Error('saving hidden experience must explicitly clear the previous value');
if (wxml.includes('class="selected-styles"') || wxml.includes('selected-style-remove')) throw new Error('specialties must not duplicate selected items in a separate list');
if (!wxml.includes('class="skill-chip-order">{{selectedSpecialtyMap[item]}}') || !js.includes('map[item]=index+1')) throw new Error('selected specialty chips must show their homepage display order');
if (!/\.skill-list\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/.test(wxss)) throw new Error('specialty choices must use a compact three-column grid');
if (!/\.skill-chip\s*\{[^}]*min-height:\s*44px/.test(wxss)) throw new Error('compact specialty choices must retain 44px touch targets');
if (js.includes("wx.showToast({ title:'主页已更新'")) throw new Error('successful homepage saves must navigate to the effective homepage instead of stopping at a toast');
if (!js.includes("previousPage.route === 'pages/client/artist-home/index'") || !js.includes('previousPage._reloadOnShow=true') || !js.includes("wx.redirectTo({url:'/pages/client/artist-home/index?id='")) throw new Error('successful homepage saves must close the editor and open a refreshed owner homepage');

console.log('Homepage settings mobile checks passed.');
