/**
 * 规范化图片 URL：
 * - 把指向 api.lunails.cn 的绝对 URL 转回相对路径（备案未完成前必须经 vite proxy）
 * - 相对路径直接返回
 * - 其它绝对 URL（如 CDN）保持原样
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  // 已经是相对路径
  if (url.startsWith('/')) return url;
  // 把 api.lunails.cn 的绝对 URL 转成相对路径
  const match = url.match(/^https?:\/\/api\.lunails\.cn(\/.*)$/);
  if (match) return match[1];
  return url;
}
