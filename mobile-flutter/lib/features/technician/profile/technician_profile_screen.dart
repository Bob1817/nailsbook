import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/technician_auth_service.dart';
import '../auth/technician_auth_models.dart';
import '../works/technician_works_screen.dart';
import '../services/technician_services_screen.dart';
import '../customers/technician_customers_screen.dart';
import '../customers/technician_tag_screen.dart';
import '../orders/technician_orders_screen.dart';
import '../shop/technician_shop_screen.dart';
import '../home_service/technician_home_service_settings_screen.dart';
import '../settings/technician_profile_settings_screen.dart';
import '../settings/technician_account_security_screen.dart';
import '../settings/technician_notification_settings_screen.dart';
import '../settings/technician_privacy_settings_screen.dart';
import '../help_feedback/technician_help_feedback_screen.dart';
import '../about/technician_about_screen.dart';

/// 美甲师「我的」(MePage)：资料头部 + 接单状态 + 功能宫格 + 设置项。
/// 对齐 webapp technician-frontend/src/pages/MePage.tsx，使用 Flutter 设计系统。
class TechnicianProfileScreen extends StatefulWidget {
  const TechnicianProfileScreen({super.key});

  @override
  State<TechnicianProfileScreen> createState() => _TechnicianProfileScreenState();
}

class _TechnicianProfileScreenState extends State<TechnicianProfileScreen> {
  TechnicianProfile? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final profile = await TechnicianAuthService(context.read<ApiClient>()).getProfile();
      if (mounted) setState(() { _profile = profile; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _push(Widget screen) {
    HapticFeedback.lightImpact();
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen)).then((_) => _loadProfile());
  }

