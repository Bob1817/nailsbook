import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'api_error.dart';

typedef OnUnauthorized = void Function();

class ApiClient {
  static const _requestTimeout = Duration(seconds: 12);

  final String baseUrl;
  OnUnauthorized? onUnauthorized;

  /// 401 时尝试用 refreshToken 静默续期；返回是否成功（成功后须已更新 token）。
  Future<bool> Function()? onRefreshToken;

  String? _token;
  String _rolePrefix = '';
  // 单飞：并发 401 只触发一次刷新。
  Future<bool>? _refreshing;

  // 可注入的 http client（测试用 MockClient；默认走真实网络）。
  final http.Client _http;

  ApiClient({
    required this.baseUrl,
    this.onUnauthorized,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  void setToken(String? token) {
    _token = token;
  }

  void setRole(String role) {
    switch (role) {
      case 'client':
        _rolePrefix = '/api/client';
        break;
      case 'technician':
        _rolePrefix = '/api/technician';
        break;
      default:
        _rolePrefix = '';
    }
  }

  String get rolePrefix => _rolePrefix;

  Future<Map<String, dynamic>> get(String path,
      {Map<String, String>? queryParams}) async {
    final uri = _buildUri(path, queryParams);
    final response = await _send(() => _http.get(uri, headers: _headers));
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> post(String path,
      {Map<String, dynamic>? body}) async {
    final uri = _buildUri(path);
    // 无 body 时发送 {} 而非 jsonEncode(null)（="null"），
    // 否则后端 JSON body-parser 会以「"null" is not valid JSON」400 拒绝。
    final response = await _send(
        () => _http.post(uri, headers: _headers, body: jsonEncode(body ?? const {})));
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> patch(String path,
      {Map<String, dynamic>? body}) async {
    final uri = _buildUri(path);
    final response = await _send(
        () => _http.patch(uri, headers: _headers, body: jsonEncode(body ?? const {})));
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> delete(String path) async {
    final uri = _buildUri(path);
    final response = await _send(() => _http.delete(uri, headers: _headers));
    return _handleResponse(response);
  }

  Future<List<dynamic>> getList(String path,
      {Map<String, String>? queryParams}) async {
    final uri = _buildUri(path, queryParams);
    final response = await _send(() => _http.get(uri, headers: _headers));
    _checkStatus(response);
    final decoded = jsonDecode(response.body);
    if (decoded is List) return decoded;
    if (decoded is Map && decoded.containsKey('data')) {
      return decoded['data'] as List;
    }
    throw ApiError('Unexpected response format',
        statusCode: response.statusCode);
  }

  Future<http.StreamedResponse> uploadMultipart(
    String path,
    String filePath,
    String fieldName,
  ) async {
    final uri = _buildUri(path);
    final request = http.MultipartRequest('POST', uri);
    request.headers['Accept'] = 'application/json';
    if (_token != null) {
      request.headers['Authorization'] = 'Bearer $_token';
    }
    // 显式声明 contentType + 文件名，确保后端按 mimetype+扩展名校验通过
    // （image_picker 在 iOS 上返回的临时路径扩展名不稳定，自动推断常失败）。
    final ext = filePath.split('.').last.toLowerCase();
    final (MediaType type, String filename) = switch (ext) {
      'png' => (MediaType('image', 'png'), 'upload.png'),
      'webp' => (MediaType('image', 'webp'), 'upload.webp'),
      'm4a' => (MediaType('audio', 'mp4'), 'voice.m4a'),
      'aac' => (MediaType('audio', 'aac'), 'voice.aac'),
      'mp3' => (MediaType('audio', 'mpeg'), 'voice.mp3'),
      'wav' => (MediaType('audio', 'wav'), 'voice.wav'),
      _ => (MediaType('image', 'jpeg'), 'upload.jpg'),
    };
    request.files.add(await http.MultipartFile.fromPath(
      fieldName,
      filePath,
      filename: filename,
      contentType: type,
    ));
    return request.send().timeout(_requestTimeout);
  }

  /// 统一发送：401 时先尝试静默续期并重放一次；仍 401 则触发登出。
  Future<http.Response> _send(
      Future<http.Response> Function() doRequest) async {
    var response = await doRequest().timeout(_requestTimeout);
    if (response.statusCode == 401 && await _tryRefresh()) {
      response = await doRequest().timeout(_requestTimeout);
    }
    if (response.statusCode == 401) {
      onUnauthorized?.call();
    }
    return response;
  }

  Future<bool> _tryRefresh() {
    final refresher = onRefreshToken;
    if (refresher == null) return Future.value(false);
    return _refreshing ??=
        refresher().whenComplete(() => _refreshing = null);
  }

  /// 直接调用刷新端点（不经拦截器，避免递归触发刷新/登出）。
  Future<Map<String, dynamic>> refreshTokens(
      String role, String refreshToken) async {
    final prefix = role == 'client' ? '/api/client' : '/api/technician';
    final uri = Uri.parse('$baseUrl$prefix/auth/refresh');
    final response = await _http
        .post(uri,
            headers: const {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode({'refreshToken': refreshToken}))
        .timeout(_requestTimeout);
    if (response.statusCode >= 400) {
      throw ApiError('refresh failed', statusCode: response.statusCode);
    }
    final decoded = jsonDecode(response.body);
    return decoded is Map<String, dynamic> ? decoded : const {};
  }

  Uri _buildUri(String path, [Map<String, String>? queryParams]) {
    final fullPath = '$_rolePrefix$path';
    return Uri.parse('$baseUrl$fullPath').replace(queryParameters: queryParams);
  }

  Map<String, String> get _headers {
    final h = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_token != null) {
      h['Authorization'] = 'Bearer $_token';
    }
    return h;
  }

  Map<String, dynamic> _handleResponse(http.Response response) {
    _checkStatus(response);
    // 成功响应容错：部分动作类端点（点赞/收藏等）返回空体 / 204 / 非对象 JSON，
    // 不应因解析失败而把成功当作失败。
    final raw = response.body.trim();
    if (raw.isEmpty) return const {};
    try {
      final decoded = jsonDecode(raw);
      return decoded is Map<String, dynamic> ? decoded : const {};
    } on FormatException {
      return const {};
    }
  }

  void _checkStatus(http.Response response) {
    if (response.statusCode == 401) {
      // onUnauthorized 已在 _send 内（续期失败后）触发，这里只抛错。
      throw ApiError('Unauthorized', statusCode: 401);
    }
    if (response.statusCode >= 400) {
      try {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        throw ApiError(
          body['message']?.toString() ?? 'Request failed',
          statusCode: response.statusCode,
          body: body,
        );
      } on FormatException {
        throw ApiError('Request failed', statusCode: response.statusCode);
      }
    }
  }
}
