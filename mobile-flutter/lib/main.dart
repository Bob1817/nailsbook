import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'app/app.dart';
import 'core/auth/auth_session.dart';
import 'core/auth/token_store.dart';
import 'core/api/api_client.dart';
import 'core/deeplink/deep_link_service.dart';
import 'core/notifications/push_notification_service.dart';
import 'core/socket/chat_socket.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

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

  await authSession.restoreSession();

  if (authSession.isAuthenticated) {
    chatSocket.configure(baseUrl: apiBaseUrl, token: await tokenStore.getActiveAccessToken() ?? '');
    chatSocket.connect();
  }

  await deepLinkService.init();

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
}