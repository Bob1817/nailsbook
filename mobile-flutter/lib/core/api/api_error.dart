class ApiError implements Exception {
  final String message;
  final int? statusCode;
  final Map<String, dynamic>? body;

  ApiError(this.message, {this.statusCode, this.body});

  bool get isUnauthorized => statusCode == 401;

  @override
  String toString() => 'ApiError($statusCode): $message';
}
