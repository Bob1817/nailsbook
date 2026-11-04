const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'components/state-card');
const js = fs.readFileSync(path.join(dir, 'index.js'), 'utf8');
const wxml = fs.readFileSync(path.join(dir, 'index.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(dir, 'index.wxss'), 'utf8');

// 1. 结构与样式规范检查
assert.match(wxml, /class="state-card/, '必须包含 state-card 主容器');
assert.match(wxml, /class="[^"]*state-btn[^"]*booking-action/, '操作按钮必须接入 booking-action 统一规范');
assert.match(wxss, /@import ['"]\.\.\/\.\.\/styles\/booking-actions\.wxss['"];/, '必须引入统一按钮样式');
assert.match(wxss, /\.state-btn\s*\{[^}]*min-height:\s*44px;/, '操作按钮必须满足 44px 最小触控高度');
assert(!/(^|[},]\s*)(button|view|text|image)(?=[\s.:#\[])/m.test(wxss), '禁止标签名选择器');

// 2. 组件逻辑与状态推断检查
let componentDef;
vm.runInNewContext(js, {
  Component: (def) => { componentDef = def; },
  console
});

function createInstance(props = {}) {
  const instance = {
    properties: {
      type: 'empty',
      icon: '',
      title: '',
      description: '',
      actionText: '',
      actionVariant: 'primary',
      secondaryActionText: '',
      compact: false,
      fullHeight: false,
      ...props
    },
    data: {},
    events: [],
    setData(d) { Object.assign(this.data, d); },
    triggerEvent(name, detail) { this.events.push({ name, detail }); },
    ...componentDef.methods
  };

  const observer = componentDef.observers['type, icon, title, description, actionText'];
  observer.call(instance,
    instance.properties.type,
    instance.properties.icon,
    instance.properties.title,
    instance.properties.description,
    instance.properties.actionText
  );

  return instance;
}

// 错误态默认推断
const errorInst = createInstance({ type: 'error' });
assert.equal(errorInst.data.displayTitle, '加载失败');
assert.equal(errorInst.data.displayDescription, '请检查网络连接后重试');
assert.equal(errorInst.data.resolvedIcon, '/static/icons/info.svg');
assert.equal(errorInst.data.displayActionText, '重新加载');

errorInst.onAction();
assert(errorInst.events.some(e => e.name === 'action'), '触发 action 事件');
assert(errorInst.events.some(e => e.name === 'retry'), '错误态必须额外抛出 retry 事件');

// 搜索无果默认推断
const searchInst = createInstance({ type: 'search-empty' });
assert.equal(searchInst.data.displayTitle, '没有找到相关内容');
assert.equal(searchInst.data.displayDescription, '换个关键词或筛选条件试试');
assert.equal(searchInst.data.resolvedIcon, '/static/icons/search.svg');

// 离线弱网默认推断
const offlineInst = createInstance({ type: 'offline' });
assert.equal(offlineInst.data.displayTitle, '网络连接异常');
assert.equal(offlineInst.data.resolvedIcon, '/static/icons/unlink.svg');
assert.equal(offlineInst.data.displayActionText, '重新连接');

// 自定义空状态保持
const customInst = createInstance({
  type: 'empty',
  title: '暂无收藏作品',
  description: '去发现喜欢的美甲作品吧',
  icon: '/static/icons/bookmark.svg',
  actionText: '去发现',
  secondaryActionText: '返回'
});
assert.equal(customInst.data.displayTitle, '暂无收藏作品');
assert.equal(customInst.data.displayDescription, '去发现喜欢的美甲作品吧');
assert.equal(customInst.data.resolvedIcon, '/static/icons/bookmark.svg');
assert.equal(customInst.data.displayActionText, '去发现');

customInst.onSecondaryAction();
assert(customInst.events.some(e => e.name === 'secondaryaction'), '次级按钮触发 secondaryaction');

console.log('通用状态卡片 (state-card) 规格、推断与事件检查通过');
