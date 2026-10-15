const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'utils/wechat-subscription.js'), 'utf8');
const pageSource = fs.readFileSync(path.join(root, 'pages/client/orders/index.js'), 'utf8');
const templates = {
  bookingStatus: 'valid-status',
  bookingEvent: 'invalid-old-event',
  dayBefore: 'day',
  hourBefore: 'hour',
  consultationReply: 'consultation'
};

function setup(subscriptionSource = source) {
  const requests = [];
  const records = [];
  const notices = [];
  const warnings = [];
  const storage = { wechat_subscription_rotation_client: 1 };
  let reply;
  let recordError;
  let page;
  const service = {
    status: async () => ({ status: 'needs_top_up', templates }),
    record: async (decisions) => {
      if (recordError) throw recordError;
      records.push(decisions);
    }
  };
  const api = { client: { wechatSubscriptions: service } };
  const wx = {
    getStorageSync: key => storage[key],
    setStorageSync: (key, value) => { storage[key] = value; },
    requestSubscribeMessage: options => { requests.push(Array.from(options.tmplIds)); reply = options; },
    showToast: options => notices.push(options),
    showModal: options => notices.push(options)
  };
  const module = { exports: {} };
  vm.runInNewContext(subscriptionSource, {
    module, wx, getApp: () => ({ globalData: {} }),
    console: { warn: (...args) => warnings.push(args) },
    require: name => name === '../config' ? {} : api
  });
  vm.runInNewContext(pageSource, {
    Page: value => { page = value; }, wx,
    require: name => name.includes('services/api') ? api : module.exports
  });
  page.data = { ...page.data, reminderStatus: { status: 'needs_top_up', templates } };
  page.setData = values => Object.assign(page.data, values);
  return {
    page, requests, records, notices, warnings, storage, helper: module.exports,
    fail: error => reply.fail(error),
    succeed: decision => reply.success({ 'valid-status': decision }),
    setRecordError: error => { recordError = error; }
  };
}

(async () => {
  // The legacy API has no templateStatuses and rotation points at the invalid old template.
  // The page must still synchronously request the valid booking-status template only.
  const s = setup(process.env.SUBSCRIPTION_SOURCE
    ? fs.readFileSync(process.env.SUBSCRIPTION_SOURCE, 'utf8') : source);
  const pending = s.page.enableBookingReminders();
  assert.deepEqual(s.requests, [['valid-status']], '预约页不得因旧模板轮换或聊天模板阻断授权');
  await s.page.enableBookingReminders();
  assert.equal(s.requests.length, 1, '重复点击不得重复申请');
  s.succeed('accept');
  await pending;
  assert.equal(s.records.length, 1);
  assert.equal(s.records[0]['valid-status'], 'accept');
  assert.equal(s.storage.wechat_subscription_rotation_client, 1, '定向授权不能改变其他入口的轮换位置');
  assert.match(s.notices.at(-1).title, /一条/);
  assert.equal(s.page.data.reminderRequesting, false);

  for (const [errCode, state, text] of [
    [20001, 'configuration_error', '配置异常'],
    [20004, 'settings_disabled', '接收订阅消息'],
    [10003, 'error', '连接微信']
  ]) {
    const t = setup();
    const request = t.page.enableBookingReminders();
    t.fail({ errCode, errMsg: `requestSubscribeMessage:fail ${errCode}` });
    await request;
    assert.equal(t.records.length, 0, '微信接口失败不能写入拒绝或成功授权');
    assert.equal(t.page.data.reminderRequesting, false);
    assert.match(JSON.stringify(t.notices.at(-1)), new RegExp(text));
    const failure = t.warnings[0][1];
    assert.equal(failure.errCode, errCode);
    assert.equal(t.helper.getBookingReminderResultState(failure), state);
  }

  for (const decision of ['reject', 'ban']) {
    const t = setup();
    const request = t.page.enableBookingReminders();
    t.succeed(decision);
    await request;
    assert.equal(t.records[0]['valid-status'], decision);
    assert.match(JSON.stringify(t.notices.at(-1)), decision === 'reject' ? /仍可/ : /配置异常/);
  }

  const t = setup();
  t.setRecordError({ code: 503, message: 'unavailable' });
  const request = t.page.enableBookingReminders();
  t.succeed('accept');
  await request;
  assert.match(t.notices.at(-1).title, /未保存/);
  assert.equal(t.warnings[0][1].stage, 'record');
  assert.equal(t.page.data.reminderRequesting, false);

  assert.equal(t.helper.isSubscriptionCategoryMissing({
    status: 'needs_top_up', templates,
    templateStatuses: { bookingStatus: { enabled: true }, bookingEvent: { enabled: false } }
  }, ['bookingStatus']), false, '其他提醒缺失不能让已开通的预约进展入口持续出现');

  const unavailable = setup();
  unavailable.page.data.reminderStatus = { templates: {} };
  await unavailable.page.enableBookingReminders();
  assert.equal(unavailable.requests.length, 0, '没有状态模板时不得回退申请无关模板');
  assert.match(unavailable.notices.at(-1).content, /配置异常/);
  assert.equal(unavailable.page.data.reminderRequesting, false);
  console.log('客户端预约提醒：失效模板隔离、即时授权、重复点击、错误分类与保存失败回归通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
