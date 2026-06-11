import 'dart:ui' show FontFeature;

import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/api/api_client.dart';
import '../../../core/maps/map_service.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/glass_container.dart';
import '../../../core/widgets/nb_toast.dart';
import '../../../core/widgets/technician_glass_header.dart';
import '../auth/technician_auth_service.dart';
import '../schedule/technician_schedule_screen.dart';
import '../orders/technician_orders_screen.dart';
import '../orders/technician_order_service.dart';
import '../orders/technician_order_detail_screen.dart';
import '../customers/technician_customers_screen.dart';
import '../../shared/chat/chat_service.dart';
import '../messages/technician_messages_screen.dart';
import '../works/technician_works_screen.dart';
import '../works/technician_work_service.dart';
import '../works/technician_work_detail_screen.dart';
import '../profile/technician_profile_screen.dart';
import '../profile/technician_profile_completion_screen.dart';

class TechnicianHomeScreen extends StatefulWidget {
  const TechnicianHomeScreen({super.key});

  @override
  State<TechnicianHomeScreen> createState() => _TechnicianHomeScreenState();
}

class _TechnicianHomeScreenState extends State<TechnicianHomeScreen> {
  int _currentIndex = 0;
  Map<String, dynamic>? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final apiClient = context.read<ApiClient>();
      final data = await apiClient.get('/auth/me');
      if (mounted) {
        setState(() {
          _profile = data;
          _loading = false;
        });
        _maybePromptProfileCompletion(data);
      }
    } catch (_) {
      if (mounted)
        setState(() {
          _loading = false;
        });
    }
  }

  /// 缺少 province/city 时强制完善（对齐 webapp ProtectedRoute 守卫）。
  void _maybePromptProfileCompletion(Map<String, dynamic> data) {
    final province = (data['province'] as String?)?.trim() ?? '';
    final city = (data['city'] as String?)?.trim() ?? '';
    if (province.isNotEmpty && city.isNotEmpty) return;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      final done = await Navigator.push<bool>(
        context,
        MaterialPageRoute(
          builder: (_) => TechnicianProfileCompletionScreen(
            initialProvince: province.isEmpty ? null : province,
            initialCity: city.isEmpty ? null : city,
          ),
        ),
      );
      if (done == true && mounted) _loadProfile();
    });
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      _TechnicianHomeTabPage(
          profile: _profile, loading: _loading, onRefresh: _loadProfile),
      const TechnicianScheduleScreen(),
      const TechnicianCustomersScreen(),
      const TechnicianMessagesScreen(),
      const TechnicianProfileScreen(),
    ];

    return Scaffold(
      extendBody: true,
      body: IndexedStack(index: _currentIndex, children: pages),
      bottomNavigationBar: _TechGlassTabBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
      ),
    );
  }
}

/// 美甲师端浮动玻璃导航（与客户端一致的材质，工具型 5 tab）。
class _TechGlassTabBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const _TechGlassTabBar({required this.currentIndex, required this.onTap});

  static const _items = <(IconData, IconData, String)>[
    (CupertinoIcons.house_fill, CupertinoIcons.house, '首页'),
    (CupertinoIcons.calendar, CupertinoIcons.calendar, '行程'),
    (CupertinoIcons.person_2_fill, CupertinoIcons.person_2, '客户'),
    (CupertinoIcons.chat_bubble_fill, CupertinoIcons.chat_bubble, '消息'),
    (CupertinoIcons.person_fill, CupertinoIcons.person, '我的'),
  ];

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).padding.bottom;
    final bottomGap = (bottomInset * 0.4).clamp(8.0, 16.0);
    return Padding(
      padding: EdgeInsets.fromLTRB(DT.lg, 0, DT.lg, bottomGap),
      child: GlassContainer(
        tint: TechnicianGlassHeader.glassTint,
        blur: TechnicianGlassHeader.glassBlur,
        opacity: TechnicianGlassHeader.glassOpacity,
        borderRadius: 28,
        showBorder: true,
        boxShadow: const [
          BoxShadow(
            color: Color(0x66000000),
            blurRadius: 28,
            offset: Offset(0, 10),
          ),
        ],
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: DT.sm, horizontal: 2),
          child: Row(
            children: List.generate(_items.length, (i) => _tab(i)),
          ),
        ),
      ),
    );
  }

  Widget _tab(int i) {
    final item = _items[i];
    final active = i == currentIndex;
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          HapticFeedback.lightImpact();
          onTap(i);
        },
        child: SizedBox(
          height: 52,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(active ? item.$1 : item.$2,
                  size: 23, color: active ? DT.primary : DT.textSecondary),
              SizedBox(height: DT.xs),
              Text(item.$3,
                  style: TextStyle(
                    fontSize: DT.captionMedium.fontSize,
                    fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                    color: active ? DT.primary : DT.textSecondary,
                  )),
              SizedBox(height: DT.xs),
              Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                    color: active ? DT.primary : Colors.transparent,
                    shape: BoxShape.circle),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 美甲师工作台首页 —— 一比一对齐 webapp HomePage 的功能模块与布局：
