import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
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

/// 美甲师「我的」(MePage)：liquid glass 设计风格，对齐首页/行程/客户/消息页面。
/// 模块：渐变头部（头像 + 姓名 + 接单状态）+ 数据概览 + 工作宫格 + 设置菜单 + 退出。
class TechnicianProfileScreen extends StatefulWidget {
  const TechnicianProfileScreen({super.key});

  @override
  State<TechnicianProfileScreen> createState() =>
      _TechnicianProfileScreenState();
}

class _TechnicianProfileScreenState extends State<TechnicianProfileScreen> {
  TechnicianProfile? _profile;
  bool _loading = true;

  // 统计（后续可从 API 获取）
  int _todayOrders = 0;
  double _monthRevenue = 0;
  int _totalCustomers = 0;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final profile =
          await TechnicianAuthService(context.read<ApiClient>()).getProfile();
      if (mounted) {
        setState(() {
          _profile = profile;
          _loading = false;
        });
        _loadStats();
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadStats() async {
    try {
      final api = context.read<ApiClient>();
      final orders =
          (await api.getList('/orders')).cast<Map<String, dynamic>>();
      if (!mounted) return;
      final now = DateTime.now();
      setState(() {
        _todayOrders = orders.where((o) {
          final d = DateTime.tryParse(o['startTime']?.toString() ?? '');
          return d != null &&
              d.year == now.year &&
              d.month == now.month &&
              d.day == now.day;
        }).length;
        _monthRevenue = orders
            .where((o) {
              final d = DateTime.tryParse(o['startTime']?.toString() ?? '');
              return d != null &&
                  d.year == now.year &&
                  d.month == now.month &&
                  o['status'] == 'completed';
            })
            .fold(0.0,
                (s, o) => s + ((o['totalPrice'] as num?)?.toDouble() ?? 0));
        _totalCustomers = orders
            .map((o) => o['customerId']?.toString())
            .where((id) => id != null && id.isNotEmpty)
            .toSet()
            .length;
      });
    } catch (_) {}
  }

  void _push(Widget screen) {
    HapticFeedback.lightImpact();
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen))
        .then((_) => _loadProfile());
  }

  Future<void> _toggleStatus() async {
    HapticFeedback.mediumImpact();
    final newStatus = _profile?.status == 'active' ? 'inactive' : 'active';
    try {
      await TechnicianAuthService(context.read<ApiClient>())
          .updateStatus(newStatus);
      _loadProfile();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: DT.bg,
        body: Center(child: CircularProgressIndicator(color: DT.primary)),
      );
    }

    final topPad = MediaQuery.of(context).padding.top;
    final bottomPad = MediaQuery.of(context).padding.bottom;
    final active = _profile?.status == 'active';

    return Scaffold(
      backgroundColor: DT.bg,
      body: ListView(
        padding: EdgeInsets.only(bottom: bottomPad + 60),
        children: [
          _profileHeader(topPad, active),
          const SizedBox(height: DT.lg),
          _statsCard(),
          const SizedBox(height: DT.xxl),
          _sectionLabel('工作管理'),
          const SizedBox(height: DT.sm),
          _workGrid(),
          const SizedBox(height: DT.xxl),
          _sectionLabel('设置'),
          const SizedBox(height: DT.sm),
          _settingsCard(),
          const SizedBox(height: DT.xxl),
          _logoutButton(),
        ],
      ),
    );
  }

  // ── Profile Header（深色渐变 + 头像 + 接单状态） ──

  Widget _profileHeader(double topPad, bool active) {
    final name = _profile?.name ?? '';
    final phone = _profile?.phone ?? '';
    final avatarUrl = _profile?.avatarUrl;

    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(DT.xl, topPad + DT.xl, DT.xl, DT.xxl),
      decoration: const BoxDecoration(
        gradient: DT.profileGradient,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(DT.rCard)),
      ),
      child: Column(
        children: [
          // Avatar + name + phone
          Row(
            children: [
              _avatar(avatarUrl, name),
              const SizedBox(width: DT.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('美甲师 \u00B7 $name',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: DT.titleLarge.copyWith(color: Colors.white)),
                    const SizedBox(height: DT.xs),
                    Text(phone,
                        style: DT.bodySmall
                            .copyWith(color: Colors.white.withValues(alpha: 0.7))),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: DT.lg),
          // 接单状态切换
          GestureDetector(
            onTap: _toggleStatus,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: DT.lg, vertical: DT.md),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(DT.lg),
              ),
              child: Row(
                children: [
                  Icon(
                    active
                        ? CupertinoIcons.check_mark_circled_solid
                        : CupertinoIcons.pause_circle,
                    color: DT.surface,
                    size: 20,
                  ),
                  const SizedBox(width: DT.sm),
                  Expanded(
                    child: Text(
                      active ? '接单中 \u00B7 客户可以预约你' : '休息中 \u00B7 暂不接受新预约',
                      style: DT.bodyMedium.copyWith(
                          fontWeight: FontWeight.w600, color: Colors.white),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: DT.md, vertical: DT.xs),
                    decoration: BoxDecoration(
                      color: DT.surface,
                      borderRadius: BorderRadius.circular(DT.rFull),
                    ),
                    child: Text(
                      active ? '休息' : '开工',
                      style: DT.captionLarge.copyWith(
                          fontWeight: FontWeight.w700, color: DT.textPrimary),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Stats Overview Card ──

  Widget _statsCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: DT.xl),
      padding: const EdgeInsets.symmetric(vertical: DT.lg),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          _statItem('今日订单', '$_todayOrders', DT.textPrimary),
          _statDivider(),
          _statItem('本月收入', '\u00A5${_monthRevenue.toStringAsFixed(0)}',
              DT.primary,
              bold: true),
          _statDivider(),
          _statItem('累计客户', '$_totalCustomers', DT.textPrimary),
          _statDivider(),
          _statItem('评分', '4.9', DT.textPrimary),
        ],
      ),
    );
  }

  Widget _statItem(String label, String value, Color valueColor,
      {bool bold = false}) {
    return Expanded(
      child: Column(
        children: [
          Text(label, style: DT.captionLarge.copyWith(color: DT.textTertiary)),
          const SizedBox(height: DT.xs),
          Text(value,
              style: TextStyle(
                fontSize: 16,
                fontWeight: bold ? FontWeight.w700 : FontWeight.w600,
                color: valueColor,
                fontFeatures: const [FontFeature.tabularFigures()],
              )),
        ],
      ),
    );
  }

  Widget _statDivider() {
    return Container(
      width: 0.5,
      height: 28,
      color: DT.divider,
    );
  }

  // ── Section Label ──

  Widget _sectionLabel(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: DT.xl),
      child: Text(text,
          style: DT.titleSmall.copyWith(color: DT.textSecondary)),
    );
  }

  // ── Work Management Grid ──

  Widget _workGrid() {
    final items = <({IconData icon, String label, Color iconColor, VoidCallback onTap})>[
      (icon: CupertinoIcons.doc_text, label: '订单管理', iconColor: DT.actionOrange, onTap: () => _push(const TechnicianOrdersScreen())),
      (icon: CupertinoIcons.person_2, label: '客户管理', iconColor: DT.actionBlue, onTap: () => _push(const TechnicianCustomersScreen())),
      (icon: CupertinoIcons.photo, label: '作品管理', iconColor: DT.primary, onTap: () => _push(const TechnicianWorksScreen())),
      (icon: CupertinoIcons.wrench, label: '服务管理', iconColor: DT.actionGreen, onTap: () => _push(const TechnicianServicesScreen())),
      (icon: CupertinoIcons.car_detailed, label: '上门设置', iconColor: DT.info, onTap: () => _push(const TechnicianHomeServiceSettingsScreen())),
      (icon: CupertinoIcons.bag, label: '店铺管理', iconColor: DT.secondary, onTap: () => _push(const TechnicianShopScreen())),
      (icon: CupertinoIcons.tag, label: '标签管理', iconColor: DT.warning, onTap: () => _push(const TechnicianTagScreen())),
      (icon: CupertinoIcons.person_crop_circle, label: '资料设置', iconColor: DT.primaryDark, onTap: () => _push(const TechnicianProfileSettingsScreen())),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: DT.xl),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: DT.lg, horizontal: DT.sm),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.78),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: GridView.count(
          crossAxisCount: 4,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: DT.sm,
          mainAxisSpacing: DT.sm,
          childAspectRatio: 0.88,
          children: items.map((it) {
            return GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: it.onTap,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: it.iconColor.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(DT.radius12),
                    ),
                    child: Icon(it.icon, color: it.iconColor, size: 22),
                  ),
                  const SizedBox(height: DT.sm),
                  Text(it.label,
                      style: DT.captionLarge
                          .copyWith(color: DT.textPrimary, fontWeight: FontWeight.w500)),
                ],
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  // ── Settings Menu Card ──

  Widget _settingsCard() {
    final items = <({IconData icon, String label, Color iconColor, VoidCallback onTap})>[
      (icon: CupertinoIcons.shield, label: '账号与安全', iconColor: DT.actionOrange, onTap: () => _push(const TechnicianAccountSecurityScreen())),
      (icon: CupertinoIcons.bell, label: '通知设置', iconColor: DT.actionBlue, onTap: () => _push(const TechnicianNotificationSettingsScreen())),
      (icon: CupertinoIcons.lock, label: '隐私设置', iconColor: DT.actionGreen, onTap: () => _push(const TechnicianPrivacySettingsScreen())),
      (icon: CupertinoIcons.question_circle, label: '帮助与反馈', iconColor: DT.primary, onTap: () => _push(const TechnicianHelpFeedbackScreen())),
      (icon: CupertinoIcons.info_circle, label: '关于我们', iconColor: DT.secondary, onTap: () => _push(const TechnicianAboutScreen())),
    ];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: DT.xl),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: List.generate(items.length, (i) {
          final it = items[i];
          return Column(
            children: [
              if (i > 0)
                const Divider(height: 1, indent: 60, color: DT.divider),
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: it.onTap,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: DT.lg, vertical: DT.md),
                    child: Row(
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: it.iconColor.withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(it.icon, color: it.iconColor, size: 18),
                        ),
                        const SizedBox(width: DT.md),
                        Expanded(
                          child: Text(it.label, style: DT.titleSmall),
                        ),
                        const Icon(CupertinoIcons.chevron_right,
                            size: 18, color: DT.textQuaternary),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        }),
      ),
    );
  }

  // ── Logout Button ──

  Widget _logoutButton() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: DT.xl),
      child: SizedBox(
        width: double.infinity,
        height: 48,
        child: OutlinedButton(
          onPressed: () {
            HapticFeedback.mediumImpact();
            context.read<AuthSession>().logout();
          },
          style: OutlinedButton.styleFrom(
            foregroundColor: DT.error,
            side: const BorderSide(color: DT.border),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(DT.radius16)),
          ),
          child: Text('退出登录',
              style: DT.bodyMedium
                  .copyWith(fontWeight: FontWeight.w600, color: DT.error)),
        ),
      ),
    );
  }

  // ── Avatar ──

  Widget _avatar(String? url, String name) {
    if (url != null && url.isNotEmpty) {
      return Container(
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border:
              Border.all(color: Colors.white.withValues(alpha: 0.2), width: 2),
        ),
        child: ClipOval(
          child: CachedNetworkImage(
            imageUrl: url,
            width: 64,
            height: 64,
            fit: BoxFit.cover,
            placeholder: (_, __) => Container(
                width: 64, height: 64, color: DT.primarySoft),
            errorWidget: (_, __, ___) => _avatarFallback(name),
          ),
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border:
            Border.all(color: Colors.white.withValues(alpha: 0.2), width: 2),
      ),
      child: _avatarFallback(name),
    );
  }

  Widget _avatarFallback(String name) {
    return Container(
      width: 64,
      height: 64,
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        color: DT.primarySoft,
        shape: BoxShape.circle,
      ),
      child: Text(
        name.isNotEmpty ? name.substring(0, 1) : '美',
        style: DT.displaySmall.copyWith(color: DT.primary),
      ),
    );
  }
}
