const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const template = read('pages/client/my-technicians/index.wxml');
const service = read('services/api.js');
const calls = { find: [], bind: [], cancel: [] };
let lookupResult = null;
let page;
const api = {
  client: { profile: {
    findTechByInviteCode: async code => { calls.find.push(code); return lookupResult; },
    bindTechnician: async (...args) => { calls.bind.push(args); return { status: 'pending', bindingId: 9 }; },
    cancelBindingApplication: async id => { calls.cancel.push(id); return { success: true }; }
  } },
  auth: { getUserInfo: async () => ({ technicians: [], pendingTechnicians: [] }) }
};
const shared = require('../utils/client-bindings');
const wx = { showLoading() {}, hideLoading() {}, showToast() {}, setStorageSync() {}, getStorageSync: () => [] };
vm.runInNewContext(read('pages/client/my-technicians/index.js'), { Page: value => { page = value; }, require: name => name.includes('api') ? api : name.includes('client-bindings') ? shared : {}, wx, console });
page.setData = update => Object.assign(page.data, update);
page.loadProfile = async () => {};

(async () => {
  await page.onInviteCodeInput({ detail: { value: 'AB!12' } });
  assert.match(page.data.inviteError, /无效邀请码/);
  assert.equal(calls.find.length, 0, '非法字符不得发起查询');

  await page.onInviteCodeInput({ detail: { value: 'ABC1234' } });
  assert.equal(calls.find.length, 0, '不足8位不得发起查询');

  lookupResult = { id: 3, name: '贝贝', invitationCode: 'OTHER888' };
  await page.onInviteCodeInput({ detail: { value: 'abc12345' } });
  assert.deepEqual(calls.find, ['ABC12345']);
  assert.equal(page.data.foundTech, null, '返回邀请码不匹配时不得展示美甲师');
  assert.match(page.data.inviteError, /无效邀请码/);

  lookupResult = { id: 3, name: '贝贝', invitationCode: 'ABC12345', city: '杭州市' };
  await page.onInviteCodeInput({ detail: { value: 'ABC12345EXTRA' } });
  assert.equal(page.data.inviteCode, 'ABC12345', '邀请码必须截断为固定8位');
  assert.equal(page.data.foundTech.id, 3);

  page.data.technicians = [];
  await page.bindTechnician();
  assert.equal(calls.bind.length, 1);
  assert.equal(page.data.technicians[0].bindingStatus, 'pending');

  await page.cancelBindingApplication({ currentTarget: { dataset: { id: 3 } } });
  assert.deepEqual(calls.cancel, [3]);
  assert.equal(page.data.technicians.length, 0);

  assert(template.includes('maxlength="{{8}}"'));
  assert(template.includes('error="{{inviteError}}"'));
  assert(template.includes("item.bindingStatus === 'pending'"));
  assert(template.includes('bindtap="cancelBindingApplication"'));
  assert(template.includes('取消申请</button>'));
  assert(template.includes('查看主页</button>'));
  assert(service.includes("find-by-invite-code`, { code }"), '查询参数必须与后端 code 契约一致');
  console.log('邀请码固定长度、格式校验、有效性核对、待确认卡片及取消申请检查通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
