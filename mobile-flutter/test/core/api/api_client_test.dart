import 'package:flutter_test/flutter_test.dart';
import 'package:nailbook_mobile/core/api/api_client.dart';
import 'package:nailbook_mobile/core/api/api_error.dart';

void main() {
  group('ApiClient', () {
    late ApiClient client;

    setUp(() {
      client = ApiClient(baseUrl: 'http://localhost:3000');
    });

    test('sets role prefix for client', () {
      client.setRole('client');
      expect(client.rolePrefix, '/api/client');
    });

    test('sets role prefix for technician', () {
      client.setRole('technician');
      expect(client.rolePrefix, '/api/technician');
    });

    test('sets role prefix to empty for unknown role', () {
      client.setRole('unknown');
      expect(client.rolePrefix, '');
    });

    test('ApiError isUnauthorized returns true for 401', () {
      final error = ApiError('Unauthorized', statusCode: 401);
      expect(error.isUnauthorized, isTrue);
    });

    test('ApiError isUnauthorized returns false for other codes', () {
      final error = ApiError('Not found', statusCode: 404);
      expect(error.isUnauthorized, isFalse);
    });

    test('ApiError toString includes status code and message', () {
      final error = ApiError('Bad request', statusCode: 400);
      expect(error.toString(), contains('400'));
      expect(error.toString(), contains('Bad request'));
    });
  });
}
