/// 全局配置。
///
/// API 基址默认指向生产后台 api.lunails.cn；本地联调可用
/// `--dart-define=API_BASE_URL=http://10.0.2.2:3000` 覆盖。
/// ApiClient 会在其后追加 `/api/client` 或 `/api/technician` 前缀。
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://api.lunails.cn',
);
