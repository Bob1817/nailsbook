const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require('path').join(__dirname, '../utils/booking-realtime.js'), 'utf8');
function setup(options = {}) {
  let now = 0, seq = 0, calls = 0;
  const timers = new Map(), tasks = [];
  const storage = { role: 'technician', technician_token: 'test-token' };
  const page = { data: { loading: false }, onBookingChanged() { calls++; } };
  const wx = {
    getStorageSync: key => storage[key],
    connectSocket(socketOptions) {
      const task = { options: socketOptions, readyState: 1, closed: false, sent: [],
        send({data}) { this.sent.push(data); }, close() { this.closed = true; },
        onMessage(fn) { this.message = fn; }, onClose(fn) { this.closeEvent = fn; }, onError(fn) { this.error = fn; }
      };
      if (options.connectFailure) socketOptions.fail(options.connectFailure);
      tasks.push(task); return task;
    }
  };
  const module = { exports: {} };
  vm.runInNewContext(source, { module, wx, getApp: options.getApp || (() => ({globalData:{apiBaseUrl:'https://example.test'}})),
    getCurrentPages: () => [page], console, Promise,
    setTimeout(fn, ms) { timers.set(++seq, { at: now + ms, fn }); return seq; },
    clearTimeout(id) { timers.delete(id); }
  });
  async function tick(ms) {
    now += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); }
    for (let i = 0; i < 6; i++) await Promise.resolve();
  }
  return { api: module.exports, tasks, storage, page, timers, tick, calls:()=>calls };
}
(async () => {
  const t = setup();
  t.api.start(); t.api.start();
  assert.equal(t.tasks.length, 1, 'one socket per session');
  const first = t.tasks[0];
  assert(!first.options.url.includes('test-token'), 'token must not be in URL');
  first.message({data:'0{"pingInterval":25000,"pingTimeout":20000}'});
  assert.equal(first.sent[0], '40{"token":"test-token"}');
  first.message({data:'2'}); assert.equal(first.sent[1], '3');
  first.message({data:'42["booking:ready"]'});
  first.message({data:'42["booking:changed",{"orderId":1}]'});
  first.message({data:'42["booking:changed",{"orderId":2}]'});
  await t.tick(250); assert.equal(t.calls(), 1, 'burst events coalesce');
  t.page.data.loading = true;
  first.message({data:'42["booking:changed",{"orderId":3}]'});
  await t.tick(250); assert.equal(t.calls(), 1);
  t.page.data.loading = false;
  await t.tick(300); assert.equal(t.calls(), 2, 'events during loading not lost');
  first.closeEvent(); await t.tick(1600); assert.equal(t.tasks.length, 2);
  first.message({data:'42["booking:changed",{"orderId":4}]'});
  await t.tick(250); assert.equal(t.calls(), 2, 'stale sockets ignored');
  t.tasks[1].message({data:'42["booking:ready"]'});
  await t.tick(250); assert.equal(t.calls(), 3, 'reconnect catches up');
  t.api.stop(); assert(t.tasks[1].closed); assert.equal(t.timers.size, 0);
  await t.tick(60000); assert.equal(t.tasks.length, 2, 'background does not reconnect');
  t.storage.role = 'client'; t.api.start(); assert.equal(t.tasks.length, 2);
  t.storage.role = 'technician'; t.api.start();
  t.tasks[2].message({data:'42["error",{"message":"Invalid auth token"}]'});
  await t.tick(60000); assert.equal(t.tasks.length, 3, 'rejected token does not loop');
  t.api.stop();
  const failure = setup(); failure.api.start();
  failure.page.onBookingChanged = () => Promise.reject(new Error('offline'));
  failure.tasks[0].message({data:'42["booking:ready"]'});
  await failure.tick(250);
  failure.api.stop(); assert.equal(failure.timers.size, 0);
  const early = setup({ getApp: () => undefined });
  assert.doesNotThrow(() => early.api.start(), 'app 初始化期间不应读取不存在的实例');
  assert.equal(early.tasks.length, 0, 'app 尚未就绪时不应建立连接');
  const blocked = setup({ connectFailure: { errMsg: 'url not in domain list' } });
  blocked.api.start();
  await blocked.tick(60000);
  blocked.api.start();
  assert.equal(blocked.tasks.length, 1, 'Socket 合法域名未配置时不应持续重连');
  console.log('预约实时连接检查通过：握手、心跳、合并刷新、加载中补拉、重连、后台停止、角色与鉴权隔离');
})().catch(error => { console.error(error); process.exitCode = 1; });
