const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const wxml = fs.readFileSync(path.join(root, 'pages/client/artist-home/index.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'pages/client/artist-home/index.wxss'), 'utf8');

if (wxml.includes('class="safe-area-bottom"')) {
  throw new Error('美甲师主页底栏不应追加独立安全区占位');
}

const bottomBarRule = wxss.match(/\.bottom-bar-inner\s*\{([^}]*)\}/s);
if (!bottomBarRule) throw new Error('缺少美甲师主页底栏布局');
if (/transform:\s*translateY/.test(bottomBarRule[1])) {
  throw new Error('底栏按钮不应向视口外强制位移');
}
if (!/max\(12rpx,\s*calc\(env\(safe-area-inset-bottom,\s*0px\)\s*-\s*20rpx\)\)/.test(bottomBarRule[1])) {
  throw new Error('底栏必须使用有最小值的跨平台安全区内边距');
}

console.log('Artist home safe-area checks passed.');
