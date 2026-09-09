const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const wxmlFiles = walk(path.join(root, 'pages')).filter((file) => file.endsWith('.wxml'));
const nativeSwitches = wxmlFiles.filter((file) => /<switch\b/.test(fs.readFileSync(file, 'utf8')));
assert.deepEqual(nativeSwitches, [], '客户端和美甲师端不得继续使用尺寸不可控的原生 switch');

const componentWxml = fs.readFileSync(path.join(root, 'components/nb-switch/index.wxml'), 'utf8');
const componentJs = fs.readFileSync(path.join(root, 'components/nb-switch/index.js'), 'utf8');
const componentWxss = fs.readFileSync(path.join(root, 'components/nb-switch/index.wxss'), 'utf8');
const appJson = fs.readFileSync(path.join(root, 'app.json'), 'utf8');
assert(componentWxml.includes('role="switch"') && componentWxml.includes('aria-checked'), '统一开关必须保留开关语义');
assert(componentJs.includes("this.triggerEvent('change', { value: !this.data.checked })"), '统一开关必须保持原生 change detail.value 协议');
assert(componentJs.includes('virtualHost: true'), '统一开关必须使用虚拟宿主，避免宿主节点撑满父级并把开关推出页面');
assert(componentWxss.includes('justify-content:flex-end'), '统一开关轨道必须在触控区内右对齐');
assert(componentWxss.includes('width:72rpx; height:40rpx;'), '轨道必须与接受新预约开关一致');
assert(componentWxss.includes('width:32rpx; height:32rpx;'), '滑块必须与接受新预约开关一致');
assert(componentWxss.includes('background:var(--nb-secondary)') && componentWxss.includes('background:var(--nb-success)'), '关闭与开启颜色必须统一');
assert(appJson.includes('"nb-switch": "/components/nb-switch/index"'), '统一开关必须全局注册');
console.log('Client and technician switch size, color and event consistency checks passed.');
