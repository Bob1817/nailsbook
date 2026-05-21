import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'app/app.dart';
import 'core/auth/auth_session.dart';
import 'core/auth/token_store.dart';
import 'core/api/api_client.dart';

void main() {
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

  apiClient.onUnauthorized = authSession.handleUnauthorized;

  runApp(
    MultiProvider(
      providers: [
        Provider<TokenStore>.value(value: tokenStore),
        Provider<ApiClient>.value(value: apiClient),
        ChangeNotifierProvider<AuthSession>.value(value: authSession),
      ],
      child: const NailBookApp(apiBaseUrl: apiBaseUrl),
    ),
  );
}
