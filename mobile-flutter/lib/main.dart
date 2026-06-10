import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'app/app.dart';
import 'core/config.dart';
import 'core/auth/auth_session.dart';
import 'core/auth/token_store.dart';
import 'core/api/api_client.dart';
import 'core/deeplink/deep_link_service.dart';
import 'core/notifications/push_notification_service.dart';
import 'core/socket/chat_socket.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  const apiBaseUrl = kApiBaseUrl;

  final tokenStore = TokenStore();
  final apiClient = ApiClient(
    baseUrl: apiBaseUrl,
    onUnauthorized: () {},
  );
  final authSession = AuthSession(
    tokenStore: tokenStore,
    apiClient: apiClient,
  );
  final chatSocket = ChatSocket();
  final deepLinkService = DeepLinkService();
  final pushNotificationService = PushNotificationService();

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
  } catch (_) {}
}
