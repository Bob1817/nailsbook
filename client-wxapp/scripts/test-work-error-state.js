const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'pages/client/public-work/index.js'), 'utf8');
let page, back = 0, destination, depth = 1, error = { code: 404 };
vm.runInNewContext(source, {
  Page: p => { page = p; }, console: { error() {} },
  getCurrentPages: () => Array(depth).fill({}),
  wx: { navigateBack: () => back++, reLaunch: o => { destination = o.url; } },
  require: name => name.includes('services/api') ? { public: { works: { detail: async () => { throw error; } } } } : {}
});
const instance = { ...page, data: { ...page.data }, setData(patch) { Object.assign(this.data, patch); } };
(async () => {
  assert(Array.isArray(instance.data.work.comments));
  assert(Array.isArray(instance.data.work.imageUrls));
  assert.equal(instance.data.sharePath, '');
  instance.onLoad({});
  assert.equal(instance.data.errorMessage, '分享链接无效');
  instance.workId = 14;
  await instance.loadWork();
  assert.equal(instance.data.canRetry, false);
  assert(instance.data.errorDescription.includes('下架'));
  error = { code: -1 }; await instance.loadWork();
  assert.equal(instance.data.canRetry, true);
  assert(instance.data.errorDescription.includes('网络'));
  instance.goBack(); assert.equal(destination, '/pages/client/discover/index');
  depth = 2; instance.goBack(); assert.equal(back, 1);
  let component, copied = '';
  const componentSource = fs.readFileSync(path.join(root, 'components/work-detail-view/index.js'), 'utf8');
  const componentWxml = fs.readFileSync(path.join(root, 'components/work-detail-view/index.wxml'), 'utf8');
  assert(!componentWxml.includes('重新准备分享'), '分享失败不应显示独立的技术恢复文字');
  assert(componentWxml.includes('bindtap="retryShare"'), '分享按钮应承接分享状态重试');
  assert(componentSource.includes("this.triggerEvent('shareretry')"), '分享按钮应向页面发出重试事件');
  vm.runInNewContext(componentSource, {
    Component: c => { component = c; }, require: () => ({ supportWechat: 'test-support' }),
    wx: { setClipboardData: o => { copied = o.data; o.success(); }, showToast() {} }
  });
  const view = { ...component.methods, data: { ...component.data } };
  view.copySupportWechat(); assert.equal(copied, 'test-support');
  copied = ''; view.data.supportWechat = ''; view.copySupportWechat(); assert.equal(copied, '', '空配置不能复制虚构微信号');
  console.log('作品错误分流、返回兜底、默认属性和运维微信复制检查通过。');
})().catch(e => { console.error(e); process.exitCode = 1; });
