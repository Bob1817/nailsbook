/**
 * cdn-image.js
 *
 * 统一图片 CDN 动态缩放、裁剪与格式优化管线。
 *
 * 核心设计：
 * 1. 支持阿里云 OSS、腾讯云 COS 及标准 CDN 格式。
 * 2. 瀑布流/网格封面使用 WebP 缩略图（30KB~50KB），相比 2MB~5MB 原图网络与显存负载降低 90%+。
 * 3. 严格保护本地 Mock、测试数据、SVG 矢量及 base64，非识别 CDN 域名安全透明回退。
 */

const PRESETS = {
  avatar: { width: 120, height: 120, mode: 'fill', quality: 80, format: 'webp' },
  thumb: { width: 400, mode: 'lfit', quality: 80, format: 'webp' },
  cover: { width: 720, mode: 'lfit', quality: 85, format: 'webp' },
  detail: { width: 1080, mode: 'lfit', quality: 85, format: 'webp' },
  preview: { width: 1920, mode: 'lfit', quality: 90 }
};

/**
 * 判断是否为不可/无需 CDN 转换的 URL
 */
function isBypassUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('data:')) return true;
  if (trimmed.startsWith('wxfile://') || trimmed.startsWith('http://tmp/')) return true;
  if (trimmed.startsWith('/static/') || trimmed.startsWith('/assets/')) return true;
  if (/\.svg(\?|$)/i.test(trimmed)) return true;
  return false;
}

/**
 * 构建带 CDN 缩放/格式处理的图片 URL
 *
 * @param {string} url 原始图片 URL
 * @param {string|Object} options 预设名称 ('thumb'|'cover'|'avatar'|'detail'|'preview') 或自定义配置
 * @returns {string} 优化后的图片 URL
 */
function buildThumbnail(url, options) {
  if (isBypassUrl(url)) return url || '';
  const trimmed = url.trim();

  const config = typeof options === 'string'
    ? (PRESETS[options] || PRESETS.thumb)
    : (options && typeof options === 'object' ? Object.assign({}, PRESETS.thumb, options) : PRESETS.thumb);

  const width = Math.round(Number(config.width || 0));
  const height = Math.round(Number(config.height || 0));
  const quality = Math.min(100, Math.max(1, Math.round(Number(config.quality || 80))));
  const mode = config.mode || 'lfit';
  const format = config.format || 'webp';

  // 1. 阿里云 OSS 识别与处理
  const isOss = /aliyuncs\.com/i.test(trimmed) || /\.oss-/i.test(trimmed) || /x-oss-process/i.test(trimmed);
  if (isOss) {
    if (/x-oss-process/i.test(trimmed)) return trimmed; // 已有处理参数，不再重复追加

    let processRule = 'image/resize';
    if (width > 0) processRule += `,w_${width}`;
    if (height > 0) processRule += `,h_${height}`;
    if (mode) processRule += `,m_${mode}`;
    if (format) processRule += `/format,${format}`;
    if (quality) processRule += `/quality,q_${quality}`;

    const sep = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${sep}x-oss-process=${processRule}`;
  }

  // 2. 腾讯云 COS 识别与处理
  const isCos = /myqcloud\.com/i.test(trimmed) || /imageMogr2/i.test(trimmed);
  if (isCos) {
    if (/imageMogr2/i.test(trimmed)) return trimmed;

    let mogr = `imageMogr2/thumbnail/${width > 0 ? width : ''}x${height > 0 ? height : ''}`;
    if (format) mogr += `/format/${format}`;
    if (quality) mogr += `/quality/${quality}`;

    const sep = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${sep}${mogr}`;
  }

  // 3. 其余本地相对路径或未识别第三方域名：透明回退
  return trimmed;
}

/**
 * 对作品实体中的图片字段进行批量 CDN 优化修饰
 *
 * @param {Object} work 作品实体
 * @returns {Object} 补充缩略图字段的作品实体
 */
function decorateWorkImages(work) {
  if (!work || typeof work !== 'object') return work;
  const cover = work.coverUrl || (Array.isArray(work.imageUrls) && work.imageUrls[0]) || '';
  const avatar = work.technicianAvatarUrl || (work.technician && work.technician.avatarUrl) || '';

  return Object.assign({}, work, {
    coverThumbUrl: buildThumbnail(cover, 'thumb'),
    coverMediumUrl: buildThumbnail(cover, 'cover'),
    technicianAvatarThumbUrl: buildThumbnail(avatar, 'avatar')
  });
}

module.exports = {
  PRESETS,
  buildThumbnail,
  decorateWorkImages,
  isBypassUrl
};
