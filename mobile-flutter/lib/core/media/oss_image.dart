/// 阿里云 OSS 图片按需处理。
///
/// 后端把原图存入 OSS 并返回 URL，但全站此前都直接加载原图——列表、九宫格、
/// hero 都拉满分辨率，浪费带宽、拖慢加载。这里在「展示时」给 OSS 图片 URL 追加
/// `x-oss-process`，按场景下发缩略/中图/原图并转 WebP，零服务端成本。
///
/// 仅对 OSS 图片（`aliyuncs.com`）生效；本地 `/uploads`、外链等原样返回。
library;

const String _ossHost = 'aliyuncs.com';

String _process(String url, String process) {
  if (url.isEmpty) return url;
  if (!url.contains(_ossHost)) return url; // 非 OSS（本地/外链）不处理
  if (url.contains('x-oss-process=')) return url; // 已带处理参数
  final sep = url.contains('?') ? '&' : '?';
  return '$url${sep}x-oss-process=$process';
}

/// 按目标像素宽度等比缩放（仅缩小，不放大）并转 WebP。
/// [width] 为目标像素宽，已按 2x 屏适当放大；客户端上传已限到 1440，故更大无意义。
String ossSized(String url,
    {required int width, int quality = 80, bool webp = true}) {
  final fmt = webp ? '/format,webp' : '';
  return _process(url, 'image/resize,w_$width/quality,q_$quality$fmt');
}

/// 九宫格 / 小卡缩略图。
String ossThumb(String url) => ossSized(url, width: 600);

/// 信息流大卡。
String ossFeed(String url) => ossSized(url, width: 900);

/// 首页 hero。
String ossHero(String url) => ossSized(url, width: 1200);

/// 详情主图。
String ossDetail(String url) => ossSized(url, width: 1280);

/// 全屏预览（原图已 ≤1440，这里主要受益于 WebP）。
String ossFull(String url) => ossSized(url, width: 1600, quality: 85);

/// 头像（小尺寸）。
String ossAvatar(String url) => ossSized(url, width: 240, quality: 85);
