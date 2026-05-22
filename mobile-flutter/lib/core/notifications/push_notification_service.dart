import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

class PushNotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  String? _token;
  String? _role;

  String? get token => _token;

  Future<void> init({required String role}) async {
    _role = role;

    if (Platform.isIOS) {
      await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
    }

    try {
      _token = await _messaging.getToken();
    } catch (_) {}

    _messaging.onTokenRefresh.listen((newToken) {
      _token = newToken;
    });
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

  Stream<RemoteMessage> get onForegroundMessage => FirebaseMessaging.onMessage;

  static Future<void> initFirebase() async {
    await Firebase.initializeApp();
  }
}
