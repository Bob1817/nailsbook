const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const componentsRoot = path.join(root, 'components');
const registry = JSON.parse(fs.readFileSync(path.join(componentsRoot, 'component-registry.json'), 'utf8')).components;
const dirs = fs.readdirSync(componentsRoot)
  .filter((name) => fs.statSync(path.join(componentsRoot, name)).isDirectory())
  .sort();

assert.deepStrictEqual(dirs, Object.keys(registry).sort(), '组件目录必须完整登记在 component-registry.json');

for (const name of dirs) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name), name + ': 组件目录必须使用 kebab-case');
  const dir = path.join(componentsRoot, name);
  for (const ext of ['js', 'json', 'wxml', 'wxss']) {
    assert(fs.existsSync(path.join(dir, 'index.' + ext)), name + ': 缺少 index.' + ext);
  }
  const config = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  assert.strictEqual(config.component, true, name + ': index.json 必须声明 component: true');
}

for (const name of ['action-button', 'form-field', 'filter-trigger', 'nb-switch']) {
  assert.strictEqual(registry[name].layer, 'foundation', name + ': 必须登记为 foundation');
  const css = fs.readFileSync(path.join(componentsRoot, name, 'index.wxss'), 'utf8');
  assert(!/(^|[},]\s*)#[\w-]+\s*[{,]/m.test(css), name + ': 禁止 ID 选择器');
  assert(!/(^|[},]\s*)(button|view|text|input|image|textarea)(?=[\s.:#\[])/m.test(css), name + ': 禁止标签名选择器');
  assert(!/\[[^\]]+\]\s*\{/.test(css), name + ': 禁止属性选择器');
}

const buttonCss = fs.readFileSync(path.join(componentsRoot, 'action-button/index.wxss'), 'utf8');
assert(buttonCss.includes('min-height: var(--btn-height)'), 'action-button: 必须使用统一按钮高度');
for (const variant of ['primary', 'secondary', 'text', 'danger']) {
  assert(buttonCss.includes('.action-button-' + variant), 'action-button: 缺少 ' + variant + ' 状态');
}

const fieldCss = fs.readFileSync(path.join(componentsRoot, 'form-field/index.wxss'), 'utf8');
assert(fieldCss.includes('min-height: var(--input-height)'), 'form-field: 必须使用统一输入框高度');
assert(fieldCss.includes('border-radius: var(--input-radius)'), 'form-field: 必须使用统一输入框圆角');
assert(fieldCss.includes('.form-field-icon'), 'form-field: 必须支持统一的输入类型图标');
assert(fieldCss.includes('font-size: var(--font-sm)'), 'form-field: 占位提示必须使用次级字号');
for (const state of ['is-focused', 'is-disabled', 'has-error']) {
  assert(fieldCss.includes(state), 'form-field: 缺少 ' + state + ' 状态');
}

const filterCss = fs.readFileSync(path.join(componentsRoot, 'filter-trigger/index.wxss'), 'utf8');
const switchCss = fs.readFileSync(path.join(componentsRoot, 'nb-switch/index.wxss'), 'utf8');
const tabCss = fs.readFileSync(path.join(componentsRoot, 'tab-bar/index.wxss'), 'utf8');
const tokensCss = fs.readFileSync(path.join(root, 'styles/tokens.wxss'), 'utf8');
assert(filterCss.includes('min-height: var(--touch-min)'), 'filter-trigger: 触控高度必须至少 44px');
assert(switchCss.includes('min-height:88rpx'), 'nb-switch: 触控高度必须至少 44px');
assert(/\.tab-item\s*\{[^}]*min-height:\s*104rpx/s.test(tabCss), 'tab-bar: 菜单项必须提供不少于 44px 的触控区域');
for (const token of ['--control-visual-height: 64rpx', '--control-hit-height: 44px', '--input-height: 88rpx']) {
  assert(tokensCss.includes(token), '尺寸令牌缺失：' + token);
}

console.log('通用组件规范检查通过：' + dirs.length + ' 个组件已登记，4 个基础组件通过结构、状态和触控检查。');
