import 'package:flutter/foundation.dart';
import '../api/api_client.dart';
import 'token_store.dart';

enum AuthStatus { unknown, unauthenticated, client, technician }

class AuthSession extends ChangeNotifier {
  final TokenStore _tokenStore;
  final ApiClient _apiClient;

  AuthStatus _status = AuthStatus.unknown;
  Map<String, dynamic>? _profile;

  AuthStatus get status => _status;
  Map<String, dynamic>? get profile => _profile;
  bool get isAuthenticated => _status == AuthStatus.client || _status == AuthStatus.technician;
  bool get isClient => _status == AuthStatus.client;
  bool get isTechnician => _status == AuthStatus.technician;

  AuthSession({
    required TokenStore tokenStore,
    required ApiClient apiClient,
  })  : _tokenStore = tokenStore,
        _apiClient = apiClient;

  Future<void> restoreSession() async {
    final role = await _tokenStore.getActiveRole();
    if (role == null) {
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }

    final token = await _tokenStore.getActiveAccessToken();
    if (token == null) {
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }

    _apiClient.setToken(token);
    _apiClient.setRole(role);

    try {
      if (role == 'client') {
        final me = await _apiClient.get('/auth/me');
        _profile = me;
        _status = AuthStatus.client;
      } else {
        final me = await _apiClient.get('/auth/me');
        _profile = me;
        _status = AuthStatus.technician;
      }
    } catch (_) {
      _status = AuthStatus.unauthenticated;
      _apiClient.setToken(null);
    }

    notifyListeners();
  }

  Future<void> loginAsClient(String accessToken, {String? refreshToken}) async {
    await _tokenStore.saveClientTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
    _apiClient.setToken(accessToken);
    _apiClient.setRole('client');
    _status = AuthStatus.client;
    notifyListeners();
  }

  Future<void> loginAsTechnician(String accessToken, {String? refreshToken}) async {
    await _tokenStore.saveTechnicianTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
    _apiClient.setToken(accessToken);
    _apiClient.setRole('technician');
    _status = AuthStatus.technician;
    notifyListeners();
  }

  Future<void> logout() async {
    if (_status == AuthStatus.client) {
      await _tokenStore.clearClientTokens();
    } else if (_status == AuthStatus.technician) {
      await _tokenStore.clearTechnicianTokens();
    }
    _apiClient.setToken(null);
    _profile = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  void handleUnauthorized() {
    _status = AuthStatus.unauthenticated;
    _profile = null;
    _apiClient.setToken(null);
    notifyListeners();
  }
}
