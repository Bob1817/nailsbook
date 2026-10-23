const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const flush = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  const sharedWxml = fs.readFileSync(path.join(__dirname, '../components/work-detail-view/index.wxml'), 'utf8');
  const sharedWxss = fs.readFileSync(path.join(__dirname, '../components/work-detail-view/index.wxss'), 'utf8');
  assert.match(sharedWxml, /wx:for="\{\{item\.replies\}\}"/, '共用作品详情必须渲染评论回复');
  assert.match(sharedWxml, /\{\{reply\.content\}\}/, '回复内容必须显示');
  assert.match(sharedWxml, /\{\{reply\.createdAtText\}\}/, '回复时间必须显示');
  assert.match(sharedWxss, /\.comment-replies\s*\{/, '回复列表必须有独立布局');
  for (const role of ['client', 'technician']) {
    const pageSource = fs.readFileSync(path.join(__dirname, '../pages', role, 'work-detail/index.js'), 'utf8');
    assert.match(pageSource, /replies:\s*\(c\.replies \|\| \[\]\)\.map\(processComment\)/, role + ' 必须保留接口返回的回复树');
    let page, resolveRequest, rejectRequest, calls = 0;
    const works = { addComment: () => { calls++; return new Promise((resolve, reject) => { resolveRequest = resolve; rejectRequest = reject; }); } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages', role, 'work-detail/index.js'), 'utf8'), {
      Page: value => { page = value; }, require: () => ({ client: { works }, technician: { works } }), wx: { showToast() {} }
    });
    const p = { ...page, workId: 1, data: { commentText: '第一条', replyingTo: null }, setData(v) { Object.assign(this.data, v); }, loadComments: async () => {}, loadWork() {} };
    p.submitComment(); p.submitComment();
    assert.equal(calls, 1, role + ' 重复提交必须拦截');
    p.data.commentText = '下一条'; resolveRequest({}); await flush();
    assert.equal(p.data.commentText, '下一条');
    assert.equal(p.data.submittingComment, false);
    p.submitComment(); rejectRequest(new Error('offline')); await flush();
    assert.equal(p.data.commentText, '下一条');
    assert.equal(p.data.submittingComment, false);
    p.submitComment(); resolveRequest({}); await flush();
    assert.equal(p.data.commentText, '');
  }
  console.log('两端作品评论：重复提交、新输入保留、失败重试和成功清理通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
