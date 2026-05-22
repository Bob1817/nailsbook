import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../core/auth/auth_session.dart';
import '../core/deeplink/deep_link_service.dart';
import '../core/theme/app_theme.dart';
import 'router.dart';

class NailBookApp extends StatefulWidget {
  final String apiBaseUrl;
  final DeepLinkService deepLinkService;

  const NailBookApp({super.key, this.apiBaseUrl = 'http://10.0.2.2:3000', required this.deepLinkService});

  @override
  State<NailBookApp> createState() => _NailBookAppState();
}

class _NailBookAppState extends State<NailBookApp> {
  StreamSubscription<Uri>? _deepLinkSub;

  @override
  void initState() {
    super.initState();
    _handleInitialDeepLink();
    _deepLinkSub = widget.deepLinkService.onLink.listen(_handleDeepLink);
  }

  @override
  void dispose() {
    _deepLinkSub?.cancel();
    super.dispose();
  }

  void _handleInitialDeepLink() {
    final link = widget.deepLinkService.initialLink;
    if (link != null) {
      _handleDeepLink(link);
    }
  }

  void _handleDeepLink(Uri uri) {
    final params = DeepLinkService.parseInviteLink(uri);
    if (params != null && params.type == DeepLinkType.invite) {
      final authSession = context.read<AuthSession>();
      if (authSession.isClient) {
        GoRouter.of(context).go('/client/login');
      } else {
        GoRouter.of(context).go('/client/login');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthSession>(
      builder: (context, authSession, _) {
        final router = createRouter(authSession);
        return MaterialApp.router(
          title: 'NailBook',
          theme: AppTheme.light,
          routerConfig: router,
          debugShowCheckedModeBanner: false,
        );
      },
    );
  }
}