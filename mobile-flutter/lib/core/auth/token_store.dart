import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStore {
  static const _clientAccessTokenKey = 'client_access_token';
  static const _clientRefreshTokenKey = 'client_refresh_token';
  static const _technicianAccessTokenKey = 'technician_access_token';
  static const _technicianRefreshTokenKey = 'technician_refresh_token';
  static const _activeRoleKey = 'active_role';

  final FlutterSecureStorage _storage;

  TokenStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  Future<String?> getClientAccessToken() =>
      _storage.read(key: _clientAccessTokenKey);

  Future<String?> getClientRefreshToken() =>
      _storage.read(key: _clientRefreshTokenKey);

  Future<String?> getTechnicianAccessToken() =>
      _storage.read(key: _technicianAccessTokenKey);

  Future<String?> getTechnicianRefreshToken() =>
      _storage.read(key: _technicianRefreshTokenKey);

  Future<String?> getActiveRole() => _storage.read(key: _activeRoleKey);

  Future<void> saveClientTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    await _storage.write(key: _clientAccessTokenKey, value: accessToken);
    if (refreshToken != null) {
      await _storage.write(key: _clientRefreshTokenKey, value: refreshToken);
    }
    await _storage.write(key: _activeRoleKey, value: 'client');
  }

  Future<void> saveTechnicianTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    await _storage.write(key: _technicianAccessTokenKey, value: accessToken);
    if (refreshToken != null) {
      await _storage.write(
          key: _technicianRefreshTokenKey, value: refreshToken);
    }
    await _storage.write(key: _activeRoleKey, value: 'technician');
  }

  Future<void> clearClientTokens() async {
    await _storage.delete(key: _clientAccessTokenKey);
    await _storage.delete(key: _clientRefreshTokenKey);
  }

  Future<void> clearTechnicianTokens() async {
    await _storage.delete(key: _technicianAccessTokenKey);
    await _storage.delete(key: _technicianRefreshTokenKey);
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  Future<String?> getActiveAccessToken() async {
    final role = await getActiveRole();
    if (role == 'client') return getClientAccessToken();
    if (role == 'technician') return getTechnicianAccessToken();
    return null;
  }
}
