import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../core/api/api_client.dart';
import '../core/auth/auth_session.dart';
import '../core/deeplink/deep_link_service.dart';
import '../core/theme/app_theme.dart';
import '../core/widgets/nb_toast.dart';
import '../features/client/auth/client_auth_service.dart';
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
  final _scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

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

  Future<void> _handleDeepLink(Uri uri) async {
    final params = DeepLinkService.parseInviteLink(uri);
    if (params == null) return;

    final authSession = context.read<AuthSession>();
    final router = GoRouter.of(context);
    final code = params.inviteCode;

    // 未登录：带邀请码进入客户端登录/注册页
    if (!authSession.isClient) {
      router.go(code != null ? '/client/login?inviteCode=$code' : '/client/login');
      return;
    }

    // 已登录客户：有邀请码则尝试绑定该美甲师
    if (code != null) {
      await _bindByInviteCode(code);
    }

    // 作品分享链接：跳转作品详情
    if (params.type == DeepLinkType.work && params.workId != null) {
      router.go('/client/works/${params.workId}');
    }
  }

  Future<void> _bindByInviteCode(String code) async {
    try {
      final service = ClientAuthService(context.read<ApiClient>());
      final tech = await service.findTechnicianByInviteCode(code);
      await service.bindTechnician(techId: tech.id, inviteCode: code);
      if (mounted) NbToast.success(context, '已绑定美甲师 ${tech.name}');
    } catch (_) {
      if (mounted) NbToast.error(context, '邀请码无效或已绑定');
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
          scaffoldMessengerKey: _scaffoldMessengerKey,
          debugShowCheckedModeBanner: false,
        );
      },
    );
  }
}