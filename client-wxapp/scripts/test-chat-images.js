const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const clientSource = fs.readFileSync(path.join(__dirname, '../pages/client/utils/chat-images.js'), 'utf8');
const technicianSource = fs.readFileSync(path.join(__dirname, '../pages/technician/utils/chat-images.js'), 'utf8');
assert.equal(clientSource, technicianSource, '两端图片消息实现必须保持一致');

// Verify the real API adapter does not strip the DTO's recipient fields.
const requests = [];
const adapter = { module: { exports: {} }, require: name => name === '../utils/request' ? { post: (url, data) => requests.push({ url, data }) } : {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/api.js'), 'utf8'), adapter);
const chat = adapter.module.exports.chat;
chat.technician.sendMessage({ clientId: 11, messageType: 'image', imageUrl: '/a.jpg' });
chat.sendMessage({ conversationId: 9, messageType: 'image', imageUrl: '/a.jpg' }, 'technician');
chat.sendMessage({ techId: 7, messageType: 'image', imageUrl: '/a.jpg' }, 'client');
assert.equal(requests[0].data.clientId, 11);
assert.equal(requests[1].data.conversationId, 9);
assert.equal(requests[2].data.techId, 7);
assert.equal(requests[0].url, '/api/technician/messages');

async function test(role) {
  const uploads = [], sends = [], previews = [];
  let failFirst = true;
  const api = {
    upload: { image: async file => { uploads.push(file); return { url: '/uploaded/' + file }; } },
    chat: { sendMessage: async payload => {
      sends.push(payload);
      if (failFirst) { failFirst = false; throw { message: '网络超时' }; }
      return { message: { id: sends.length, conversationId: 9, messageType: 'image', imageUrl: payload.imageUrl } };
    } }
  };
  let selection;
  const storage = {};
  const context = { require: () => api, module: { exports: {} }, wx: { getStorageSync: key => key.endsWith('_userInfo') ? { id: 42 } : storage[key], setStorageSync: (key, value) => { storage[key] = JSON.parse(JSON.stringify(value)); }, removeStorageSync: key => { delete storage[key]; }, chooseMedia: options => { selection = options; }, showToast() {}, previewImage: options => previews.push(options) } };
  vm.runInNewContext(role === 'client' ? clientSource : technicianSource, context);
  const page = {
    ...context.module.exports.imageMethods(role),
    data: { messages: [], pendingImages: [{ id: 'a', path: 'a.jpg' }, { id: 'b', path: 'b.jpg' }], techId: 7, clientId: 11 },
    _pageActive: false,
    setData(patch) { Object.assign(this.data, patch); },
    stopPolling() {}, startPolling() {}, groupByDate() {}, scrollToBottom() {}, loadMessages: async () => {}, formatMessages: items => items
  };
  page.restoreImageOutbox();
  await page.sendPendingImages(['a', 'b']);
  assert.equal(sends.length, 2, 'one failure must not prevent the next image');
  assert.equal(page.data.conversationId, 9, 'capture conversation ID even while hidden');
  assert.equal(page.data.pendingImages[0].status, 'failed');
  assert.equal(page.data.pendingImages[0].error, '网络超时');
  assert.equal(page.data.sending, false);
  assert.equal(storage[page._imageOutboxKey].length, 1, 'persist failed images for reentry');
  const reopened = { ...page, data: { ...page.data, pendingImages: [] }, _imageOutboxKey: null };
  reopened.restoreImageOutbox();
  assert.equal(reopened.data.pendingImages[0].url, '/uploaded/a.jpg');
  reopened.data.messages = [{ senderType: role, messageType: 'image', imageUrl: '/uploaded/a.jpg' }];
  reopened.restoreImageOutbox();
  assert.equal(reopened.data.pendingImages.length, 0, 'reconcile a message committed before the response was lost');
  await page.retryImage({ currentTarget: { dataset: { id: 'a' } } });
  assert.equal(uploads.length, 2, 'retry reuses the uploaded URL');
  assert.equal(sends[2].conversationId, 9);
  assert.equal(page.data.pendingImages.length, 0);
  assert.equal(storage[page._imageOutboxKey], undefined, 'clear persisted drafts after success');
  page.previewImage({ currentTarget: { dataset: { url: '/uploaded/a.jpg' } } });
  assert.equal(previews[0].urls.length, 2, 'gallery includes other images');
  page.pickChatImages();
  assert.equal(selection.count, 9);
  assert.deepEqual(Array.from(selection.sourceType), ['album', 'camera']);
  let selected;
  page.sendPendingImages = ids => { selected = ids; };
  selection.success({ tempFiles: [
    { tempFilePath: 'ok.webp', size: 1024 },
    { tempFilePath: 'large.jpg', size: 6 * 1024 * 1024 },
    { tempFilePath: 'bad.gif', size: 1024 }
  ] });
  assert.equal(selected.length, 1, 'match server 5MB JPEG/PNG/WebP limits');

  let release;
  api.upload.image = () => new Promise(resolve => { release = resolve; });
  page.sendPendingImages = context.module.exports.imageMethods(role).sendPendingImages;
  const id = page.data.pendingImages[0].id;
  const sending = page.sendPendingImages([id]);
  const before = sends.length;
  await page.sendPendingImages([id]);
  page._imagesUnloaded = true;
  page.setData = () => { throw new Error('must not update an unloaded page'); };
  release({ url: '/uploaded/ok.webp' });
  await sending;
  assert.equal(sends.length, before + 1, 'repeated taps must not submit twice');
}
(async () => {
  await test('client');
  await test('technician');
  console.log('图片发送、部分失败、重试、隐藏页面和双端预览测试通过');
})().catch(error => { console.error(error); process.exit(1); });
