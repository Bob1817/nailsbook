import 'package:flutter_test/flutter_test.dart';
import 'package:nailbook_mobile/core/auth/auth_session.dart';

void main() {
  group('AuthStatus', () {
    test('has expected values', () {
      expect(AuthStatus.values, contains(AuthStatus.unknown));
      expect(AuthStatus.values, contains(AuthStatus.unauthenticated));
      expect(AuthStatus.values, contains(AuthStatus.client));
      expect(AuthStatus.values, contains(AuthStatus.technician));
    });

    test('unknown is not authenticated', () {
      expect(AuthStatus.unknown == AuthStatus.client, isFalse);
      expect(AuthStatus.unknown == AuthStatus.technician, isFalse);
    });
  });
}
