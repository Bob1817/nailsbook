const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { normalizeGuidanceSection, serializeGuidanceSection } = require('../utils/shop-guidance');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const legacy = normalizeGuidanceSection({ text: '出站后左转', images: ['a.jpg', 'b.jpg'] }, 'metro');
assert.deepStrictEqual(legacy.blocks.map((block) => block.type), ['text', 'image', 'image']);

const ordered = serializeGuidanceSection({ blocks: [
  { id: '1', type: 'text', text: '先到路口' },
  { id: '2', type: 'image', url: 'corner.jpg' },
  { id: '3', type: 'text', text: '再进入 A 栋' }
] });
assert.deepStrictEqual(ordered.blocks.map((block) => block.type), ['text', 'image', 'text']);
assert.strictEqual(ordered.text, '先到路口\n再进入 A 栋');
assert.deepStrictEqual(ordered.images, ['corner.jpg']);

const editor = read('pages/technician/shop-guidance-edit/index.wxml');
assert(editor.includes('wx:for="{{activeBlocks}}"'));
assert(editor.includes('bindtap="addTextBlock"'));
assert(editor.includes('bindtap="addImageBlock"'));
assert(editor.includes('catchtap="moveBlock"'));

const display = read('pages/client/shop-guidance/index.wxml');
assert(display.includes('wx:for="{{activeBlocks}}"'));
assert(display.includes("item.type === 'text'"));
assert(display.includes('open-type="share"'), '分享按钮必须仅在公开到店指引页面展示');

const api = read('services/api.js');
assert(api.includes("`${T}/uploads/image`") && api.includes("`${C}/uploads/image`"), '图片上传必须调用后端 /uploads/image 路由');
assert(api.includes('shopGuidance: async (id, params)') && api.includes('needAuth: false'), '到店指引必须通过无需登录的公开接口读取');

const publicPage = read('pages/client/shop-guidance/index.js');
assert(publicPage.includes('api.public.artists.shopGuidance') && publicPage.includes('onShareAppMessage()'), '公开指引页必须支持游客读取和微信分享');

const technicianOrder = read('pages/technician/order-detail/index.wxml');
const technicianOrderStyle = read('pages/technician/order-detail/index.wxss');
assert(technicianOrder.includes('查看到店指引') && !technicianOrder.includes('open-type="share"'), '美甲师预约详情只保留到店指引入口，不直接展示分享按钮');
assert(technicianOrder.indexOf('class="address-content"') < technicianOrder.indexOf('查看到店指引'), '到店指引入口必须与服务地址位于同一内容栏');
assert(technicianOrderStyle.includes('.address-row { align-items: flex-start; }') && technicianOrderStyle.includes('margin: -16rpx 0 -16rpx;'), '服务地址需顶部对齐，并保持紧凑一致的到店指引间距');

[
  'pages/client/artist-home/index.wxml',
  'pages/client/works/index.wxml',
  'pages/client/create-order/index.wxml',
  'pages/client/order-detail/index.wxml',
  'pages/client/home/index.wxml'
].forEach((file) => assert(read(file).includes('到店指引'), `${file} 的店铺地址下方必须提供到店指引入口`));

const dto = read('../backend/src/technician-auth/dto/update-service-type.dto.ts');
assert(dto.includes('blocks?: ShopGuidanceBlockDto[]'));

console.log('到店指引有序内容块专项检查通过。');
