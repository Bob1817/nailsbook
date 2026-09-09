const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const profile = read('pages/technician/profile/index.js');
const editor = read('pages/technician/homepage-settings/index.js');
const editorView = read('pages/technician/homepage-settings/index.wxml');
const editorStyle = read('pages/technician/homepage-settings/index.wxss');
const publicHome = read('pages/client/artist-home/index.js');

if (profile.includes("label: '擅长风格'")) throw new Error('style management must not duplicate the homepage entry');
if (!profile.includes('&preview=1&owner=1')) throw new Error('homepage entry must open the owner preview first');
if (!editor.includes('styleTags:this.data.specialties.slice(0,5)')) throw new Error('homepage editor does not persist public styleTags');
if (!editor.includes("最多展示 5 项擅长风格")) throw new Error('style selection limit feedback is missing');
if (!editorView.includes('id="styles-editor"') || !editorView.includes('selected-styles')) throw new Error('ordered style selection UI is missing');
if (!/\.selected-style \{[^}]*min-height:88rpx/.test(editorStyle)) throw new Error('selected style removal target must be at least 44px');
if (/DEFAULT_TAGS/.test(publicHome)) throw new Error('public artist page must not fabricate unmanaged default styles');

console.log('Style tags management checks passed.');
