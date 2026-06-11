import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/glass_container.dart';
import '../../../core/widgets/nb_toast.dart';
import '../auth/technician_auth_service.dart';
import '../auth/technician_auth_models.dart';
import '../works/technician_works_screen.dart';
import '../services/technician_services_screen.dart';
import '../customers/technician_tag_screen.dart';
import '../orders/technician_orders_screen.dart';
import '../shop/technician_shop_screen.dart';
import '../schedule/technician_service_time_screen.dart';
import '../home_service/technician_home_service_settings_screen.dart';
import '../settings/technician_profile_settings_screen.dart';
import '../settings/technician_account_security_screen.dart';
import '../settings/technician_notification_settings_screen.dart';
import '../settings/technician_privacy_settings_screen.dart';
import '../help_feedback/technician_help_feedback_screen.dart';
import '../about/technician_about_screen.dart';

const _clientBaseUrl = 'https://m.lunails.cn';

/// 美甲师「我的」(MePage)：对齐 webapp MePage 的信息架构与功能，
/// 以 Flutter liquid glass 设计语言呈现。
/// 模块：头部（头像/姓名/状态卡+工作时间入口）→ 数据概览 → 收入统计
/// → 我的预约（状态宫格）→ 常用工具 → 邀请码分享 → 设置 → 退出登录。
class TechnicianProfileScreen extends StatefulWidget {
  const TechnicianProfileScreen({super.key});

  @override
  State<TechnicianProfileScreen> createState() =>
      _TechnicianProfileScreenState();
}

class _TechnicianProfileScreenState extends State<TechnicianProfileScreen> {
  static const _activeStatuses = {
    'pending_quote',
    'pending_confirm',
    'pending_home',
    'pending_shop',
    'in_progress',
  };

  TechnicianProfile? _profile;
  bool _loading = true;
  bool _uploadingAvatar = false;

