const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
for (const route of ['technician/services', 'technician/homepage-settings', 'technician/profile-settings', 'client/settings']) {
  const base = path.join(root, 'pages', route, 'index');
  const css = fs.readFileSync(base + '.wxss', 'utf8');
  const wxml = fs.readFileSync(base + '.wxml', 'utf8');
  assert(css.includes('booking-actions.wxss'), route);
  assert(css.includes('booking-form.wxss'), route);
  assert(wxml.includes('booking-action'), route);
  for (const [control] of wxml.matchAll(/<(?:input|textarea)\b[^>]*>/g)) {
    if (control.includes('placeholder=')) assert(control.includes('placeholder-class='), route);
  }
}
let definition;
vm.runInNewContext(fs.readFileSync(path.join(root, 'pages/technician/homepage-settings/index.js'), 'utf8'), {
  Page: value => { definition = value; }, require: () => ({})
});
(async () => {
  await definition.save.call({ data: { saving: false, heroUploading: true }, setData() { throw new Error('上传中不可进入保存'); } });
  console.log('四页公共控件接入与主页上传中保存拦截通过（视觉另验）');
})().catch(error => { console.error(error); process.exitCode = 1; });
