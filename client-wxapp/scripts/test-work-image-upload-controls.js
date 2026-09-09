const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'pages/technician/work-edit/index.js'), 'utf8');
const wxml = fs.readFileSync(path.join(root, 'pages/technician/work-edit/index.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'pages/technician/work-edit/index.wxss'), 'utf8');

assert(wxml.includes('<button class="cover-picker') && wxml.includes('catchtap="chooseCover"'), '作品封面必须使用明确可点击的按钮');
assert(wxml.includes('<button wx:if="{{images.length < 9}}" class="img-add') && wxml.includes('catchtap="addImage"'), '作品相册添加入口必须使用明确可点击的按钮');
assert(js.includes("typeof wx.chooseMedia === 'function'") && js.includes('wx.chooseImage({'), '作品图片选择必须兼容新旧微信基础库');
assert(js.includes("title:'无法打开图片选择器'") && js.includes("err.message || '封面上传失败'"), '图片选择和封面上传失败必须展示具体反馈');
assert(/\.cover-picker\s*\{[^}]*width:\s*100%[^}]*height:\s*360rpx/.test(wxss), '作品封面按钮必须保留完整触控区域');

console.log('作品封面与相册图片上传控件检查通过');
