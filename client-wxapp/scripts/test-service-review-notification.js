const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
let page, destination, marked, preview;
const wx = { navigateTo: ({ url }) => { destination = url; }, previewImage: value => { preview = value; } };
const api = { chat: { technician: { markRead: id => { marked = id; return Promise.resolve(); } } } };
vm.runInNewContext(fs.readFileSync(path.join(root, 'pages/technician/chat/index.js'), 'utf8'), {
  require: () => api, Page: p => { page = p; }, wx,
});
page.onItemClick.call({ data: { filteredItems: [{ relatedType: 'service_review', relatedId: 41, conversationId: 8, type: 'system' }] } }, { currentTarget: { dataset: { index: 0 } } });
assert.equal(destination, '/pages/technician/order-detail/index?id=41');
assert.equal(marked, 8);
const context = { require: () => ({}), Page: p => { page = p; }, wx, getApp: () => ({ globalData: { apiBaseUrl: 'https://api.example.test' } }) };
vm.runInNewContext(fs.readFileSync(path.join(root, 'pages/technician/order-detail/index.js'), 'utf8'), context);
const photos = context.parseReviewPhotos('["/uploads/review.jpg","https://cdn.example.test/review.jpg"]');
assert.deepEqual(Array.from(photos), ['https://api.example.test/uploads/review.jpg', 'https://cdn.example.test/review.jpg']);
assert.equal(context.parseReviewPhotos('invalid').length, 0);
page.previewReviewPhoto.call({ data: { order: { review: { photos } } } }, { currentTarget: { dataset: { url: photos[1] } } });
assert.equal(preview.current, photos[1]);
assert.equal(preview.urls.length, 2);
const wxml = fs.readFileSync(path.join(root, 'pages/technician/order-detail/index.wxml'), 'utf8');
assert(wxml.includes('order.review.rating') && wxml.includes('order.review.content') && wxml.includes('order.review.photos'));
console.log('评价提醒跳转、已读、照片地址及预览检查通过');
