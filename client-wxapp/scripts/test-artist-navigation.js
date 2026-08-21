const assert = require('assert');

const storage = {};
const calls = { navigateTo: [], toast: [] };

global.wx = {
  getStorageSync(key) { return storage[key]; },
  setStorageSync(key, value) { storage[key] = value; },
  removeStorageSync(key) { delete storage[key]; },
  navigateTo(options) { calls.navigateTo.push(options.url); },
  showToast(options) { calls.toast.push(options.title); }
};

const navigation = require('../utils/artist-navigation');

assert.strictEqual(
  navigation.artistHomePath(12, 'discover'),
  '/pages/client/artist-home/index?id=12&source=discover'
);
assert.strictEqual(navigation.artistHomePath('0', 'home'), '');
assert.strictEqual(navigation.artistHomePath('abc', 'home'), '');
assert.strictEqual(
  navigation.artistHomePath(12, 'invalid source!'),
  '/pages/client/artist-home/index?id=12&source=artist_identity'
);

assert.strictEqual(navigation.normalizeInternalPath('https://example.com'), '');
assert.strictEqual(navigation.normalizeInternalPath('//pages/client/home/index'), '');
assert.strictEqual(
  navigation.normalizeInternalPath('/pages/client/artist-home/index?id=12'),
  '/pages/client/artist-home/index?id=12'
);

const target = '/pages/client/artist-home/index?id=12&source=card';
const loginUrl = navigation.buildClientLoginUrl(target, {
  inviteCode: 'INV 12',
  source: 'card'
});
assert.strictEqual(
  loginUrl,
  '/pages/login/index?redirect=%2Fpages%2Fclient%2Fartist-home%2Findex%3Fid%3D12%26source%3Dcard&invite=INV%2012&source=card'
);
assert.strictEqual(storage.post_auth_redirect, target);
assert.strictEqual(navigation.consumePostAuthRedirect('/pages/client/home/index'), target);
assert.strictEqual(storage.post_auth_redirect, undefined);

assert.strictEqual(navigation.openArtistHome(12, 'favorites'), true);
assert.strictEqual(calls.navigateTo[0], '/pages/client/artist-home/index?id=12&source=favorites');
assert.strictEqual(navigation.openArtistHome(null, 'home'), false);
assert.strictEqual(calls.toast[0], '美甲师信息暂不可用');

console.log('Artist navigation checks passed.');