  List<Map<String, dynamic>> _orders = const [];
  int _customerCount = 0;

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
      final results = await Future.wait([
        api.getList('/orders'),
        api.getList('/customers'),
      ]);
      if (!mounted) return;
      setState(() {
        _orders = results[0].cast<Map<String, dynamic>>();
        _customerCount = results[1].length;
      });
    } catch (_) {}
  }

  // ── 统计计算（对齐 webapp）──

  double _price(Map<String, dynamic> o) =>
      (o['quotePrice'] as num?)?.toDouble() ??
      (o['price'] as num?)?.toDouble() ??
      0;

  bool _isToday(String? iso) {
    final d = DateTime.tryParse(iso ?? '')?.toLocal();
    if (d == null) return false;
    final n = DateTime.now();
    return d.year == n.year && d.month == n.month && d.day == n.day;
  }

  bool _isThisWeek(String? iso) {
    final d = DateTime.tryParse(iso ?? '')?.toLocal();
    if (d == null) return false;
    final n = DateTime.now();
    final start = DateTime(n.year, n.month, n.day);
    final diff = d.difference(start).inMilliseconds;
    return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000;
  }

  bool _isThisMonth(String? iso) {
    final d = DateTime.tryParse(iso ?? '')?.toLocal();
    if (d == null) return false;
    final n = DateTime.now();
    return d.year == n.year && d.month == n.month;
  }

  int _statusCount(String status) =>
      _orders.where((o) => o['status'] == status).length;

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
    final headerH = topPad + 176;

    return Scaffold(
      backgroundColor: DT.bg,
      body: Stack(
        children: [
          ListView(
            padding: EdgeInsets.fromLTRB(0, headerH + DT.lg, 0, bottomPad + 80),
            children: [
              _dataCard(),
              const SizedBox(height: DT.lg),
              _incomeCard(),
              const SizedBox(height: DT.lg),
              _appointmentsCard(),
              const SizedBox(height: DT.lg),
              _toolsCard(),
              const SizedBox(height: DT.lg),
              _inviteCard(),
              const SizedBox(height: DT.lg),
              _settingsCard(),
              const SizedBox(height: DT.xl),
              _logoutButton(),
            ],
          ),
          Positioned(
            left: 0,
            right: 0,
            top: 0,
            child: _profileHeader(topPad),
          ),
        ],
      ),
    );
  }

  // ── 导航 ──

  void _push(Widget screen) {
    HapticFeedback.lightImpact();
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen))
        .then((_) => _loadProfile());
  }

  void _openBookings([String? status]) {
    HapticFeedback.lightImpact();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => TechnicianOrdersScreen(initialStatusFilter: status),
      ),
    ).then((_) => _loadProfile());
  }

  Future<void> _toggleStatus() async {
    HapticFeedback.mediumImpact();
    final isActive = _profile?.status == 'active';
    final newStatus = isActive ? 'inactive' : 'active';

    // 从休息中切换到接单中时，检查是否至少启用了一种服务类型
    if (!isActive) {
      final homeService = _profile?.homeService == true;
      final shopService = _profile?.shopService == true;
      if (!homeService && !shopService) {
        final result = await _showServiceTypeDialog();
        if (result != true || !mounted) return;
      }
    }

    try {
      final updated = await TechnicianAuthService(context.read<ApiClient>())
          .updateStatus(newStatus);
      if (mounted) setState(() => _profile = updated);
    } catch (_) {
      if (mounted) NbToast.error(context, '状态更新失败');
    }
  }

  /// 强制弹窗：让美甲师选择开启上门/到店服务类型
  Future<bool?> _showServiceTypeDialog() {
    bool home = false;
    bool shop = false;
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: DT.surface,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(DT.rCard)),
          title: Text('请先开启服务类型',
              style: DT.titleMedium.copyWith(color: DT.textPrimary)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('开启接单前，请至少选择一种服务类型',
                  style: DT.bodySmall.copyWith(color: DT.textSecondary)),
              const SizedBox(height: DT.lg),
              _serviceTypeRow(ctx, '上门美甲', CupertinoIcons.location_fill,
                  home, (v) => setDialogState(() => home = v)),
              const SizedBox(height: DT.md),
              _serviceTypeRow(ctx, '到店美甲', CupertinoIcons.house_fill,
                  shop, (v) => setDialogState(() => shop = v)),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text('取消',
                  style: DT.bodyMedium.copyWith(color: DT.textSecondary)),
            ),
            TextButton(
              onPressed: (!home && !shop)
                  ? null
                  : () async {
                      HapticFeedback.mediumImpact();
                      try {
                        final api = context.read<ApiClient>()
                          ..setRole('technician');
                        await TechnicianAuthService(api)
                            .updateServiceType({
                          'homeService': home,
                          'shopService': shop,
                        });
                        if (ctx.mounted) Navigator.pop(ctx, true);
                      } catch (_) {
                        if (ctx.mounted) {
                          NbToast.error(ctx, '保存失败，请重试');
                        }
                      }
                    },
              child: Text('确认',
                  style: DT.bodyMedium.copyWith(
                      color: (!home && !shop)
                          ? DT.textMuted
                          : DT.primary,
                      fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _serviceTypeRow(BuildContext ctx, String label, IconData icon,
      bool value, ValueChanged<bool> onChanged) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        onChanged(!value);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(
            horizontal: DT.md, vertical: DT.sm),
        decoration: BoxDecoration(
          color: value
              ? DT.primarySoft
              : DT.bg.withValues(alpha: 0.72),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Icon(icon,
                size: 20,
                color: value ? DT.primary : DT.textMuted),
            const SizedBox(width: DT.md),
            Expanded(
              child: Text(label,
                  style: DT.titleSmall.copyWith(
                      color: value
                          ? DT.textPrimary
                          : DT.textMuted)),
            ),
            Transform.scale(
              scale: 0.72,
              child: CupertinoSwitch(
                value: value,
                activeTrackColor: DT.primary,
                inactiveTrackColor: DT.bgWarm,
                thumbColor: DT.cream,
                onChanged: (_) {
                  HapticFeedback.selectionClick();
                  onChanged(!value);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── 头部：深色渐变 + 头像 + 姓名 + 状态卡 ──

  Widget _profileHeader(double topPad) {
    final name = _profile?.name ?? '';
    final phone = _profile?.phone ?? '';
    final avatarUrl = _profile?.avatarUrl;
    final active = _profile?.status == 'active';

    return SizedBox(
      width: double.infinity,
      child: GlassContainer(
        tint: Colors.black,
        blur: DT.glassBlurHeavy,
        opacity: 0.5,
        borderRadius: 0,
        showBorder: false,
        padding: EdgeInsets.fromLTRB(DT.xl, topPad + DT.xl, DT.xl, DT.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _avatar(avatarUrl, name),
                const SizedBox(width: DT.lg),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text('美甲师 · ${name.isEmpty ? '小美' : name}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: DT.titleLarge
                                    .copyWith(color: Colors.white)),
                          ),
                          const SizedBox(width: DT.sm),
                          _circleIconButton(
                            CupertinoIcons.settings,
                            () =>
                                _push(const TechnicianProfileSettingsScreen()),
                          ),
                        ],
                      ),
                      const SizedBox(height: DT.xs),
                      Text(phone.isEmpty ? '未绑定手机号' : phone,
                          style: DT.bodySmall.copyWith(
                              color: Colors.white.withValues(alpha: 0.7))),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: DT.lg),
            _statusCard(active),
          ],
        ),
      ),
    );
  }

  Widget _statusCard(bool active) {
    final homeService = _profile?.homeService == true;
    final shopService = _profile?.shopService == true;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: DT.lg, vertical: DT.md),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          // 接单状态（点击切换）
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _toggleStatus,
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: active
                          ? const Color(0xFF6EE7A8)
                          : Colors.white.withValues(alpha: 0.7),
                    ),
                  ),
                  const SizedBox(width: DT.sm),
                  Flexible(
                    child: Text(
                      active ? '当前接单中' : '当前已暂停接单',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: DT.bodyMedium.copyWith(
                          fontWeight: FontWeight.w600, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (homeService) _serviceBadge(CupertinoIcons.location, '上门'),
          if (shopService) ...[
            const SizedBox(width: DT.xs),
            _serviceBadge(CupertinoIcons.house, '到店'),
          ],
          const SizedBox(width: DT.sm),
          _circleIconButton(
            CupertinoIcons.clock,
            () => _push(const TechnicianServiceTimeScreen()),
          ),
        ],
      ),
    );
  }

  Widget _serviceBadge(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: DT.sm, vertical: 3),
      decoration: BoxDecoration(
        color: DT.surface.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(DT.rFull),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: Colors.white.withValues(alpha: 0.9)),
          const SizedBox(width: 3),
          Text(text,
              style: DT.captionSmall
                  .copyWith(color: Colors.white.withValues(alpha: 0.9))),
        ],
      ),
    );
  }

  Widget _circleIconButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        width: 28,
        height: 28,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: DT.surface.withValues(alpha: 0.15),
        ),
        child: Icon(icon, size: 16, color: Colors.white),
      ),
    );
  }

  // ── 数据概览卡（3 列）──

  Widget _dataCard() {
    final todayCount =
        _orders.where((o) => _isToday(o['startTime']?.toString())).length;
    final weekCount =
        _orders.where((o) => _isThisWeek(o['startTime']?.toString())).length;

    return _glassCard(
      padding: const EdgeInsets.symmetric(vertical: DT.lg),
      child: Row(
        children: [
          _dataItem('$todayCount', '今日预约', DT.textPrimary),
          _dataDivider(),
          _dataItem('$weekCount', '本周预约', DT.textPrimary),
          _dataDivider(),
          _dataItem('$_customerCount', '客户总数', DT.primary),
        ],
      ),
    );
  }

  Widget _dataItem(String value, String label, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: color,
                fontFeatures: const [FontFeature.tabularFigures()],
              )),
          const SizedBox(height: DT.xs),
          Text(label, style: DT.captionLarge.copyWith(color: DT.textTertiary)),
        ],
      ),
    );
  }

  Widget _dataDivider() => Container(width: 0.5, height: 32, color: DT.divider);

  // ── 收入统计卡（2x2）──

  Widget _incomeCard() {
    final todayActive =
        _orders.where((o) => _isToday(o['startTime']?.toString()));
    final todayIncome = todayActive
        .where((o) => o['status'] == 'completed')
        .fold<double>(0, (s, o) => s + _price(o));
    final expectedIncome = todayActive
        .where((o) => _activeStatuses.contains(o['status']))
        .fold<double>(0, (s, o) => s + _price(o));
    final monthRevenue = _orders
        .where((o) => _isThisMonth(o['startTime']?.toString()))
        .fold<double>(0, (s, o) => s + _price(o));
    final completedCount =
        _orders.where((o) => o['status'] == 'completed').length;

    return _glassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _cardHeader('收入统计', trailing: '按当前预约数据汇总'),
          const SizedBox(height: DT.md),
          Row(
            children: [
              Expanded(
                  child: _incomeTile(
                      '今日已完成收入', '¥${todayIncome.toStringAsFixed(0)}',
                      highlight: true)),
              const SizedBox(width: DT.md),
              Expanded(
                  child: _incomeTile(
                      '今日预计收入', '¥${expectedIncome.toStringAsFixed(0)}')),
            ],
          ),
          const SizedBox(height: DT.md),
          Row(
            children: [
              Expanded(
                  child: _incomeTile(
                      '本月预约金额', '¥${monthRevenue.toStringAsFixed(0)}')),
              const SizedBox(width: DT.md),
              Expanded(
                  child: _incomeTile('累计完成单量', '$completedCount',
                      highlight: true)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _incomeTile(String label, String value, {bool highlight = false}) {
    return Container(
      padding: const EdgeInsets.all(DT.md),
      decoration: BoxDecoration(
        color: highlight ? DT.primarySoft : DT.bg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
            color: highlight
                ? DT.primary.withValues(alpha: 0.12)
                : Colors.black.withValues(alpha: 0.03)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: DT.captionLarge.copyWith(color: DT.textTertiary)),
          const SizedBox(height: DT.xs),
          Text(value,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.5,
                color: highlight ? DT.primary : DT.textPrimary,
                fontFeatures: const [FontFeature.tabularFigures()],
              )),
        ],
      ),
    );
  }

  // ── 我的预约（状态宫格 5 列）──

  Widget _appointmentsCard() {
    final items = <({IconData icon, String label, String status})>[
      (
        icon: CupertinoIcons.chat_bubble_text,
        label: '待报价',
        status: 'pending_quote'
      ),
      (icon: CupertinoIcons.clock, label: '待确认', status: 'pending_confirm'),
      (icon: CupertinoIcons.location, label: '待上门', status: 'pending_home'),
      (icon: CupertinoIcons.house, label: '待到店', status: 'pending_shop'),
      (
        icon: CupertinoIcons.checkmark_seal,
        label: '服务中',
        status: 'in_progress'
      ),
    ];

    return _glassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _cardHeader('我的预约',
              actionLabel: '全部预约', onAction: () => _openBookings()),
          const SizedBox(height: DT.md),
          Row(
            children: items.map((it) {
              final count = _statusCount(it.status);
              return Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => _openBookings(it.status),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: Column(
                      children: [
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: DT.surface,
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.04),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Icon(it.icon, size: 19, color: DT.primary),
                            ),
                            if (count > 0)
                              Positioned(
                                right: -4,
                                top: -4,
                                child: Container(
                                  constraints: const BoxConstraints(
                                      minWidth: 16, minHeight: 16),
                                  padding:
                                      const EdgeInsets.symmetric(horizontal: 4),
                                  alignment: Alignment.center,
                                  decoration: const BoxDecoration(
                                    color: DT.error,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Text('$count',
                                      style: const TextStyle(
                                          fontSize: 10,
                                          color: Colors.white,
                                          fontWeight: FontWeight.w600)),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: DT.xs),
                        Text(it.label,
                            style: DT.captionMedium
                                .copyWith(color: DT.textSecondary)),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  // ── 常用工具（4 列宫格）──

  Widget _toolsCard() {
    final items = <({IconData icon, String label, VoidCallback onTap})>[
      (
        icon: CupertinoIcons.square_grid_2x2,
        label: '服务管理',
        onTap: () => _push(const TechnicianServicesScreen())
      ),
      (
        icon: CupertinoIcons.money_yen_circle,
        label: '价格设置',
        onTap: () => NbToast.info(context, '价格设置即将上线')
      ),
      (
        icon: CupertinoIcons.location,
        label: '上门设置',
        onTap: () => _push(const TechnicianHomeServiceSettingsScreen())
      ),
      (
        icon: CupertinoIcons.house,
        label: '店铺管理',
        onTap: () => _push(const TechnicianShopScreen())
      ),
      (
        icon: CupertinoIcons.photo,
        label: '作品管理',
        onTap: () => _push(const TechnicianWorksScreen())
      ),
      (
        icon: CupertinoIcons.tag,
        label: '标签管理',
        onTap: () => _push(const TechnicianTagScreen())
      ),
      (
        icon: CupertinoIcons.star,
        label: '评价管理',
        onTap: () => NbToast.info(context, '评价管理即将上线')
      ),
    ];

    return _glassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _cardHeader('常用工具', trailing: '常用配置入口'),
          const SizedBox(height: DT.sm),
          LayoutBuilder(
            builder: (context, constraints) {
              final tileWidth = (constraints.maxWidth - DT.sm * 3) / 4;
              return Wrap(
                spacing: DT.sm,
                runSpacing: 10,
                children: items
                    .map((it) => _toolTile(
                          width: tileWidth,
                          icon: it.icon,
                          label: it.label,
                          onTap: it.onTap,
                        ))
                    .toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _toolTile({
    required double width,
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: SizedBox(
        width: width,
        height: 68,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: DT.primarySoft,
                borderRadius: BorderRadius.circular(13),
              ),
              child: Icon(icon, size: 19, color: DT.primary),
            ),
            const SizedBox(height: 5),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: DT.captionMedium.copyWith(color: DT.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  // ── 邀请码分享 ──

  Widget _inviteCard() {
    final code = _profile?.invitationCode;
    final hasCode = code != null && code.isNotEmpty;
    final link = hasCode
        ? '$_clientBaseUrl/invite?invite_code=${Uri.encodeComponent(code)}'
        : '';

    return _glassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('邀请码分享', style: DT.titleMedium),
                    const SizedBox(height: DT.xs),
                    Text('把邀请码或链接发给客户，客户可直接进入绑定流程。',
                        style:
                            DT.captionLarge.copyWith(color: DT.textTertiary)),
                  ],
                ),
              ),
              const SizedBox(width: DT.md),
              GestureDetector(
                onTap: () => _copy(code, '邀请码已复制'),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: DT.md, vertical: DT.xs),
                  decoration: BoxDecoration(
                    color: DT.primarySoft,
                    borderRadius: BorderRadius.circular(DT.rFull),
                  ),
                  child: Text('邀请客户',
                      style: DT.captionLarge.copyWith(
                          color: DT.primary, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
          const SizedBox(height: DT.md),
          Container(
            padding: const EdgeInsets.all(DT.md),
            decoration: BoxDecoration(
              color: DT.primarySoft.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              children: [
                _inviteRow(
                  '邀请码',
                  hasCode ? code : '暂未生成',
                  bold: true,
                  letterSpacing: 3,
                  onCopy: hasCode ? () => _copy(code, '邀请码已复制') : null,
                ),
                const SizedBox(height: DT.sm),
                _inviteRow(
                  '分享链接',
                  hasCode ? link : '暂无可用分享链接',
                  color: hasCode ? DT.primary : DT.textTertiary,
                  onCopy: hasCode ? () => _copy(link, '分享链接已复制') : null,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _inviteRow(String label, String value,
      {bool bold = false,
      double letterSpacing = 0,
      Color? color,
      VoidCallback? onCopy}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: DT.md, vertical: DT.md),
      decoration: BoxDecoration(
        color: DT.surface,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: DT.captionLarge.copyWith(color: DT.textQuaternary)),
                const SizedBox(height: 2),
                Text(value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: bold ? 18 : 14,
                      height: 1.4,
                      fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                      letterSpacing: letterSpacing,
                      color: color ?? DT.textPrimary,
                    )),
              ],
            ),
          ),
          if (onCopy != null)
            GestureDetector(
              onTap: onCopy,
              child: Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: DT.primarySoft,
                ),
                child: const Icon(CupertinoIcons.doc_on_doc,
                    size: 16, color: DT.primary),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _copy(String? text, String message) async {
    if (text == null || text.isEmpty) return;
    HapticFeedback.lightImpact();
    await Clipboard.setData(ClipboardData(text: text));
    if (mounted) NbToast.success(context, message);
  }

  // ── 设置菜单 ──

  Widget _settingsCard() {
    final items =
        <({IconData icon, String label, Color color, VoidCallback onTap})>[
      (
        icon: CupertinoIcons.shield,
        label: '账号与安全',
        color: DT.actionOrange,
        onTap: () => _push(const TechnicianAccountSecurityScreen())
      ),
      (
        icon: CupertinoIcons.bell,
        label: '通知设置',
        color: DT.actionBlue,
        onTap: () => _push(const TechnicianNotificationSettingsScreen())
      ),
      (
        icon: CupertinoIcons.lock,
        label: '隐私设置',
        color: DT.actionGreen,
        onTap: () => _push(const TechnicianPrivacySettingsScreen())
      ),
      (
        icon: CupertinoIcons.question_circle,
        label: '帮助与反馈',
        color: DT.primary,
        onTap: () => _push(const TechnicianHelpFeedbackScreen())
      ),
      (
        icon: CupertinoIcons.info_circle,
        label: '关于我们',
        color: DT.secondary,
        onTap: () => _push(const TechnicianAboutScreen())
      ),
    ];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: DT.xl),
      decoration: BoxDecoration(
        color: DT.surface.withValues(alpha: 0.78),
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
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(DT.lg, DT.lg, DT.lg, DT.sm),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('设置', style: DT.titleMedium),
                  const SizedBox(height: DT.xs),
                  Text('账号、服务类型与常用偏好入口',
                      style: DT.captionLarge.copyWith(color: DT.textTertiary)),
                ],
              ),
            ),
          ),
          ...List.generate(items.length, (i) {
            final it = items[i];
            return Column(
              children: [
                const Divider(height: 1, indent: 56, color: DT.divider),
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      it.onTap();
                    },
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
                              color: it.color.withValues(alpha: 0.10),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(it.icon, color: it.color, size: 18),
                          ),
                          const SizedBox(width: DT.md),
                          Expanded(child: Text(it.label, style: DT.titleSmall)),
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
        ],
      ),
    );
  }

  // ── 退出登录 ──

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

  // ── 复用：玻璃卡片 + 卡片头 ──

  Widget _glassCard({required Widget child, EdgeInsets? padding}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: DT.xl),
      padding: padding ?? const EdgeInsets.all(DT.lg),
      decoration: BoxDecoration(
        color: DT.surface.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _cardHeader(String title,
      {String? trailing, String? actionLabel, VoidCallback? onAction}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: DT.titleMedium),
        if (actionLabel != null)
          GestureDetector(
            onTap: onAction,
            child: Text(actionLabel,
                style: DT.captionLarge
                    .copyWith(color: DT.primary, fontWeight: FontWeight.w600)),
          )
        else if (trailing != null)
          Text(trailing,
              style: DT.captionLarge.copyWith(color: DT.textQuaternary)),
      ],
    );
  }

  // ── 头像（点击上传）──

  Future<void> _pickAndUploadAvatar() async {
    if (_uploadingAvatar) return;
    HapticFeedback.lightImpact();
    final api = context.read<ApiClient>();
    final picker = ImagePicker();
    final file =
        await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (file == null) return;

    setState(() => _uploadingAvatar = true);
    try {
      api.setRole('technician');
      final res =
          await api.uploadMultipart('/uploads/image', file.path, 'file');
      final body = await res.stream.bytesToString();
      final url = _extractUrl(body);
      if (url != null && url.isNotEmpty) {
        final updated =
            await TechnicianAuthService(api).updateProfile({'avatarUrl': url});
        if (mounted) setState(() => _profile = updated);
        if (mounted) NbToast.success(context, '头像更新成功');
      }
    } catch (_) {
      if (mounted) NbToast.error(context, '头像上传失败');
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  String? _extractUrl(String body) {
    final match = RegExp(r'"url"\s*:\s*"([^"]+)"').firstMatch(body);
    return match?.group(1)?.replaceAll(r'\/', '/');
  }

  Widget _avatar(String? url, String name) {
    final hasImage = url != null && url.isNotEmpty;
    return GestureDetector(
      onTap: _pickAndUploadAvatar,
      child: Stack(
        children: [
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                  color: DT.surface.withValues(alpha: 0.2), width: 2),
            ),
            child: ClipOval(
              child: hasImage
                  ? CachedNetworkImage(
                      imageUrl: url,
                      width: 64,
                      height: 64,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(
                          width: 64, height: 64, color: DT.primarySoft),
                      errorWidget: (_, __, ___) => _avatarFallback(name),
                    )
                  : _avatarFallback(name),
            ),
          ),
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: 20,
              height: 20,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.black.withValues(alpha: 0.4),
              ),
              child: _uploadingAvatar
                  ? const SizedBox(
                      width: 10,
                      height: 10,
                      child: CircularProgressIndicator(
                          strokeWidth: 1.5, color: Colors.white))
                  : const Icon(CupertinoIcons.camera,
                      size: 11, color: Colors.white),
            ),
          ),
        ],
      ),
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
