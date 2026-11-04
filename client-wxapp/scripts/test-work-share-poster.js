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
const posterSource = fs.readFileSync(file, 'utf8');
const profileSource = fs.readFileSync(path.join(__dirname, '../pages/technician/profile-settings/index.js'), 'utf8');
const profileTemplate = fs.readFileSync(path.join(__dirname, '../pages/technician/profile-settings/index.wxml'), 'utf8');
assert(posterSource.includes("'/static/onlynail-wordmark.jpg'"), '海报必须使用项目品牌标识');
assert(/if \(socialMedia\.wechatQrCodeUrl\)/.test(posterSource), '个人微信二维码必须按配置条件展示');
assert(profileSource.includes('chooseWechatQrCode') && profileTemplate.includes('个人微信二维码'), '个人资料必须提供微信二维码配置入口');
let component, codeFails = false, saveFails = false, saves = 0;
const drawCalls = [];
const labels = [];
const events = [];
let clipboardData = '';
const wx = {
  env: { USER_DATA_PATH: '/test' },
  getImageInfo: async ({ src }) => {
    if (src.includes('wordmark')) return { path: '/brand-logo', width: 900, height: 320 };
    if (src.includes('wechat-qr')) return { path: '/wechat-qr', width: 800, height: 800 };
    return { path: '/photo', width: 600, height: 800 };
  },
  getFileSystemManager: () => ({ writeFile: o => o.success(), unlink() {} }),
  createCanvasContext: () => ({ setFillStyle() {}, fillRect() {}, setFontSize() {},
    drawImage(...args) { drawCalls.push(args); }, measureText: text => ({ width: text.length * 20 }),
    fillText: text => labels.push(text), draw: (_, done) => done() }),
  canvasToTempFilePath: o => o.success({ tempFilePath: '/poster' }),
  saveImageToPhotosAlbum: async () => { if (saveFails) throw new Error('相册拒绝'); saves++; },
  showToast() {},
  setClipboardData: async ({ data }) => { clipboardData = data; },
  showLoading() {},
  hideLoading() {}
};
const api = { public: { works: {
  detail: async () => ({ id: 7, title: '作品', coverUrl: '/cover', technician: { id: 7, name: '美甲师', socialMedia: { wechatQrCodeUrl: '/wechat-qr' } }, shops: [{ name: '工作室' }] }),
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
  assert.equal(drawCalls.length, 4, '必须包含品牌标识、作品、小程序码与已配置的个人微信二维码');
  assert(drawCalls.some(args => args[0] === '/brand-logo'), '海报必须绘制项目品牌标识');
  assert(drawCalls.some(args => args[0] === '/wechat-qr'), '配置个人微信二维码时必须绘制');
  const photoDraw = drawCalls.find(args => args.length === 9);
  assert(photoDraw, '作品图必须使用源区域裁切，不能直接拉伸到固定尺寸');
  assert.equal(photoDraw[5], 40);
  assert.equal(photoDraw[6], 76);
  assert.equal(photoDraw[7], 520);
  assert.equal(photoDraw[8], 420);
  assert(Math.abs((photoDraw[3] / photoDraw[4]) - (520 / 420)) < 0.0001, '源裁切区域与海报图片区域必须保持相同比例');
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

  // 测试朋友圈文案复制
  instance.data.busy = false;
  await instance.copyCaption();
  assert(clipboardData.includes('美甲师') && clipboardData.includes('作品'), '朋友圈文案应包含作品与美甲师');

  // 测试小红书种草文案复制
  await instance.copyXhsNote();
  assert(clipboardData.includes('#美甲') && clipboardData.includes('美甲师'), '小红书文案应包含美甲灵感标签与美甲师');
  assert(events.some(e => e.channel === 'xiaohongshu' && e.eventType === 'work_share_intent'), '记录小红书分享意向事件');

  // 测试小红书原图保存
  const initialSaves = saves;
  saveFails = false;
  await instance.saveWorkImages();
  assert(saves > initialSaves, '原图应保存到相册');
  assert(events.some(e => e.channel === 'xiaohongshu_export_images'), '记录小红书原图导出事件');

  console.log('分享scene解码、海报信息、生成失败、防重提交及小红书分发助手测试通过');
})().catch(err => { console.error(err); process.exitCode = 1; });
