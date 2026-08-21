const assert = require('assert');

let pageConfig;
global.getApp = () => ({ globalData: {} });
global.Page = (config) => { pageConfig = config; };
global.wx = {
  getStorageSync: () => null,
  setStorageSync: () => {},
  removeStorageSync: () => {},
  pageScrollTo: () => {},
  showToast: () => {}
};

require('../pages/technician/work-edit/index');

function createPage() {
  const page = {
    ...pageConfig,
    data: JSON.parse(JSON.stringify(pageConfig.data)),
    setData(patch, callback) {
      Object.keys(patch).forEach((key) => { this.data[key] = patch[key]; });
      if (callback) callback();
    }
  };
  return page;
}

const page = createPage();
page.data.title = '春日法式';
page.data.coverUrl = '/uploads/cover.jpg';
page.updateRequiredProgress();
assert.strictEqual(page.data.requiredProgress, 2);

page.data.previousEntry = {
  price: '128',
  tags: '法式,春季',
  suitableScene: '约会',
  recommendationScore: 4
};
page.markDirty = () => {};
page.reusePreviousField({ currentTarget: { dataset: { field: 'tags' } } });
assert.strictEqual(page.data.tags, '法式,春季');
assert.strictEqual(page.data.advancedExpanded, true);
page.reusePreviousField({ currentTarget: { dataset: { field: 'title' } } });
assert.strictEqual(page.data.title, '春日法式');

page._draftOwnerId = 7;
page.data.workId = 11;
page.data.images = ['/uploads/one.jpg'];
page.data.accessGrants = [{ customerId: 3 }];
page.resetForNextWork();
assert.strictEqual(page.data.workId, null);
assert.deepStrictEqual(page.data.images, []);
assert.deepStrictEqual(page.data.accessGrants, []);
assert.strictEqual(page.data.visibilityScope, 'public');
assert.strictEqual(page.data.sessionCount, 1);

console.log('Continuous work entry checks passed.');
