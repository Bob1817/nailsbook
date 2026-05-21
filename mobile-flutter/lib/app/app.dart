import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api/api_client.dart';
import '../core/auth/auth_session.dart';
import '../core/auth/token_store.dart';
import '../core/theme/app_theme.dart';
import 'router.dart';

class NailBookApp extends StatelessWidget {
  final String apiBaseUrl;

  const NailBookApp({super.key, this.apiBaseUrl = 'http://10.0.2.2:3000'});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<TokenStore>(create: (_) => TokenStore()),
        ProxyProvider<TokenStore, ApiClient>(
          update: (_, tokenStore, __) => ApiClient(
            baseUrl: apiBaseUrl,
            onUnauthorized: () {},
          ),
        ),
        ChangeNotifierProxyProvider2<TokenStore, ApiClient, AuthSession>(
          create: (_) => AuthSession(
            tokenStore: TokenStore(),
            apiClient: ApiClient(baseUrl: apiBaseUrl),
          ),
          update: (_, tokenStore, apiClient, previous) =>
              previous ?? AuthSession(tokenStore: tokenStore, apiClient: apiClient),
        ),
      ],
      child: Consumer<AuthSession>(
        builder: (context, authSession, _) {
          final router = createRouter(authSession);
          return MaterialApp.router(
            title: 'NailBook',
            theme: AppTheme.light,
            routerConfig: router,
            debugShowCheckedModeBanner: false,
          );
        },
      ),
    );
  }
}
