const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

// 1. 测试 cdn-image 模块核心逻辑
const { buildThumbnail, decorateWorkImages, isBypassUrl, PRESETS } = require('../utils/cdn-image');

// 1.1 预设校验
assert.equal(PRESETS.thumb.width, 400);
assert.equal(PRESETS.thumb.format, 'webp');
assert.equal(PRESETS.avatar.width, 120);
assert.equal(PRESETS.avatar.height, 120);
assert.equal(PRESETS.cover.width, 720);

// 1.2 阿里云 OSS 处理测试
const ossUrl = 'https://nailart-test.oss-cn-hangzhou.aliyuncs.com/works/2026/sample.jpg';
const ossThumb = buildThumbnail(ossUrl, 'thumb');
assert.ok(ossThumb.includes('x-oss-process=image/resize,w_400,m_lfit/format,webp/quality,q_80'), 'OSS thumb 应生成正确规则');

const ossCover = buildThumbnail(ossUrl, 'cover');
assert.ok(ossCover.includes('w_720'), 'OSS cover 应指定 720 宽度');

const ossAvatar = buildThumbnail('https://nailart-test.oss-cn-hangzhou.aliyuncs.com/avatars/user.jpg', 'avatar');
assert.ok(ossAvatar.includes('w_120,h_120,m_fill'), 'OSS avatar 应指定 120x120 裁剪填充');

// 带已有参数时不破坏原有 query
const ossUrlWithQuery = 'https://nailart-test.oss-cn-hangzhou.aliyuncs.com/sample.jpg?version=1';
const ossThumbWithQuery = buildThumbnail(ossUrlWithQuery, 'thumb');
assert.ok(ossThumbWithQuery.startsWith(ossUrlWithQuery + '&x-oss-process='), '已有 query 时应使用 & 分隔符');

// 已有 x-oss-process 时不得重复叠加
const ossAlreadyProcessed = ossUrl + '?x-oss-process=image/resize,w_300';
assert.equal(buildThumbnail(ossAlreadyProcessed, 'thumb'), ossAlreadyProcessed, '已有处理参数不得重复叠加');

// 1.3 腾讯云 COS 处理测试
const cosUrl = 'https://nailart-123456.cos.ap-guangzhou.myqcloud.com/works/photo.png';
const cosThumb = buildThumbnail(cosUrl, 'thumb');
assert.ok(cosThumb.includes('imageMogr2/thumbnail/400x/format/webp/quality/80'), 'COS thumb 应生成 imageMogr2 规则');

// 1.4 回退与旁路保护测试
assert.equal(buildThumbnail('', 'thumb'), '', '空 URL 安全返回空串');
assert.equal(buildThumbnail(null, 'thumb'), '', 'null 安全返回空串');
assert.equal(buildThumbnail(undefined, 'thumb'), '', 'undefined 安全返回空串');

const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
assert.equal(buildThumbnail(dataUri, 'thumb'), dataUri, 'Base64 数据 URI 必须原样透传');

const svgUrl = 'https://cdn.example.com/icons/logo.svg';
assert.equal(buildThumbnail(svgUrl, 'thumb'), svgUrl, 'SVG 矢量图片必须原样透传');

const localUpload = '/uploads/works/nail001.jpg';
assert.equal(buildThumbnail(localUpload, 'thumb'), localUpload, '本地相对路径必须原样透传');

// 1.5 decorateWorkImages 实体修饰测试
const mockRawWork = {
  id: 101,
  coverUrl: ossUrl,
  technicianAvatarUrl: 'https://nailart-test.oss-cn-hangzhou.aliyuncs.com/avatars/tech.jpg'
};
const decorated = decorateWorkImages(mockRawWork);
assert.ok(decorated.coverThumbUrl.includes('w_400'), '实体修饰后应包含 coverThumbUrl');
assert.ok(decorated.coverMediumUrl.includes('w_720'), '实体修饰后应包含 coverMediumUrl');
assert.ok(decorated.technicianAvatarThumbUrl.includes('w_120'), '实体修饰后应包含 technicianAvatarThumbUrl');

// 2. 测试 normalizeWork 集成
const { normalizeWork } = require('../utils/normalize-work');
const normalized = normalizeWork(mockRawWork, { id: 1, name: '测试美甲师', avatarUrl: mockRawWork.technicianAvatarUrl });
assert.ok(normalized.coverThumbUrl, 'normalizeWork 必须输出 coverThumbUrl');
assert.ok(normalized.coverMediumUrl, 'normalizeWork 必须输出 coverMediumUrl');
assert.ok(normalized.technicianAvatarThumbUrl, 'normalizeWork 必须输出 technicianAvatarThumbUrl');

// 3. 测试 work-card 组件渐进式与骨架感知
const cardJs = fs.readFileSync(path.join(root, 'components/work-card/index.js'), 'utf8');
const cardWxml = fs.readFileSync(path.join(root, 'components/work-card/index.wxml'), 'utf8');
const cardWxss = fs.readFileSync(path.join(root, 'components/work-card/index.wxss'), 'utf8');

assert.match(cardJs, /imageLoaded:\s*false/, 'work-card 必须维护 imageLoaded 状态');
assert.match(cardJs, /imageError:\s*false/, 'work-card 必须维护 imageError 状态');
assert.match(cardJs, /onImageLoad\(\)/, 'work-card 必须提供 onImageLoad 事件处理');
assert.match(cardJs, /onImageError\(\)/, 'work-card 必须提供 onImageError 事件处理');
assert.match(cardJs, /buildThumbnail\(cover/, 'work-card 必须通过 buildThumbnail 动态优化封面尺寸');

assert.match(cardWxml, /class="wc-skeleton-shimmer"/, 'work-card WXML 必须提供骨架微光占位');
assert.match(cardWxml, /bindload="onImageLoad"/, 'work-card 封面图必须监听图片完成事件');
assert.match(cardWxml, /binderror="onImageError"/, 'work-card 封面图必须监听图片错误事件');
assert.match(cardWxml, /class="wc-fallback-icon"/, 'work-card 必须具备错误占位图标');

assert.match(cardWxss, /@keyframes wcSkeletonShimmer/, 'work-card WXSS 必须声明骨架微光动画');
assert.match(cardWxss, /\.wc-editorial-img\.is-loaded/, 'work-card 必须声明平滑加载过渡状态');

// 4. 瀑布流页面级骨架感知检查
const clientWorksWxml = fs.readFileSync(path.join(root, 'pages/client/works/index.wxml'), 'utf8');
const clientWorksWxss = fs.readFileSync(path.join(root, 'pages/client/works/index.wxss'), 'utf8');
const techWorksWxml = fs.readFileSync(path.join(root, 'pages/technician/works/index.wxml'), 'utf8');
const techWorksWxss = fs.readFileSync(path.join(root, 'pages/technician/works/index.wxss'), 'utf8');

assert.match(clientWorksWxml, /<view wx:if="\{\{loading\}\}" class="waterfall skel-mode">/, '客户端作品列表加载态必须使用瀑布流骨架屏');
assert.match(clientWorksWxss, /\.skel-card/, '客户端作品列表必须声明骨架卡片样式');
assert.match(techWorksWxml, /<view wx:if="\{\{loading\}\}" class="waterfall skel-mode">/, '技师端作品管理加载态必须使用瀑布流骨架屏');
assert.match(techWorksWxss, /\.skel-card/, '技师端作品管理必须声明骨架卡片样式');

console.log('图片管线 CDN 动态缩放与骨架屏感知专项测试全部通过！');
