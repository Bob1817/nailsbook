const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const guidance = require('../utils/shop-guidance');

(async () => {
  let definition, choose, failLoad = true, writes = 0;
  const shop = { name: '门店', detailAddress: '地址', guidance: { enabled: true, metro: { blocks: [{ id: 'text', type: 'text', text: '原有指引' }] } } };
  const api = {
    technician: { auth: {
      async getUserInfo() { if (failLoad) throw new Error('网络失败'); return { shopAddresses: [shop] }; },
      async updateServiceType() { writes++; throw new Error('保存失败'); }
    } },
    upload: { async image() { throw new Error('上传失败'); } }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/shop-guidance-edit/index.js'), 'utf8'), {
    Page: value => { definition = value; },
    require: name => name.endsWith('/api') ? api : name.endsWith('/shop-guidance') ? guidance : {},
    wx: { showLoading() {}, hideLoading() {}, showToast() {}, chooseMedia(options) { choose = options; } }
  });
  const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(values) {
    for (const [key, value] of Object.entries(values)) {
      const parts = key.split('.');
      if (parts.length === 2) this.data[parts[0]][parts[1]] = value;
      else this.data[key] = value;
    }
  } };
  Object.assign(page.data, { shopName: '门店', shopAddress: '地址' });
  await page.loadGuidance();
  await page.save();
  assert.equal(writes, 0, '加载失败不可覆盖服务端内容');
  assert.equal(page.data.loaded, false);
  assert.equal(page.data.loading, false);
  failLoad = false;
  await page.loadGuidance();
  assert.equal(page.data.activeBlocks[0].text, '原有指引');
  page.addImageBlock();
  assert.equal(page.data.uploading, true);
  await page.save();
  page.switchTab({ currentTarget: { dataset: { idx: 1 } } });
  assert.equal(writes, 0);
  assert.equal(page.data.activeMode, 'metro');
  await choose.success({ tempFiles: [{ tempFilePath: 'image' }] });
  assert.equal(page.data.uploading, false);
  assert.equal(page.data.activeBlocks[0].text, '原有指引');
  await page.save();
  assert.equal(writes, 1);
  assert.equal(page.data.saving, false);
  assert.equal(page.data.activeBlocks[0].text, '原有指引');
  console.log('到店指引加载失败禁存、重试恢复、上传互斥及保存失败内容保留通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
