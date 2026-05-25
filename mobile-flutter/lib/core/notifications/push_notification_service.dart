import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

class PushNotificationService {
  FirebaseMessaging? _messaging;
  String? _token;
  String? _role;

  String? get token => _token;

  FirebaseMessaging get _messagingInstance {
    _messaging ??= FirebaseMessaging.instance;
    return _messaging!;
  }

  Future<void> init({required String role}) async {
    _role = role;

    try {
      await Firebase.initializeApp();
    } catch (_) {
      return;
    }

    if (Platform.isIOS) {
      try {
        await _messagingInstance.requestPermission(
          alert: true,
          badge: true,
          sound: true,
        );
      } catch (_) {}
    }

    try {
      _token = await _messagingInstance.getToken();
    } catch (_) {}

    try {
      _messagingInstance.onTokenRefresh.listen((newToken) {
        _token = newToken;
      });
    } catch (_) {}
  }

  Future<void> registerTokenOnServer({
    required String apiBaseUrl,
    required String accessToken,
  }) async {
    if (_token == null || _role == null) return;

    try {
      final uri = Uri.parse('$apiBaseUrl/api/$_role/auth/device-token');
      await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $accessToken',
        },
        body: jsonEncode({
          'token': _token,
          'platform': Platform.isIOS ? 'ios' : 'android',
          'role': _role,
        }),
      );
    } catch (_) {}
  }

  Stream<RemoteMessage>? get onForegroundMessage {
    try {
      return FirebaseMessaging.onMessage;
    } catch (_) {
      return null;
    }
  }

  static Future<void> initFirebase() async {
    await Firebase.initializeApp();
  }
}
