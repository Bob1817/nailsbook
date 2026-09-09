const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
async function check(role) {
  let definition, record = null, blockers = [], posts = [], fail = false;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'pages/account-deletion/index.js'), 'utf8'), {
    Page: value => { definition = value; },
    getApp: () => ({ globalData: { role } }),
    wx: { getStorageSync: () => role, showToast() {}, showModal: async () => ({ confirm: true }), reLaunch() {} },
    require: () => ({
      get: async url => { assert.equal(url, '/api/' + role + '/account-deletion'); if (fail) throw Error('加载失败'); return { request: record, blockers }; },
      post: async (url, data) => { posts.push({ url, data }); record = { id: 3, status: url.endsWith('/cancel') ? 'cancelled' : 'pending', reason: data?.reason }; }
    })
  });
  const page = { ...definition, data: { ...definition.data }, setData(value) { Object.assign(this.data, value); } };
  page.onLoad(); await page.load();
  page.onReason({ detail: { value: '不再使用' } });
  await page.submit(); assert.equal(posts.length, 0, '未确认不得提交');
  page.onConfirm({ detail: { value: ['confirmed'] } });
  blockers = ['还有未结束预约']; await page.load(); await page.submit(); assert.equal(posts.length, 0, '阻塞时不得提交');
  blockers = []; await page.load(); await page.submit();
  assert.equal(posts.length, 1); assert.equal(posts[0].data.confirmed, true); assert.equal(page.data.record.status, 'pending');
  assert.equal(posts[0].data.accountId, undefined, '不能由页面指定他人账号');
  await page.cancel(); assert.equal(page.data.record.status, 'cancelled');
  fail = true; await page.load(); page.data.confirmed = true; page.data.reason = '再申请'; await page.submit();
  assert.equal(posts.length, 2, '加载失败时不得提交');
}
(async () => { await check('client'); await check('technician'); console.log('账号注销双身份入口、确认、阻塞、提交撤回和失败保护检查通过。'); })().catch(e => { console.error(e); process.exitCode = 1; });
