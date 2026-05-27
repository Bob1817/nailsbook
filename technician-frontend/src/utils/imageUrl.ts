/**
 * 规范化图片 URL：
 * - 把指向 api.lunails.cn 的绝对 URL 转回相对路径（备案未完成前必须经 vite proxy）
 * - 相对路径直接返回
 * - 其它绝对 URL（如 CDN）保持原样
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  const match = url.match(/^https?:\/\/api\.lunails\.cn(\/.*)$/);
  if (match) return match[1];
  return url;
}

/**
 * 递归处理对象/数组中所有字符串字段，把 api.lunails.cn 的绝对 URL 转为相对路径。
 */
export function rewriteUrlsInData<T>(value: T): T {
  if (typeof value === 'string') {
    return normalizeImageUrl(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => rewriteUrlsInData(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = rewriteUrlsInData(v);
    }
    return result as unknown as T;
  }
  return value;
}
