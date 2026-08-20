const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'pages/technician/homepage-settings/index.js'), 'utf8');
const wxml = fs.readFileSync(path.join(root, 'pages/technician/homepage-settings/index.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'pages/technician/homepage-settings/index.wxss'), 'utf8');

[
  'enableAlertBeforeUnload', 'saveSection', 'validatePublish', 'compressImage',
  'onProgress', 'retryUpload', 'dirtySections',
].forEach((token) => {
  if (!js.includes(token)) throw new Error(`homepage settings missing: ${token}`);
});

['basic', 'environment', 'professional', 'rules', 'faq', 'share'].forEach((section) => {
  if (!wxml.includes(`data-section="${section}"`)) throw new Error(`missing section save: ${section}`);
});

if (!/\.section-save\{[^}]*min-height:88rpx/.test(wxss)) throw new Error('section save touch target must be at least 44px');
if (!/\.small-action\{[^}]*min-height:88rpx/.test(wxss)) throw new Error('small action touch target must be at least 44px');
if (!/\.input,.picker\{[^}]*min-height:88rpx/.test(wxss)) throw new Error('input touch target must be at least 44px');

console.log('Homepage settings mobile checks passed.');