  Future<void> _toggleStatus() async {
    HapticFeedback.mediumImpact();
    final newStatus = _profile?.status == 'active' ? 'inactive' : 'active';
    try {
      await TechnicianAuthService(context.read<ApiClient>()).updateStatus(newStatus);
      _loadProfile();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(backgroundColor: DT.bg, body: Center(child: CircularProgressIndicator(color: DT.primary)));

    final active = _profile?.status == 'active';

    return Scaffold(
      backgroundColor: DT.bg,
      body: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          _header(active),
          _sectionTitle('工作管理'),
          _grid([
            (CupertinoIcons.doc_text, '订单管理', () => _push(const TechnicianOrdersScreen())),
            (CupertinoIcons.person_2, '客户管理', () => _push(const TechnicianCustomersScreen())),
            (CupertinoIcons.photo, '作品管理', () => _push(const TechnicianWorksScreen())),
            (CupertinoIcons.wrench, '服务管理', () => _push(const TechnicianServicesScreen())),
            (CupertinoIcons.car_detailed, '上门设置', () => _push(const TechnicianHomeServiceSettingsScreen())),
            (CupertinoIcons.bag, '店铺管理', () => _push(const TechnicianShopScreen())),
            (CupertinoIcons.tag, '标签管理', () => _push(const TechnicianTagScreen())),
            (CupertinoIcons.person_crop_circle, '资料设置', () => _push(const TechnicianProfileSettingsScreen())),
          ]),
          _sectionTitle('设置'),
          _menuCard([
            (CupertinoIcons.shield, '账号与安全', () => _push(const TechnicianAccountSecurityScreen())),
            (CupertinoIcons.bell, '通知设置', () => _push(const TechnicianNotificationSettingsScreen())),
            (CupertinoIcons.lock, '隐私设置', () => _push(const TechnicianPrivacySettingsScreen())),
            (CupertinoIcons.question_circle, '帮助与反馈', () => _push(const TechnicianHelpFeedbackScreen())),
            (CupertinoIcons.info_circle, '关于我们', () => _push(const TechnicianAboutScreen())),
          ]),
          Padding(
            padding: const EdgeInsets.fromLTRB(DT.lg, DT.xxl, DT.lg, DT.sm),
            child: SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton(
                onPressed: () {
                  HapticFeedback.mediumImpact();
                  context.read<AuthSession>().logout();
                },
                style: OutlinedButton.styleFrom(foregroundColor: DT.error, side: const BorderSide(color: DT.border)),
                child: Text('退出登录', style: DT.bodyMedium.copyWith(fontWeight: FontWeight.w600, color: DT.error)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _header(bool active) {
    final name = _profile?.name ?? '';
    final phone = _profile?.phone ?? '';
    final avatarUrl = _profile?.avatarUrl;
    final topPad = MediaQuery.of(context).padding.top;
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(DT.xl, topPad + DT.xl, DT.xl, DT.xxl),
      decoration: const BoxDecoration(
        gradient: DT.profileGradient,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(DT.rCard)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white.withValues(alpha: 0.2), width: 2)),
                child: CircleAvatar(
                  radius: 32,
                  backgroundColor: DT.surface,
                  backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                  child: avatarUrl == null
                      ? Text(name.isNotEmpty ? name.substring(0, 1) : '?', style: DT.displaySmall.copyWith(color: DT.textPrimary))
                      : null,
                ),
              ),
              const SizedBox(width: DT.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('美甲师 \u00B7 $name',
                        maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: DT.titleLarge.copyWith(color: Colors.white)),
                    const SizedBox(height: DT.xs),
                    Text(phone, style: DT.bodySmall.copyWith(color: Colors.white.withValues(alpha: 0.7))),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: DT.lg),
          // 接单状态切换
          GestureDetector(
            onTap: _toggleStatus,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: DT.lg, vertical: DT.md),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(DT.lg)),
              child: Row(
                children: [
                  Icon(active ? CupertinoIcons.check_mark_circled_solid : CupertinoIcons.pause_circle, color: DT.surface, size: 20),
                  const SizedBox(width: DT.sm),
                  Expanded(
                    child: Text(active ? '接单中 \u00B7 客户可以预约你' : '休息中 \u00B7 暂不接受新预约',
                        style: DT.bodyMedium.copyWith(fontWeight: FontWeight.w600, color: Colors.white)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: DT.md, vertical: DT.xs),
                    decoration: BoxDecoration(color: DT.surface, borderRadius: BorderRadius.circular(DT.rFull)),
                    child: Text(active ? '休息' : '开工',
                        style: DT.captionLarge.copyWith(fontWeight: FontWeight.w700, color: DT.textPrimary)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String t) => Padding(
        padding: EdgeInsets.fromLTRB(DT.xl, DT.xl, DT.xl, DT.sm),
        child: Text(t, style: DT.titleMedium.copyWith(color: DT.textSecondary)),
      );

  Widget _grid(List<(IconData, String, VoidCallback)> items) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: DT.lg),
      child: GridView.count(
        crossAxisCount: 4,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: DT.sm,
        mainAxisSpacing: DT.sm,
        childAspectRatio: 0.92,
        children: items.map((it) => GestureDetector(
          onTap: it.$3,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 48, height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: DT.primarySoft,
                  borderRadius: BorderRadius.circular(DT.radius12),
                ),
                child: Icon(it.$1, color: DT.primary, size: 23),
              ),
              SizedBox(height: DT.sm),
              Text(it.$2, style: DT.captionLarge.copyWith(color: DT.textPrimary)),
            ],
          ),
        )).toList(),
      ),
    );
  }

  Widget _menuCard(List<(IconData, String, VoidCallback)> items) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: DT.lg),
      decoration: BoxDecoration(
        color: DT.surface,
        borderRadius: BorderRadius.circular(DT.radius16),
        border: Border.all(color: DT.border),
        boxShadow: DT.shadowTile,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: List.generate(items.length, (i) {
          final it = items[i];
          return Column(
            children: [
              if (i > 0) const Divider(height: 1, indent: 56, color: DT.divider),
              Material(
                type: MaterialType.transparency,
                child: ListTile(
                  leading: Container(
                    width: 34, height: 34,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: DT.primarySoft, borderRadius: BorderRadius.circular(10)),
                    child: Icon(it.$1, color: DT.primary, size: 19),
                  ),
                  title: Text(it.$2, style: DT.titleSmall),
                  trailing: const Icon(CupertinoIcons.chevron_right, size: 20, color: DT.textQuaternary),
                  onTap: it.$3,
                ),
              ),
            ],
          );
        }),
      ),
    );
  }
}
