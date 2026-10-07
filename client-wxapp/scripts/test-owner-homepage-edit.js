const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const profile = fs.readFileSync(path.join(root, 'pages/technician/profile/index.js'), 'utf8');
const homeJs = fs.readFileSync(path.join(root, 'pages/client/artist-home/index.js'), 'utf8');
const homeWxml = fs.readFileSync(path.join(root, 'pages/client/artist-home/index.wxml'), 'utf8');
const editorWxml = fs.readFileSync(path.join(root, 'pages/technician/homepage-settings/index.wxml'), 'utf8');
const editorWxss = fs.readFileSync(path.join(root, 'pages/technician/homepage-settings/index.wxss'), 'utf8');

assert(profile.includes("&preview=1&owner=1"), '经营工具中的我的主页必须先进入本人预览');
assert(homeJs.includes("options.owner === '1'"), '公开主页必须识别本人预览');
assert(homeJs.includes("editHomepage()"), '本人预览必须提供编辑主页行为');
assert(homeWxml.includes('wx:if="{{isOwner}}" class="btn-edit-homepage'), '本人底部操作必须替换为编辑主页');
assert(homeWxml.includes('wx:if="{{!isOwner}}" class="btn-book-now'), '本人预览不得展示顶部预约按钮');
assert(editorWxml.includes('<nav-bar title="编辑主页"'), '配置页标题必须明确为编辑主页');
['主页形象', '公开资料', '擅长风格', '个人介绍', '服务项目与价格', '主页精选作品'].forEach((title) => assert(editorWxml.includes(title), `编辑页缺少${title}模块`));
assert(editorWxml.includes('均为选填') && editorWxml.includes('未填写的内容不会展示'), '编辑页必须明确主页资料为选填');
assert(homeWxml.includes('wx:if="{{timeline.length || qualifications.length}}"'), '空的荣誉与成长模块不得展示');
assert(homeWxml.includes('wx:if="{{reviews.length}}"'), '空的客户评价模块不得展示');
assert(homeWxml.includes('wx:if="{{works.length}}"'), '空的精选作品模块不得展示');
assert.match(editorWxss, /\.save\s*\{[^}]*min-height:\s*96rpx/s, '保存按钮必须满足移动端触控尺寸');

console.log('Owner homepage preview and editor hierarchy checks passed.');