/// 头部问候 → 下一单 → 待处理事项 → 今日行程 → 今日热门作品 → 分享名片。
class _TechnicianHomeTabPage extends StatefulWidget {
  final Map<String, dynamic>? profile;
  final bool loading;
  final Future<void> Function() onRefresh;

  const _TechnicianHomeTabPage(
      {this.profile, this.loading = true, required this.onRefresh});

  @override
  State<_TechnicianHomeTabPage> createState() => _TechnicianHomeTabPageState();
}

class _TechnicianHomeTabPageState extends State<_TechnicianHomeTabPage> {
  static const _activeStatuses = {
    'pending_quote',
    'pending_agree',
    'pending_confirm',
    'pending_home',
    'pending_shop',
    'in_progress'
  };

  List<Map<String, dynamic>> _orders = [];
  List<Map<String, dynamic>> _works = [];
  int _unread = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final api = context.read<ApiClient>();
      final results = await Future.wait([
        TechnicianOrderService(api).list(),
        ChatService(api).conversations(),
        TechnicianWorkService(api).list(),
      ]);
      final orders = (results[0] as List).cast<Map<String, dynamic>>();
      final convs = (results[1] as List).cast<Map<String, dynamic>>();
      final works = (results[2] as List).cast<Map<String, dynamic>>();
      final unread =
          convs.fold<int>(0, (s, c) => s + ((c['unreadCount'] as int?) ?? 0));
      if (mounted)
        setState(() {
          _orders = orders;
          _works = works;
          _unread = unread;
        });
    } catch (_) {
      // 保持空态，下拉可重试
    }
  }

  Future<void> _refreshAll() async {
    await Future.wait([widget.onRefresh(), _loadData()]);
  }

  // ── helpers ──
  bool _isActive(Map<String, dynamic> o) =>
      _activeStatuses.contains(o['status']);
  bool _isToday(String? iso) {
    final d = DateTime.tryParse(iso ?? '');
    if (d == null) return false;
    final n = DateTime.now();
    final l = d.toLocal();
    return l.year == n.year && l.month == n.month && l.day == n.day;
  }

  String _clock(String? iso) {
    final d = DateTime.tryParse(iso ?? '');
    if (d == null) return '';
    final l = d.toLocal();
    return '${l.hour.toString().padLeft(2, '0')}:${l.minute.toString().padLeft(2, '0')}';
  }

  String _bookingDate(String? iso) {
    final d = DateTime.tryParse(iso ?? '');
    if (d == null) return '';
    final l = d.toLocal();
    return '${l.month}月${l.day}日 ${_clock(iso)}';
  }

  void _push(Widget s) =>
      Navigator.push(context, MaterialPageRoute(builder: (_) => s))
          .then((_) => _refreshAll());

  Future<void> _call(String phone) async {
    if (phone.isEmpty) {
      NbToast.error(context, '当前客户暂无联系电话');
      return;
    }
    await launchUrl(Uri.parse('tel:$phone'));
  }

  Future<void> _navigate(Map<String, dynamic> o) async {
    final lat = (o['latitude'] as num?)?.toDouble();
    final lng = (o['longitude'] as num?)?.toDouble();
    if (lat != null && lng != null) {
      await MapService.launchNavigation(lat, lng);
      return;
    }
    final addr = o['address']?.toString() ?? '';
    if (addr.isEmpty) {
      NbToast.error(context, '当前预约还没有地址信息');
      return;
    }
    await launchUrl(
      Uri.parse(
          'https://uri.amap.com/search?keyword=${Uri.encodeComponent(addr)}'),
      mode: LaunchMode.externalApplication,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.loading) {
      return const Scaffold(
          backgroundColor: DT.bg,
          body: Center(child: CircularProgressIndicator(color: DT.primary)));
    }
    final profile = widget.profile;

    final todayOrders = _orders
        .where((o) => _isToday(o['startTime']?.toString()) && _isActive(o))
        .toList()
      ..sort((a, b) => (a['startTime']?.toString() ?? '')
          .compareTo(b['startTime']?.toString() ?? ''));
    final expected = todayOrders.fold<double>(
        0, (s, o) => s + ((o['quotePrice'] as num?)?.toDouble() ?? 0));
    final active = _orders
        .where((o) =>
            _isActive(o) && (o['startTime']?.toString().isNotEmpty ?? false))
        .toList()
      ..sort((a, b) => (a['startTime']?.toString() ?? '')
          .compareTo(b['startTime']?.toString() ?? ''));
    final next = active.isNotEmpty ? active.first : null;

    final headerH = TechnicianGlassHeader.estimateHeight(
      context,
      belowHeight: 56,
      hasTitle: false,
    );

    return Container(
      decoration: const BoxDecoration(gradient: DT.screenGradient),
      child: Stack(
        children: [
          RefreshIndicator(
            color: DT.primary,
            onRefresh: _refreshAll,
            child: ListView(
              padding: EdgeInsets.fromLTRB(DT.xl, headerH + DT.md, DT.xl, 110),
              children: [
                _sectionTitle('下一单'),
                SizedBox(height: DT.md),
                _nextOrderCard(next),
                SizedBox(height: DT.xxl),
                _sectionTitle('待处理事项'),
                SizedBox(height: DT.md),
                _pendingCard(),
                SizedBox(height: DT.xxl),
                _sectionTitle('今日行程'),
                SizedBox(height: DT.md),
                _todayScheduleCard(todayOrders),
                SizedBox(height: DT.xxl),
                Row(
                  children: [
                    Expanded(child: _sectionTitle('今日热门作品')),
                    GestureDetector(
                      onTap: () => _push(const TechnicianWorksScreen()),
                      child: Text('查看全部',
                          style: DT.bodyMedium.copyWith(
                              color: DT.primary, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
                SizedBox(height: DT.md),
                _popularWorks(),
                SizedBox(height: DT.xxl),
                _sectionTitle('分享我的美甲名片'),
                SizedBox(height: DT.md),
                _shareCard(profile),
              ],
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            top: 0,
            child: TechnicianGlassHeader(
              below: _header(profile, todayOrders.length, expected),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String t) => Text(t, style: DT.titleMedium);

  BoxDecoration get _cardDeco => BoxDecoration(
        color: DT.surface.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(DT.rCard),
        boxShadow: DT.shadowTile,
      );

  // ── 头部：头像 + 问候 + 今日概览 + 接单状态 ──
  Widget _header(
      Map<String, dynamic>? profile, int todayCount, double expected) {
    final name = profile?['name']?.toString() ?? '美甲师';
    final avatar = profile?['avatarUrl']?.toString();
    final isActive = profile?['status'] == 'active';
    return Row(
      children: [
        CircleAvatar(
          radius: 28,
          backgroundColor: DT.primarySoft,
          backgroundImage: (avatar != null && avatar.isNotEmpty)
              ? NetworkImage(avatar)
              : null,
          child: (avatar == null || avatar.isEmpty)
              ? Text(name.isNotEmpty ? name.substring(0, 1) : '美',
                  style: const TextStyle(fontSize: 22, color: DT.primary))
              : null,
        ),
        SizedBox(width: DT.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('你好，$name',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: DT.titleLarge),
              SizedBox(height: 2),
              Text('今日 $todayCount 单 · 预估 ¥${expected.toStringAsFixed(0)}',
                  style: DT.bodySmall.copyWith(color: DT.textMuted)),
            ],
          ),
        ),
        GestureDetector(
          onTap: _toggleStatus,
          child: Container(
            padding: EdgeInsets.symmetric(
                horizontal: DT.sm + 2, vertical: DT.xs + 1),
            decoration: BoxDecoration(
              color: isActive ? DT.successBg : DT.surfaceAlt,
              borderRadius: BorderRadius.circular(DT.rFull),
              border:
                  Border.all(color: isActive ? Colors.transparent : DT.border),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                      color: isActive ? DT.success : DT.textMuted,
                      shape: BoxShape.circle)),
              SizedBox(width: DT.xs + 1),
              Text(isActive ? '接单中' : '休息中',
                  style: TextStyle(
                      fontSize: DT.captionLarge.fontSize,
                      fontWeight: FontWeight.w600,
                      color: isActive ? DT.successText : DT.textSecondary)),
            ]),
          ),
        ),
      ],
    );
  }

  Future<void> _toggleStatus() async {
    HapticFeedback.selectionClick();
    final isActive = widget.profile?['status'] == 'active';
    final newStatus = isActive ? 'inactive' : 'active';

    // 从休息中切换到接单中时，检查是否至少启用了一种服务类型
    if (!isActive) {
      final homeService = widget.profile?['homeService'] == true;
      final shopService = widget.profile?['shopService'] == true;
      if (!homeService && !shopService) {
        final result = await _showServiceTypeDialog();
        if (result != true || !mounted) return;
      }
    }

    try {
      await TechnicianAuthService(context.read<ApiClient>())
          .updateStatus(newStatus);
      await widget.onRefresh();
    } catch (_) {}
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

  // ── 下一单 ──
  Widget _nextOrderCard(Map<String, dynamic>? o) {
    if (o == null) {
      return Container(
        width: double.infinity,
        padding: EdgeInsets.all(DT.lg),
        decoration: _cardDeco,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('暂无行程安排', style: DT.titleSmall),
            SizedBox(height: DT.xs),
            Text('当前没有待上门、待到店或服务中的预约，可以安排新预约。',
                style: DT.bodySmall.copyWith(color: DT.textMuted, height: 1.5)),
          ],
        ),
      );
    }
    final isShop = o['serviceType'] == 'shop';
    final service = _serviceTitle(o);
    final addr = isShop
        ? (o['shopName']?.toString() ?? o['address']?.toString() ?? '')
        : (o['address']?.toString() ?? '');
    final phone = _customerPhone(o);
    final customerName = _customerName(o);
    final customerAvatar = _customerAvatarUrl(o);
    final orderId = o['id'] as int?;
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(DT.lg),
      decoration: BoxDecoration(
        gradient: DT.primaryGradient,
        borderRadius: BorderRadius.circular(DT.rCard),
        boxShadow: DT.shadowButtonLg,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                  child: Text(_bookingDate(o['startTime']?.toString()),
                      style: DT.bodyMedium.copyWith(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontWeight: FontWeight.w600))),
              Container(
                padding: EdgeInsets.symmetric(
                    horizontal: DT.sm + 2, vertical: DT.xs),
                decoration: BoxDecoration(
                    color: DT.surface.withValues(alpha: 0.22),
                    borderRadius: BorderRadius.circular(DT.rFull)),
                child: Text(isShop ? '到店美甲' : '上门美甲',
                    style: TextStyle(
                        fontSize: DT.captionLarge.fontSize,
                        fontWeight: FontWeight.w600,
                        color: DT.textWhite)),
              ),
            ],
          ),
          SizedBox(height: DT.md),
          Row(
            children: [
              ClipOval(
                child: (customerAvatar != null && customerAvatar.isNotEmpty)
                    ? CachedNetworkImage(
                        imageUrl: customerAvatar,
                        width: 32,
                        height: 32,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(
                            width: 32, height: 32, color: DT.primarySoft),
                        errorWidget: (_, __, ___) => Container(
                            width: 32,
                            height: 32,
                            alignment: Alignment.center,
                            decoration: const BoxDecoration(
                                color: DT.primarySoft, shape: BoxShape.circle),
                            child: Text(customerName.substring(0, 1),
                                style: const TextStyle(
                                    fontSize: 13,
                                    color: DT.primary,
                                    fontWeight: FontWeight.w600))))
                    : Container(
                        width: 32,
                        height: 32,
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(
                            color: DT.primarySoft, shape: BoxShape.circle),
                        child: Text(customerName.substring(0, 1),
                            style: const TextStyle(
                                fontSize: 13,
                                color: DT.primary,
                                fontWeight: FontWeight.w600))),
              ),
              SizedBox(width: DT.sm),
              Expanded(
                child: Text(customerName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: DT.bodyMedium.copyWith(
                        color: Colors.white.withValues(alpha: 0.95),
                        fontWeight: FontWeight.w600)),
              ),
              SizedBox(width: DT.sm),
              Expanded(
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text(service,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.right,
                      style: DT.bodySmall.copyWith(
                          color: DT.textWhite,
                          fontWeight: FontWeight.w700,
                          height: 1.25)),
                ),
              ),
            ],
          ),
          if (addr.isNotEmpty) ...[
            SizedBox(height: DT.sm),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(CupertinoIcons.location_solid,
                  size: 15, color: Colors.white.withValues(alpha: 0.85)),
              SizedBox(width: DT.xs + 1),
              Expanded(
                  child: Text(addr,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: DT.bodySmall.copyWith(
                          color: Colors.white.withValues(alpha: 0.85),
                          height: 1.4))),
            ]),
          ],
          SizedBox(height: DT.lg),
          Row(children: [
            Expanded(
                child: _heroBtn(CupertinoIcons.location_north_line_fill, '开始导航',
                    filled: true, onTap: () => _navigate(o))),
            SizedBox(width: DT.sm + 2),
            Expanded(
                child: _heroBtn(CupertinoIcons.phone_fill, '联系客户',
                    filled: false, onTap: () => _call(phone))),
            if (orderId != null) ...[
              SizedBox(width: DT.sm + 2),
              GestureDetector(
                onTap: () =>
                    _push(TechnicianOrderDetailScreen(orderId: orderId)),
                child: Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                      color: DT.surface.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(DT.md)),
                  child: const Icon(CupertinoIcons.chevron_right,
                      color: DT.textWhite, size: 18),
                ),
              ),
            ],
          ]),
        ],
      ),
    );
  }

  Widget _heroBtn(IconData icon, String label,
      {required bool filled, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: filled ? Colors.white : Colors.white.withValues(alpha: 0.18),
          borderRadius: BorderRadius.circular(DT.rFull),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 16, color: filled ? DT.primary : DT.textWhite),
          SizedBox(width: DT.xs + 1),
          Text(label,
              style: TextStyle(
                  fontSize: DT.bodyMedium.fontSize,
                  fontWeight: FontWeight.w600,
                  color: filled ? DT.primary : DT.textWhite)),
        ]),
      ),
    );
  }

  // ── 待处理事项 ──
  Widget _pendingCard() {
    final pendingConfirm =
        _orders.where((o) => o['status'] == 'pending_confirm').length;
    final unpaidDeposit = _orders
        .where((o) =>
            _isActive(o) &&
            !((o['depositPaid'] ?? o['isDepositPaid']) as bool? ?? false))
        .length;
    final items = <(IconData, int, String, VoidCallback)>[
      if (pendingConfirm > 0)
        (
          CupertinoIcons.checkmark_seal,
          pendingConfirm,
          '个预约待确认',
          () => _push(const TechnicianOrdersScreen(
              initialStatusFilter: 'pending_confirm'))
        ),
      if (unpaidDeposit > 0)
        (
          CupertinoIcons.money_yen_circle,
          unpaidDeposit,
          '个客户未支付定金',
          () => _push(
              const TechnicianOrdersScreen(initialUnpaidDepositOnly: true))
        ),
      if (_unread > 0)
        (
          CupertinoIcons.chat_bubble_2,
          _unread,
          '条未读消息',
          () => _push(const TechnicianMessagesScreen(initialTab: 'unread'))
        ),
    ];
    if (items.isEmpty) {
      return GlassContainer(
        tint: DT.surface,
        padding: EdgeInsets.all(DT.lg),
        borderRadius: DT.rCard,
        opacity: 0.52,
        blur: DT.glassBlurStandard,
        showBorder: false,
        boxShadow: DT.shadowTile,
        child: Row(children: [
          const Icon(CupertinoIcons.checkmark_circle_fill,
              size: 20, color: DT.success),
          SizedBox(width: DT.sm),
          Expanded(
              child: Text('今日待办已清空，可以专心服务客户。',
                  style: DT.bodyMedium.copyWith(color: DT.textSecondary))),
        ]),
      );
    }
    return GlassContainer(
      tint: DT.surface,
      borderRadius: DT.rCard,
      opacity: 0.52,
      blur: DT.glassBlurStandard,
      showBorder: false,
      boxShadow: DT.shadowTile,
      padding: EdgeInsets.all(DT.sm),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0) SizedBox(height: DT.sm),
            Container(
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(20),
                boxShadow: DT.shadowSm,
              ),
              child: Material(
                type: MaterialType.transparency,
                child: ListTile(
                  onTap: items[i].$4,
                  minVerticalPadding: DT.sm,
                  leading: Container(
                    width: 38,
                    height: 38,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                        color: DT.primarySoft,
                        borderRadius: BorderRadius.circular(14)),
                    child: Icon(items[i].$1, size: 18, color: DT.primary),
                  ),
                  title: Row(children: [
                    Text('${items[i].$2}',
                        style: DT.titleSmall.copyWith(color: DT.primary)),
                    SizedBox(width: DT.xs),
                    Expanded(child: Text(items[i].$3, style: DT.bodyMedium)),
                  ]),
                  trailing: const Icon(CupertinoIcons.chevron_right,
                      size: 18, color: DT.textQuaternary),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── 今日行程 ──
  Widget _todayScheduleCard(List<Map<String, dynamic>> todayOrders) {
    if (todayOrders.isEmpty) {
      return GlassContainer(
        tint: DT.surface,
        padding: EdgeInsets.symmetric(vertical: DT.space32, horizontal: DT.lg),
        borderRadius: DT.rCard,
        opacity: 0.52,
        blur: DT.glassBlurStandard,
        showBorder: false,
        boxShadow: DT.shadowTile,
        child: Center(
            child: Text('今天还没有新的预约安排',
                style: DT.bodyMedium.copyWith(color: DT.textMuted))),
      );
    }
    return GlassContainer(
      tint: DT.surface,
      borderRadius: DT.rCard,
      opacity: 0.52,
      blur: DT.glassBlurStandard,
      showBorder: false,
      boxShadow: DT.shadowTile,
      padding: EdgeInsets.all(DT.sm),
      child: Column(
        children: [
          for (var i = 0; i < todayOrders.length; i++) ...[
            if (i > 0) SizedBox(height: DT.sm),
            _scheduleRow(todayOrders[i]),
          ],
        ],
      ),
    );
  }

  Widget _scheduleRow(Map<String, dynamic> o) {
    final isShop = o['serviceType'] == 'shop';
    final service = o['serviceName']?.toString() ?? '预约服务';
    final customer = o['customerName']?.toString() ?? '客户';
    final address = isShop
        ? (o['shopName']?.toString() ?? o['address']?.toString() ?? '到店服务')
        : (o['address']?.toString() ?? '待确认地址');
    final phone = o['customerPhone']?.toString() ?? '';
    final customerAvatar = o['customerAvatar']?.toString();
    final orderId = o['id'] as int?;
    return Material(
      type: MaterialType.transparency,
      child: InkWell(
        onTap: orderId != null
            ? () => _push(TechnicianOrderDetailScreen(orderId: orderId))
            : null,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: EdgeInsets.all(DT.lg),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(20),
            boxShadow: DT.shadowSm,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(_clock(o['startTime']?.toString()),
                            style: DT.titleLarge.copyWith(
                              color: DT.textPrimary,
                              fontFeatures: const [
                                FontFeature.tabularFigures()
                              ],
                            )),
                        SizedBox(width: DT.sm),
                        _scheduleAvatar(customer, customerAvatar),
                        SizedBox(width: DT.xs),
                        Flexible(
                          child: Text(customer,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: DT.titleSmall),
                        ),
                        SizedBox(width: DT.xs),
                        Flexible(
                          child: Text(service,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: DT.bodySmall
                                  .copyWith(color: DT.textSecondary)),
                        ),
                      ],
                    ),
                    SizedBox(height: DT.sm),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(CupertinoIcons.location_solid,
                            size: 15,
                            color: isShop ? DT.primary : DT.warningText),
                        SizedBox(width: DT.xs + 1),
                        Expanded(
                          child: Text(address,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: DT.bodySmall.copyWith(
                                  color: DT.textSecondary, height: 1.4)),
                        ),
                      ],
                    ),
                    SizedBox(height: DT.sm),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                          color: isShop ? DT.primarySoft : DT.warningBg,
                          borderRadius: BorderRadius.circular(DT.rFull)),
                      child: Text(isShop ? '到店' : '上门',
                          style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: isShop ? DT.primary : DT.warningText)),
                    ),
                  ],
                ),
              ),
              SizedBox(width: DT.md),
              GestureDetector(
                onTap: () => _call(phone),
                child: Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                      color: DT.primarySoft,
                      borderRadius: BorderRadius.circular(DT.rFull)),
                  child: const Icon(CupertinoIcons.phone,
                      size: 18, color: DT.primary),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── 行程卡片头像 ──
  Widget _scheduleAvatar(String name, String? url) {
    if (url != null && url.isNotEmpty) {
      return ClipOval(
          child: CachedNetworkImage(
              imageUrl: url,
              width: 28,
              height: 28,
              fit: BoxFit.cover,
              errorWidget: (_, __, ___) => _scheduleAvatarFallback(name)));
    }
    return _scheduleAvatarFallback(name);
  }

  Widget _scheduleAvatarFallback(String name) {
    return Container(
      width: 28,
      height: 28,
      alignment: Alignment.center,
      decoration:
          const BoxDecoration(color: DT.primarySoft, shape: BoxShape.circle),
      child: Text(name.isNotEmpty ? name.substring(0, 1) : '?',
          style: const TextStyle(
              fontSize: 12, color: DT.primary, fontWeight: FontWeight.w600)),
    );
  }

  // ── 今日热门作品 ──
  Widget _popularWorks() {
    final works = [..._works]..sort((a, b) {
        final fa = (a['isFeatured'] as bool? ?? false) ? 1 : 0;
        final fb = (b['isFeatured'] as bool? ?? false) ? 1 : 0;
        if (fa != fb) return fb - fa;
        final la =
            (a['favoriteCount'] as int?) ?? (a['likeCount'] as int?) ?? 0;
        final lb =
            (b['favoriteCount'] as int?) ?? (b['likeCount'] as int?) ?? 0;
        return lb - la;
      });
    final top = works.take(8).toList();
    if (top.isEmpty) {
      return Container(
        width: double.infinity,
        padding: EdgeInsets.symmetric(vertical: DT.space32, horizontal: DT.lg),
        decoration: _cardDeco,
        child: Center(
            child: Text('还没有推荐作品，去作品管理设置好看的款式吧。',
                textAlign: TextAlign.center,
                style: DT.bodyMedium.copyWith(color: DT.textMuted))),
      );
    }
    return SizedBox(
      height: 168,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: top.length,
        separatorBuilder: (_, __) => SizedBox(width: DT.md),
        itemBuilder: (_, i) => _workCard(top[i]),
      ),
    );
  }

  Widget _workCard(Map<String, dynamic> w) {
    final cover = w['coverUrl']?.toString();
    final imgs = (w['imageUrls'] as List<dynamic>?) ?? const [];
    final url = (cover != null && cover.isNotEmpty)
        ? cover
        : (imgs.isNotEmpty ? imgs.first.toString() : null);
    final count = (w['favoriteCount'] as int?) ?? (w['likeCount'] as int?) ?? 0;
    return GestureDetector(
      onTap: () => _push(TechnicianWorkDetailScreen(work: w)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(DT.radius16),
        child: SizedBox(
          width: 132,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (url != null)
                CachedNetworkImage(
                    imageUrl: url,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: DT.surfaceAlt),
                    errorWidget: (_, __, ___) => Container(
                        color: DT.surfaceAlt,
                        child: const Icon(CupertinoIcons.photo,
                            color: DT.textTertiary)))
              else
                Container(
                    color: DT.surfaceAlt,
                    child: const Center(
                        child: Text('作品',
                            style: TextStyle(color: DT.textTertiary)))),
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.transparent, Color(0x66000000)],
                      stops: [0.55, 1.0]),
                ),
              ),
              Positioned(
                left: 8,
                right: 8,
                bottom: 8,
                child: Row(children: [
                  Icon(CupertinoIcons.heart_fill,
                      size: 12, color: Colors.white.withValues(alpha: 0.9)),
                  const SizedBox(width: 4),
                  Text('$count',
                      style:
                          const TextStyle(fontSize: 11, color: Colors.white)),
                  if (w['isFeatured'] as bool? ?? false) ...[
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                          color: DT.primary,
                          borderRadius: BorderRadius.circular(DT.rFull)),
                      child: const Text('精选',
                          style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                              color: Colors.white)),
                    ),
                  ],
                ]),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── 分享名片 ──
  String _shareUrl(Map<String, dynamic>? profile) {
    const base = 'https://m.lunails.cn';
    final code = profile?['invitationCode']?.toString();
    if (code != null && code.isNotEmpty)
      return '$base/artist/${Uri.encodeComponent(code)}';
    return '$base/artist/${profile?['id']}';
  }

  Widget _shareCard(Map<String, dynamic>? profile) {
    final name = profile?['name']?.toString() ?? '美甲师';
    final city = profile?['city']?.toString() ?? '';
    final code = profile?['invitationCode']?.toString();
    final home = profile?['homeService'] == true;
    final shop = profile?['shopService'] == true;
    final url = _shareUrl(profile);
    return Container(
      padding: EdgeInsets.all(DT.lg),
      decoration: BoxDecoration(
        gradient: DT.primaryGradient,
        borderRadius: BorderRadius.circular(DT.rCard),
        boxShadow: DT.shadowButtonLg,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                    color: DT.surface, borderRadius: BorderRadius.circular(12)),
                child: QrImageView(
                    data: url,
                    version: QrVersions.auto,
                    size: 64,
                    padding: EdgeInsets.zero),
              ),
              SizedBox(width: DT.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: DT.titleLarge.copyWith(color: DT.textWhite)),
                    if (city.isNotEmpty) ...[
                      SizedBox(height: 2),
                      Text(city,
                          style: DT.bodySmall.copyWith(
                              color: Colors.white.withValues(alpha: 0.85))),
                    ],
                    SizedBox(height: DT.sm),
                    Wrap(spacing: 6, runSpacing: 6, children: [
                      if (home) _cardTag('🚗 上门'),
                      if (shop) _cardTag('🏪 到店'),
                      if (code != null && code.isNotEmpty)
                        _cardTag('邀请码 $code'),
                    ]),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: DT.md),
          Row(children: [
            Expanded(
                child: _heroBtn(CupertinoIcons.doc_on_clipboard, '复制链接',
                    filled: true, onTap: () {
              Clipboard.setData(ClipboardData(text: url));
              NbToast.success(context, '链接已复制，发给客户即可');
            })),
            SizedBox(width: DT.sm + 2),
            Expanded(
                child: _heroBtn(CupertinoIcons.share, '分享名片', filled: false,
                    onTap: () {
              Share.share('$name 的美甲主页，长按或点击预约：$url');
            })),
          ]),
        ],
      ),
    );
  }

  Widget _cardTag(String t) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
          color: DT.surface.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(DT.rFull)),
      child: Text(t,
          style: const TextStyle(
              fontSize: 11, color: DT.textWhite, fontWeight: FontWeight.w500)),
    );
  }

  String _customerName(Map<String, dynamic> order) {
    final client = order['client'] as Map<String, dynamic>?;
    final customer = order['customer'] as Map<String, dynamic>?;
    final clientUser = order['clientUser'] as Map<String, dynamic>?;
    final customerClient = customer?['client'] as Map<String, dynamic>?;
    final customerClientUser = customer?['clientUser'] as Map<String, dynamic>?;
    return _nameStr(order['customerName']) ??
        _nameStr(order['clientName']) ??
        _nameStr(clientUser?['nickname']) ??
        _nameStr(clientUser?['name']) ??
        _nameStr(client?['nickname']) ??
        _nameStr(client?['name']) ??
        _nameStr(customer?['name']) ??
        _nameStr(customer?['nickname']) ??
        _nameStr(customerClient?['nickname']) ??
        _nameStr(customerClient?['name']) ??
        _nameStr(customerClientUser?['nickname']) ??
        _nameStr(customerClientUser?['name']) ??
        '客户';
  }

  String _customerPhone(Map<String, dynamic> order) {
    final client = order['client'] as Map<String, dynamic>?;
    final customer = order['customer'] as Map<String, dynamic>?;
    final clientUser = order['clientUser'] as Map<String, dynamic>?;
    final customerClientUser = customer?['clientUser'] as Map<String, dynamic>?;
    return _str(order['customerPhone']) ??
        _str(order['clientPhone']) ??
        _str(clientUser?['phone']) ??
        _str(client?['phone']) ??
        _str(customer?['phone']) ??
        _str(customerClientUser?['phone']) ??
        '';
  }

  String? _customerAvatarUrl(Map<String, dynamic> order) {
    final client = order['client'] as Map<String, dynamic>?;
    final customer = order['customer'] as Map<String, dynamic>?;
    final clientUser = order['clientUser'] as Map<String, dynamic>?;
    final customerClient = customer?['client'] as Map<String, dynamic>?;
    final customerClientUser = customer?['clientUser'] as Map<String, dynamic>?;
    return _str(order['avatarUrl']) ??
        _str(order['customerAvatar']) ??
        _str(order['clientAvatar']) ??
        _str(clientUser?['avatarUrl']) ??
        _str(client?['avatarUrl']) ??
        _str(client?['avatar']) ??
        _str(customer?['avatarUrl']) ??
        _str(customer?['customerAvatar']) ??
        _str(customerClient?['avatarUrl']) ??
        _str(customerClientUser?['avatarUrl']);
  }

  String _serviceTitle(Map<String, dynamic> order) {
    final work = order['work'] as Map<String, dynamic>?;
    final design = order['design'] as Map<String, dynamic>?;
    return _str(order['customTitle']) ??
        _str(work?['title']) ??
        _str(order['workTitle']) ??
        _str(design?['title']) ??
        _str(order['designTitle']) ??
        _str(order['serviceName']) ??
        '预约服务';
  }

  String? _str(dynamic value) {
    final s = value?.toString().trim();
    if (s == null || s.isEmpty || s == 'null') return null;
    return s;
  }

  String? _nameStr(dynamic value) {
    final s = _str(value);
    if (s == null || s == '客户') return null;
    return s;
  }
}
