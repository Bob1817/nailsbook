const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'pages/technician/chat-detail/index.js'), 'utf8');

let page;
const calls = [];
const conversations = [];
const api = {
  chat: { technician: {
    conversations: async () => conversations,
    messages: async (params) => { calls.push(params); return { messages: [] }; },
    markRead: async () => ({}),
    sendMessage: async () => ({})
  } },
  upload: { image: async () => ({ url: '' }) }
};
const wx = {
  setNavigationBarTitle() {}, showToast() {}, nextTick(fn) { fn(); },
  getSystemInfoSync() { return { statusBarHeight: 20 }; },
  getMenuButtonBoundingClientRect() { return { top: 24, height: 32 }; }
};
vm.runInNewContext(source, {
  require: () => api,
  Page(definition) { page = definition; },
  wx, console, setTimeout, clearTimeout, setInterval, clearInterval, Date
});

function instance(data) {
  const ctx = Object.assign({}, page, { data: Object.assign({}, page.data, data) });
  ctx.setData = (next) => Object.assign(ctx.data, next);
  return ctx;
}

(async () => {
  const fresh = instance({ clientId: 12, conversationId: null, loading: true });
  await fresh.prepareConversation();
  assert.equal(calls.length, 0, '无历史会话时不应请求空 conversation_id');
  assert.equal(fresh.data.loading, false);

  conversations.push({ id: 34, client: { id: 12 } });
  const existing = instance({ clientId: 12, conversationId: null, loading: true });
  await existing.prepareConversation();
  assert.equal(existing.data.conversationId, 34);
  assert.deepEqual(calls.pop(), { conversationId: 34 });

  const invalid = instance({ clientId: null, conversationId: null, loading: true });
  await invalid.loadMessages();
  assert.equal(calls.length, 0, '非法会话标识不应触发消息请求');

  console.log('美甲师对话会话解析检查通过');
})().catch((error) => { console.error(error); process.exit(1); });
