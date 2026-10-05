const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let page, uploadFails = false, modal = '', releaseProfile;
const writes = [];
const api = {
  upload: { image: async () => { if (uploadFails) throw Error('上传失败'); return { url: '/uploads/environment.jpg' }; } },
  technician: {
    auth: { updateProfile: () => { writes.push('profile'); return new Promise(resolve => { releaseProfile = resolve; }); } },
    brandProfile: { update: async value => { writes.push('brand'); assert.equal(value.environmentPhotos.length, 1); } }
  }
};
const storage = { role: 'technician', technician_userInfo: { id: 7 } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/technician/homepage-settings/index.js'), 'utf8'), {
  Page: value => { page = value; }, require: name => name.includes('services/api') ? api : { syncSessionAvatar() {} },
  wx: { getStorageSync: key => storage[key], setStorageSync: (key, value) => { storage[key] = value; },
    showToast() {}, showModal: value => { modal = value.content; },
    chooseMedia: async () => ({ tempFiles: [{ tempFilePath: '/tmp/local-fixture.jpg' }] }) }
});
const make = () => ({ ...page, data: { ...page.data, environmentPhotos: [], worksLoading: false }, setData(value) { Object.assign(this.data, value); } });
(async () => {
  const editor = make();
  editor.data.name = '工作室'; editor.data.publicationStatus = 'published';
  await editor.save(); assert(modal.includes('卫生与消毒说明') && modal.includes('取消规则') && modal.includes('环境照片'));
  assert.equal(writes.length, 0, '缺项时在当前页面明确说明，不提交半成品主页');
  await editor.addEnvironmentPhoto(); assert.equal(editor.data.environmentPhotos.length, 1);
  uploadFails = true; await editor.addEnvironmentPhoto();
  assert.equal(editor.data.environmentPhotos.length, 1, '失败保留已有照片');
  assert.equal(editor.data.environmentUploading, false);
  editor.data.environmentUploading = true; editor.removeEnvironmentPhoto({ currentTarget: { dataset: { index: 0 } } });
  assert.equal(editor.data.environmentPhotos.length, 1, '上传时不允许修改照片列表');
  editor.data.environmentUploading = false;
  Object.assign(editor.data, { avatarUrl: '/uploads/avatar.jpg', heroImageUrl: '/uploads/hero.jpg', tagline: '手绘美甲', city: '上海', serviceArea: '静安', artistIntroduction: '个人介绍', hygieneStandards: '如实填写的卫生说明', cancellationPolicy: '提前一天联系改期' });
  editor.data.profileLoadFailed = true; await editor.save(); assert.equal(writes.length, 0);
  editor.data.profileLoadFailed = false;
  const saving = editor.save(); await editor.save();
  assert.deepEqual(writes, ['profile'], '新头像先保存，避免主页发布校验读取旧头像；禁止重复保存');
  releaseProfile({}); await saving;
  assert.deepEqual(writes, ['profile', 'brand']); assert.equal(editor.data.saving, false);
  editor.removeEnvironmentPhoto({ currentTarget: { dataset: { index: 0 } } });
  assert.equal(editor.data.environmentPhotos.length, 0);
  console.log('主页公开必填提示、环境照片失败保留、上传互斥、头像先保存与重复提交验收通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
