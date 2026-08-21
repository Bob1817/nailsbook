import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'app/app.dart';
import 'firebase_options.dart';
import 'core/config.dart';
import 'core/observability/app_log.dart';
import 'core/auth/auth_session.dart';
import 'core/auth/token_store.dart';
import 'core/api/api_client.dart';
import 'core/deeplink/deep_link_service.dart';
import 'core/notifications/push_notification_service.dart';
import 'core/socket/chat_socket.dart';

void main() {
  // 用 zone 捕获未处理异步错误并上报 Crashlytics（线上可观测）。
  runZonedGuarded(_run, (error, stack) {
    if (kDebugMode) debugPrint('[uncaught] $error\n$stack');
    FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
  });
}

/// 初始化 Firebase 并接管 Flutter/平台层错误上报。失败不阻断启动。
Future<void> _initCrashlytics() async {
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform);
    }
    FlutterError.onError =
        FirebaseCrashlytics.instance.recordFlutterFatalError;
    PlatformDispatcher.instance.onError = (error, stack) {
      FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
      return true;
    };
  } catch (_) {
    // Firebase/Crashlytics 初始化失败不应阻断启动。
  }
}

Future<void> _run() async {
  WidgetsFlutterBinding.ensureInitialized();

  await _initCrashlytics();

  const apiBaseUrl = kApiBaseUrl;

  final tokenStore = TokenStore();
  final apiClient = ApiClient(
    baseUrl: apiBaseUrl,
    onUnauthorized: () {},
  );
  final pushNotificationService = PushNotificationService();
  final authSession = AuthSession(
    tokenStore: tokenStore,
    apiClient: apiClient,
    pushService: pushNotificationService,
  );
  final chatSocket = ChatSocket();
  final deepLinkService = DeepLinkService();

  apiClient.onUnauthorized = authSession.handleUnauthorized;

  runApp(
    MultiProvider(
      providers: [
        Provider<TokenStore>.value(value: tokenStore),
        Provider<ApiClient>.value(value: apiClient),
        ChangeNotifierProvider<AuthSession>.value(value: authSession),
        Provider<ChatSocket>.value(value: chatSocket),
        Provider<DeepLinkService>.value(value: deepLinkService),
        Provider<PushNotificationService>.value(value: pushNotificationService),
      ],
      child: NailBookApp(
        apiBaseUrl: apiBaseUrl,
        deepLinkService: deepLinkService,
      ),
    ),
  );

  unawaited(_bootstrapAfterFirstFrame(
    authSession: authSession,
    tokenStore: tokenStore,
    chatSocket: chatSocket,
    deepLinkService: deepLinkService,
    apiBaseUrl: apiBaseUrl,
  ));
}

Future<void> _bootstrapAfterFirstFrame({
  required AuthSession authSession,
  required TokenStore tokenStore,
  required ChatSocket chatSocket,
  required DeepLinkService deepLinkService,
  required String apiBaseUrl,
}) async {
  try {
    await authSession.restoreSession().timeout(const Duration(seconds: 8));
  } catch (_) {
    authSession.handleUnauthorized();
  }

  if (authSession.isAuthenticated) {
    final token = await tokenStore.getActiveAccessToken();
    if (token != null && token.isNotEmpty) {
      chatSocket.configure(baseUrl: apiBaseUrl, token: token);
      chatSocket.connect();
    }
  }

  try {
    await deepLinkService.init().timeout(const Duration(seconds: 4));
  } catch (e, st) {
    AppLog.error(e, st, 'deepLink init');
  }
}
