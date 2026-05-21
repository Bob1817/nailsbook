import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_error.dart';

typedef OnUnauthorized = void Function();

class ApiClient {
  final String baseUrl;
  OnUnauthorized? onUnauthorized;

  String? _token;
  String _rolePrefix = '';

  ApiClient({
    required this.baseUrl,
    this.onUnauthorized,
  });

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

  Future<Map<String, dynamic>> get(String path, {Map<String, String>? queryParams}) async {
    final uri = _buildUri(path, queryParams);
    final response = await http.get(uri, headers: _headers);
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> post(String path, {Map<String, dynamic>? body}) async {
    final uri = _buildUri(path);
    final response = await http.post(uri, headers: _headers, body: jsonEncode(body));
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> patch(String path, {Map<String, dynamic>? body}) async {
    final uri = _buildUri(path);
    final response = await http.patch(uri, headers: _headers, body: jsonEncode(body));
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> delete(String path) async {
    final uri = _buildUri(path);
    final response = await http.delete(uri, headers: _headers);
    return _handleResponse(response);
  }

  Future<List<dynamic>> getList(String path, {Map<String, String>? queryParams}) async {
    final uri = _buildUri(path, queryParams);
    final response = await http.get(uri, headers: _headers);
    _checkStatus(response);
    final decoded = jsonDecode(response.body);
    if (decoded is List) return decoded;
    if (decoded is Map && decoded.containsKey('data')) return decoded['data'] as List;
    throw ApiError('Unexpected response format', statusCode: response.statusCode);
  }

  Future<http.StreamedResponse> uploadMultipart(
    String path,
    String filePath,
    String fieldName,
  ) async {
    final uri = _buildUri(path);
    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll(_headers);
    request.files.add(await http.MultipartFile.fromPath(fieldName, filePath));
    return request.send();
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
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  void _checkStatus(http.Response response) {
    if (response.statusCode == 401) {
      onUnauthorized?.call();
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
