const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let definition;
const uploads = [];
let fail = true;
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../pages/technician/work-edit/index.js'), 'utf8'), {
  Page: p => { definition = p; },
  require: () => ({ upload: { image: async path => {
    uploads.push(path);
    if (path === 'second' && fail) throw new Error('offline');
    return { url: 'https://images/' + path, width: 600, height: 800 };
  } } }),
  wx: {}
});
(async () => {
  const p = { ...definition, data: { ...definition.data }, setData(patch) { Object.assign(this.data, patch); } };
  await p.uploadPhotos([{ path: 'first' }, { path: 'second' }, { path: 'third' }]);
  assert.equal(p.data.coverUrl, 'https://images/first');
  assert.equal(p.data.images[0], 'https://images/third');
  assert.equal(p.data.failedPhotoCount, 1);
  assert.equal(p.data.photoCount, 2);
  fail = false;
  await p.uploadPhotos(p._failedPhotos.slice());
  assert.equal(p.data.photoCount, 3);
  assert.equal(p.data.failedPhotoCount, 0);
  assert.deepEqual(uploads, ['first', 'second', 'third', 'second']);
  console.log('批量上传部分失败保留成功照片、仅重试失败照片测试通过');
})().catch(e => { console.error(e); process.exitCode = 1; });
