const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { parseWorkScene } = require('../utils/work-share-scene');
const token = 'ab'.repeat(24);
const pagesRoot = path.join(__dirname, '../pages/client');
assert(!fs.readFileSync(path.join(pagesRoot, 'home/index.wxml'), 'utf8').includes('asset-section'), '首页不再堆叠旧记录和修图入口');
assert(fs.readFileSync(path.join(pagesRoot, 'profile/index.wxml'), 'utf8').includes('navigateToArchive'), '历史记录仍可从我的访问');
let legacyPage, legacyDestination;
vm.runInNewContext(fs.readFileSync(path.join(pagesRoot, 'ai-photo/index.js'), 'utf8'), {
  Page: page => { legacyPage = page; }, wx: { redirectTo: ({ url }) => { legacyDestination = url; } }
});
legacyPage.onLoad({ source: 'https://private.example/photo.jpg' });
assert.equal(legacyDestination, '/pages/client/beauty-archive/index', '旧照片URL不能转成公开分享授权');
assert.deepEqual(parseWorkScene(Buffer.from(token, 'hex').toString('base64url')), { shareToken: token });
assert.deepEqual(parseWorkScene('w123'), { id: '123' });
for (const invalid of ['', '%', 'w0', 'w-1', 'source=http://private']) assert.equal(parseWorkScene(invalid), null);

const file = path.join(__dirname, '../components/work-share-poster/index.js');
let component, codeFails = false, saveFails = false, saves = 0, draws = 0;
const labels = [];
const events = [];
const wx = {
  env: { USER_DATA_PATH: '/test' },
  getImageInfo: async () => ({ path: '/photo', width: 600, height: 800 }),
  getFileSystemManager: () => ({ writeFile: o => o.success(), unlink() {} }),
  createCanvasContext: () => ({ setFillStyle() {}, fillRect() {}, setFontSize() {},
    drawImage() { draws++; }, measureText: text => ({ width: text.length * 20 }),
    fillText: text => labels.push(text), draw: (_, done) => done() }),
  canvasToTempFilePath: o => o.success({ tempFilePath: '/poster' }),
  saveImageToPhotosAlbum: async () => { if (saveFails) throw new Error('相册拒绝'); saves++; }, showToast() {}
};
const api = { public: { works: {
  detail: async () => ({ id: 7, title: '作品', coverUrl: '/cover', technician: { id: 7, name: '美甲师' }, shops: [{ name: '工作室' }] }),
  shareCode: async id => { assert.equal(id, 7); if (codeFails) throw new Error('码失败'); return { imageBase64: 'image' }; }
} } };
vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
  Component: c => { component = c; }, wx, require: name => name.includes('services/api') ? api : name.includes('conversion-tracking') ? { trackConversion: event => events.push(event) } : createRequire(file)(name), console
});
const instance = { ...component.methods, properties: { sharePath: '/pages/client/public-work/index?id=7' },
  data: { busy: false, shareToken: '' }, setData(d) { Object.assign(this.data, d); } };
(async () => {
  await instance.savePoster();
  assert.equal(saves, 1);
  assert.equal(draws, 2, '必须包含作品与小程序码');
  assert(labels.includes('美甲师') && labels.includes('工作室'));
  codeFails = true;
  await instance.savePoster();
  assert.equal(saves, 1, '小程序码失败不能保存无效海报');
  assert.equal(events.length, 2, '分别记录生成和保存成功');
  assert.equal(events[0].eventType, 'poster_generated');
  assert.equal(events[1].eventType, 'poster_saved');
  assert.equal(instance.data.busy, false);
  codeFails = false;
  saveFails = true;
  await instance.savePoster();
  assert.equal(saves, 1, '相册拒绝不视为保存成功');
  assert.equal(events.length, 3);
  assert.equal(events[2].eventType, 'poster_generated', '相册拒绝仍保留实际生成事件');
  assert.equal(instance.data.busy, false, '保存失败后允许重试');
  instance.data.busy = true;
  await instance.savePoster();
  assert.equal(saves, 1, '防止重复生成');
  console.log('分享scene解码、海报信息、生成失败及重复提交测试通过');
})().catch(err => { console.error(err); process.exitCode = 1; });
