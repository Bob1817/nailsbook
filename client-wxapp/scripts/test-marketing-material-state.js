const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let definition, resolvePreview, previews = 0, exportCalls = 0, failList = false;
const api = { technician: { marketingMaterials: {
  list: async () => { if (failList) throw new Error('offline'); return { list: [] }; },
  preview: () => { previews++; return new Promise(resolve => { resolvePreview = resolve; }); },
  export: async () => { exportCalls++; throw new Error('offline'); }
} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/marketing-materials/index.js'), 'utf8'), {
  Page: value => { definition = value; }, require: () => api,
  wx: { showToast() {}, env: { USER_DATA_PATH: '/mock' }, getFileSystemManager: () => ({ writeFileSync() {} }) }
});
function page() {
  return { ...definition, data: { ...definition.data, title: '原草稿', editingId: 1 },
    setData(v) { Object.assign(this.data, v); }, saveDraft: async () => ({ id: 1 }) };
}
(async () => {
  const p = page();
  const pending = p.previewMaterial();
  await Promise.resolve();
  await p.previewMaterial(); await p.exportMaterial(); p.newMaterial();
  assert.equal(previews, 1); assert.equal(exportCalls, 0);
  assert.equal(p.data.editingId, 1);
  resolvePreview({ imageBase64: 'mock' }); await pending;
  assert.equal(p.data.previewing, false);
  assert(p.data.previewUrl);
  p.onTitleInput({ detail: { value: '修改标题' } });
  assert.equal(p.data.previewUrl, '', '修改内容后不显示旧预览');
  await p.exportMaterial();
  assert.equal(p.data.exporting, false, '导出失败释放状态');
  p.saveDraft = async () => null;
  await p.previewMaterial(); await p.exportMaterial();
  assert.equal(p.data.previewing, false); assert.equal(p.data.exporting, false);
  failList = true; await p.loadMaterials();
  assert.equal(p.data.loadFailed, true);
  failList = false; await p.loadMaterials();
  assert.equal(p.data.loadFailed, false);
  console.log('营销素材：操作互斥、旧预览失效、失败恢复及列表重试通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
