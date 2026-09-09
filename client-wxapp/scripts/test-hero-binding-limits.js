const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const { bindingSummary, normalizeBindings } = require('../utils/client-bindings');
const summary = bindingSummary(normalizeBindings([
  ...Array.from({length: 5}, (_, i) => ({ id: i + 1, name: '美甲师' + i, isDefault: i === 0, boundAt: '2026-09-0' + (i + 1) })),
  {id: 9, name: '待审核', bindingStatus: 'pending'}
]));
assert.equal(summary.activeCount, 5);
assert.equal(summary.pendingCount, 1);
assert.deepEqual(summary.previewTechnicians.map(w => w.id), [1,5]);
assert.equal(bindingSummary([]).previewTechnicians.length, 0);

let page, fail = false, writes = 0, saved = [1,2,3];
const works = [1,2,3,4].map(id => ({ id, title: '作品' + id, coverUrl: '/test.jpg', isVisible: true, visibilityScope: 'public', publicationStatus: 'approved' }));
const wx = { showToast() {}, showModal: options => options.success({confirm:true}), navigateTo() {} };
const api = { technician: { works: {
  list: async () => [...works, {id:5, isVisible:true, publicationStatus:'pending', coverUrl:'/pending.jpg'}],
  heroRecommendations: async () => ({works:saved.map(id => works.find(w => w.id === id))}),
  saveHeroRecommendations: async (ids, expected) => {
    writes++;
    assert.deepEqual(Array.from(expected), saved);
    await new Promise(resolve => setTimeout(resolve, 10));
    if (fail) throw new Error('保存失败');
    saved = Array.from(ids); return {works:saved.map(id => works.find(w => w.id === id))};
  }
} } };
vm.runInNewContext(fs.readFileSync(path.join(root, 'pages/technician/hero-recommendations/index.js'), 'utf8'), { Page: value => { page = value; }, require: () => api, wx });
page.setData = data => Object.assign(page.data, data);
(async () => {
  page.onLoad({workId:'4'}); await page.load();
  assert.equal(page.data.selected.length, 3);
  assert.equal(page.data.choosing, true, '满额时应直接要求选择被替换作品');
  assert.equal(page.data.directReplace, true);
  assert.deepEqual(Array.from(page.data.candidates, w => w.id), [1,2,3]);
  page.selectWork({ currentTarget: { dataset: {id:2} } });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.deepEqual(Array.from(page.data.selected,w => w.id), [1,4,3], '选择现有推荐后直接替换目标作品');
  saved = [1,2]; page.data.selected = works.filter(w => saved.includes(w.id)); writes = 0;
  page.onLoad({workId:'4'}); await page.load();
  assert.deepEqual(Array.from(page.data.selected,w => w.id), [1,2,4], '推荐未满时应直接添加，不再二次选择');
  assert.equal(page.data.choosing, false);
  saved = [1,2,3]; page.data.selected = works.filter(w => saved.includes(w.id));
  page.setData({targetId:4});
  page.choose({ currentTarget: { dataset: {index:1} } });
  assert.deepEqual(Array.from(page.data.candidates, w => w.id), [4]);
  fail = true; await page.save([1,4,3]);
  assert.deepEqual(Array.from(page.data.selected,w => w.id), [1,2,3], '失败保留原推荐');
  fail = false;
  const before = writes;
  await Promise.all([page.save([1,4,3]), page.save([1,4,3])]);
  assert.equal(writes, before + 1, '重复点击只提交一次');
  assert.deepEqual(Array.from(page.data.selected,w => w.id), [1,4,3]);
  saved = [1,2,3]; page.data.selected = works.filter(w => saved.includes(w.id));
  page.onLoad({removeWorkId:'2'}); await page.load();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.deepEqual(Array.from(page.data.selected,w => w.id), [1,3], '操作菜单应能直接取消客户首页推荐');
  const afterCancel = writes;
  page.move({currentTarget:{dataset:{index:0,direction:-1}}});
  assert.equal(writes, afterCancel, '首项不能上移');
  const home = fs.readFileSync(path.join(root,'pages/client/home/index.wxml'),'utf8');
  assert(home.includes('autoplay="{{recentWorks.length > 1}}"'));
  assert(home.includes('美甲师暂未设置首页推荐'));
  console.log('Hero满额显式替换、失败保留、重复点击与2位预览/待审计数通过');
})().catch(error => { console.error(error); process.exitCode=1; });
