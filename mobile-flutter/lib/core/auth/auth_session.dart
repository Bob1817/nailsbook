import 'dart:async';

import 'package:flutter/foundation.dart';
import '../api/api_client.dart';
import '../config.dart';
import '../notifications/push_notification_service.dart';
import 'token_store.dart';

enum AuthStatus { unknown, unauthenticated, client, technician }

class AuthSession extends ChangeNotifier {
  final TokenStore _tokenStore;
  final ApiClient _apiClient;
  final PushNotificationService? _pushService;

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
    PushNotificationService? pushService,
  })  : _tokenStore = tokenStore,
        _apiClient = apiClient,
        _pushService = pushService;

  /// 登录/恢复会话后，初始化 Firebase 并把设备 token 上报后端。
  /// best-effort：失败不影响登录流程。先 await init 再上报，确保 token 已就绪。
  Future<void> _registerPush(String role, String accessToken) async {
    final push = _pushService;
    if (push == null) return;
    try {
      await push.init(role: role);
      await push.registerTokenOnServer(
        apiBaseUrl: kApiBaseUrl,
        accessToken: accessToken,
      );
    } catch (_) {
      // 推送注册失败不影响登录
    }
  }

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
      unawaited(_registerPush(role, token));
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
    unawaited(_registerPush('client', accessToken));
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
    unawaited(_registerPush('technician', accessToken));
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
    // 仅在已登录态（会话过期）时处理。登录尝试密码错误也会返回 401，
    // 此时若 notifyListeners 会触发路由刷新、重建登录页（输入框被清空、
    // 错误信息丢失），因此未登录态直接忽略，让登录页自行展示错误。
    if (_status != AuthStatus.client && _status != AuthStatus.technician) {
      return;
    }
    _status = AuthStatus.unauthenticated;
    _profile = null;
    _apiClient.setToken(null);
    notifyListeners();
  }
}
