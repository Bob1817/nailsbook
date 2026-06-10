import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/api/api_client.dart';
import '../../../core/maps/map_service.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/glass_container.dart';
import '../../../core/widgets/nb_toast.dart';
import '../orders/technician_order_service.dart';
import '../orders/technician_order_detail_screen.dart';

/// 美甲师「行程」页：对齐 webapp technician-frontend/src/pages/SchedulePage.tsx。
/// 模块：标题 + 日历按钮 / 今天+横滑日期条（带预约标记）/ 当日统计卡 / 今日行程·今日预约 Tab / 列表卡。
class TechnicianScheduleScreen extends StatefulWidget {
  const TechnicianScheduleScreen({super.key});

  @override
  State<TechnicianScheduleScreen> createState() =>
      _TechnicianScheduleScreenState();
}

const _tripStatuses = {'pending_home', 'pending_shop', 'in_progress'};

class _TechnicianScheduleScreenState extends State<TechnicianScheduleScreen> {
  List<Map<String, dynamic>> _orders = [];
  DateTime _activeDate = DateTime.now();
  bool _loading = true;
  String _tab = 'trips'; // 'trips' / 'all'
  final _stripCtl = ScrollController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _stripCtl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final orders =
          await TechnicianOrderService(context.read<ApiClient>()).list();
      if (mounted)
        setState(() {
          _orders = orders;
          _loading = false;
        });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _dateKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  Set<String> get _orderDateKeys => _orders
      .map((o) => DateTime.tryParse(o['startTime']?.toString() ?? ''))
      .whereType<DateTime>()
      .map((d) => _dateKey(d.toLocal()))
      .toSet();

  List<Map<String, dynamic>> get _dayOrders {
    final list = _orders.where((o) {
      final d = DateTime.tryParse(o['startTime']?.toString() ?? '');
      return d != null && _sameDay(d.toLocal(), _activeDate);
    }).toList()
      ..sort((a, b) => (a['startTime']?.toString() ?? '')
          .compareTo(b['startTime']?.toString() ?? ''));
    return list;
  }

  List<Map<String, dynamic>> get _tripOrders =>
      _dayOrders.where((o) => _tripStatuses.contains(o['status'])).toList();

  List<Map<String, dynamic>> get _listOrders =>
      _tab == 'trips' ? _tripOrders : _dayOrders;

  int _durationMinutes(String? start, String? end) {
    final s = DateTime.tryParse(start ?? '');
    final e = DateTime.tryParse(end ?? '');
    if (s == null || e == null) return 60; // 兜底默认 1 小时
    return e.difference(s).inMinutes.clamp(0, 24 * 60);
  }

  ({int count, double distance, int duration, double amount, int completed})
      get _summary {
    final trips = _tripOrders;
    final serviceMin = trips.fold<int>(
        0,
        (s, o) =>
            s +
            _durationMinutes(
                o['startTime']?.toString(), o['endTime']?.toString()));
    final travelMin = trips.isEmpty
        ? 0
        : (trips.length * 24 + (trips.length - 1).clamp(0, 999) * 11);
    final amount = trips.fold<double>(
        0, (s, o) => s + ((o['quotePrice'] as num?)?.toDouble() ?? 0));
    final distance = trips.isEmpty
        ? 0.0
        : (trips.length == 1
            ? 2.8
            : double.parse((trips.length * 3.15).toStringAsFixed(1)));
    final completed = trips.where((o) => o['status'] == 'in_progress').length;
    return (
      count: trips.length,
      distance: distance,
      duration: serviceMin + travelMin,
      amount: amount,
      completed: completed
    );
  }

  void _resetToToday() {
    HapticFeedback.selectionClick();
    setState(() => _activeDate = DateTime.now());
    if (_stripCtl.hasClients)
      _stripCtl.animateTo(0,
          duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
  }

  Future<void> _openOrderDetail(int orderId) async {
    await Navigator.push(
        context,
        MaterialPageRoute(
            builder: (_) => TechnicianOrderDetailScreen(orderId: orderId)));
    _load();
  }

  Future<void> _openCalendar() async {
    final picked = await showModalBottomSheet<DateTime>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          _CalendarSheet(initial: _activeDate, markedKeys: _orderDateKeys),
    );
    if (picked != null && mounted) setState(() => _activeDate = picked);
  }

  Future<void> _navigateTo(String? address) async {
    if (address == null || address.trim().isEmpty || address.contains('待补充')) {
      NbToast.error(context, '当前预约还没有地址信息');
      return;
    }
    HapticFeedback.lightImpact();
    await MapService.launchAddressNavigation(address);
  }

  Future<void> _callCustomer(String? phone) async {
    if (phone == null || phone.trim().isEmpty) {
      NbToast.error(context, '当前客户暂无联系电话');
      return;
    }
    HapticFeedback.lightImpact();
    final ok = await MapService.launchPhoneCall(phone);
    if (!ok && mounted) NbToast.error(context, '无法发起电话');
  }

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    return Scaffold(
      backgroundColor: DT.bg,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            _header(),
            _dateStrip(today),
            _summaryCard(),
            _tabBar(),
            Expanded(
              child: _loading
                  ? const Center(
                      child: CircularProgressIndicator(color: DT.primary))
                  : RefreshIndicator(
                      color: DT.primary,
                      onRefresh: _load,
                      child: _listOrders.isEmpty ? _emptyList() : _list(),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _header() {
    return GlassContainer(
      blur: DT.glassBlurHeavy,
      opacity: 0.64,
      borderRadius: 0,
      showBorder: false,
      padding: const EdgeInsets.fromLTRB(20, 16, 16, 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('行程',
                    style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.4,
                        color: DT.textPrimary)),
                SizedBox(height: 4),
                Text('高效规划路线，准时上门服务',
                    style: TextStyle(fontSize: 13, color: DT.textSecondary)),
              ],
            ),
          ),
          GestureDetector(
            onTap: _openCalendar,
            child: Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration:
                  BoxDecoration(color: DT.primarySoft, shape: BoxShape.circle),
              child: const Icon(CupertinoIcons.calendar,
                  size: 20, color: DT.primary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _dateStrip(DateTime today) {
    // 「今天」固定在左侧 + 其余日期（明天起）横滑
    final scrollDates = List.generate(
        20,
        (i) => DateTime(today.year, today.month, today.day)
            .add(Duration(days: i + 1)));
    final isTodayActive = _sameDay(_activeDate, today);
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
      child: Row(
        children: [
          _dateTile(today, isTodayActive, isTodayPill: true),
          const SizedBox(width: 8),
          Expanded(
            child: SizedBox(
              height: 70,
              child: ListView.separated(
                controller: _stripCtl,
                scrollDirection: Axis.horizontal,
                itemCount: scrollDates.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) {
                  final d = scrollDates[i];
                  final active = _sameDay(_activeDate, d);
                  return _dateTile(d, active);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _dateTile(DateTime d, bool active, {bool isTodayPill = false}) {
    final relative = _relativeLabel(d);
    final hasOrders = _orderDateKeys.contains(_dateKey(d));
    final label =
        isTodayPill ? '今天' : (relative ?? '周${_weekdayLabel(d.weekday)}');
    return GestureDetector(
      onTap: isTodayPill
          ? _resetToToday
          : () {
              HapticFeedback.selectionClick();
              setState(() => _activeDate = d);
            },
      child: Container(
        width: 58,
        padding: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          color: active ? DT.cream : DT.surfaceAlt,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(label,
                style: TextStyle(
                    fontSize: 11,
                    height: 1,
                    color: active
                        ? DT.onCream.withValues(alpha: 0.75)
                        : DT.textTertiary)),
            const SizedBox(height: 2),
            Text('${d.day}',
                style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: active ? DT.onCream : DT.textPrimary,
                    height: 1.1)),
            Text('${d.month}月',
                style: TextStyle(
                    fontSize: 11,
                    height: 1,
                    color: active
                        ? DT.onCream.withValues(alpha: 0.75)
                        : DT.textTertiary)),
            const SizedBox(height: 2),
            Container(
              width: 4,
              height: 4,
              decoration: BoxDecoration(
                color: active
                    ? Colors.white
                    : (hasOrders
                        ? const Color(0xFF22C55E)
                        : Colors.transparent),
                shape: BoxShape.circle,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryCard() {
    final s = _summary;
    final items = <(String, String, String)>[
      ('${s.count}', '', '行程数'),
      (s.distance == 0 ? '0' : '${s.distance}', 'km', '总里程'),
      ('¥${s.amount.toStringAsFixed(0)}', '', '预计收入'),
      ('${s.completed}/${s.count}', '', '已完成'),
    ];
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 4, 20, 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        // 柔玻璃面：去掉硬边框，仅保留极轻阴影提示层级
        color: DT.surface.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 16,
              offset: const Offset(0, 4)),
        ],
      ),
      child: Row(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0) const SizedBox(width: 8),
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                    color: DT.surfaceAlt,
                    borderRadius: BorderRadius.circular(12)),
                child: Column(
                  children: [
                    RichText(
                      text: TextSpan(
                        style: const TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w700,
                            color: DT.textPrimary,
                            letterSpacing: -0.3),
                        children: [
                          TextSpan(text: items[i].$1),
                          if (items[i].$2.isNotEmpty)
                            TextSpan(
                                text: items[i].$2,
                                style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w500,
                                    color: DT.textSecondary)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(items[i].$3,
                        style: const TextStyle(
                            fontSize: 11, color: DT.textTertiary)),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _tabBar() {
    Widget tab(String key, String label) {
      final active = _tab == key;
      return GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          setState(() => _tab = key);
        },
        behavior: HitTestBehavior.opaque,
        child: Padding(
          padding: const EdgeInsets.only(right: 24, top: 8, bottom: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: active ? DT.textPrimary : DT.textTertiary,
                  )),
              const SizedBox(height: 6),
              Container(
                width: 22,
                height: 2.5,
                decoration: BoxDecoration(
                  color: active ? DT.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 4),
      // 去掉底部硬分隔线：用 tab 自带的主题色短下划线作为唯一视觉指示
      child: Row(children: [tab('trips', '今日行程'), tab('all', '今日预约')]),
    );
  }

  Widget _list() {
    final orders = _listOrders;
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
      itemCount: orders.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) => _orderCard(orders[i]),
    );
  }

  Widget _emptyList() {
    return ListView(
      children: [
        const SizedBox(height: 80),
        Center(
          child: Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
                color: DT.surfaceAlt, borderRadius: BorderRadius.circular(24)),
            child: const Icon(CupertinoIcons.calendar,
                size: 32, color: DT.textTertiary),
          ),
        ),
        const SizedBox(height: 14),
        Center(
            child: Text(_tab == 'trips' ? '当天暂无行程' : '当天暂无预约',
                style: const TextStyle(fontSize: 14, color: DT.textMuted))),
      ],
    );
  }

  Widget _orderCard(Map<String, dynamic> o) {
    final status = o['status']?.toString() ?? '';
    final startTime = o['startTime']?.toString() ?? '';
    final serviceType = o['serviceType']?.toString() ?? '';
    final serviceName =
        o['serviceName']?.toString() ?? o['customTitle']?.toString() ?? '预约服务';
    final address = o['address']?.toString() ?? '';
    final customerName = o['customerName']?.toString() ??
        (o['client'] as Map<String, dynamic>?)?['nickname']?.toString() ??
        (o['customer'] as Map<String, dynamic>?)?['name']?.toString() ??
        '客户';
    final customerPhone = o['customerPhone']?.toString();
    final customerAvatar = o['customerAvatar']?.toString();
    final sc = _statusColors(status);

    return GestureDetector(
      onTap: () => _openOrderDetail(o['id'] as int),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: DT.surface.withValues(alpha: 0.78),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 16,
                offset: const Offset(0, 4)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                SizedBox(
                  width: 56,
                  child: Text(_fmtClock(startTime),
                      style: const TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w700,
                          color: DT.textPrimary,
                          letterSpacing: -0.3)),
                ),
                _avatar(customerName, customerAvatar),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(customerName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: DT.textPrimary)),
                      const SizedBox(height: 2),
                      Text('${_serviceTypeLabel(serviceType)} · $serviceName',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 12, color: DT.textTertiary)),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                      color: sc.$1, borderRadius: BorderRadius.circular(6)),
                  child: Text(_statusLabel(status),
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: sc.$2)),
                ),
              ],
            ),
            if (address.isNotEmpty) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  const Text('📍 ', style: TextStyle(fontSize: 12)),
                  Expanded(
                    child: Text(address,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 12, color: DT.textTertiary)),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _actionBtn(CupertinoIcons.location_solid, '去导航',
                      bg: DT.primary,
                      fg: Colors.white,
                      onTap: () => _navigateTo(address)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _actionBtn(CupertinoIcons.phone_fill, '联系客户',
                      bg: DT.surfaceAlt,
                      fg: DT.textPrimary,
                      onTap: () => _callCustomer(customerPhone)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _actionBtn(IconData icon, String label,
      {required Color bg, required Color fg, required VoidCallback onTap}) {
    return SizedBox(
      height: 44,
      child: TextButton.icon(
        onPressed: onTap,
        icon: Icon(icon, size: 14, color: fg),
        label: Text(label,
            style: TextStyle(
                fontSize: 13, fontWeight: FontWeight.w500, color: fg)),
        style: TextButton.styleFrom(
          backgroundColor: bg,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          minimumSize: const Size.fromHeight(44),
        ),
      ),
    );
  }

  Widget _avatar(String name, String? url) {
    if (url != null && url.isNotEmpty) {
      return ClipOval(
          child: CachedNetworkImage(
              imageUrl: url, width: 36, height: 36, fit: BoxFit.cover));
    }
    return Container(
      width: 36,
      height: 36,
      alignment: Alignment.center,
      decoration:
          const BoxDecoration(color: DT.primarySoft, shape: BoxShape.circle),
      child: Text(name.isNotEmpty ? name.substring(0, 1) : '?',
          style:
              const TextStyle(color: DT.primary, fontWeight: FontWeight.w600)),
    );
  }

  // ── Helpers ──

  String _fmtClock(String s) {
    final d = DateTime.tryParse(s);
    if (d == null) return s;
    final l = d.toLocal();
    return '${l.hour.toString().padLeft(2, '0')}:${l.minute.toString().padLeft(2, '0')}';
  }

  String _weekdayLabel(int w) =>
      const ['一', '二', '三', '四', '五', '六', '日'][w - 1];

  String? _relativeLabel(DateTime d) {
    final t0 = DateTime.now();
    final today = DateTime(t0.year, t0.month, t0.day);
    final tgt = DateTime(d.year, d.month, d.day);
    final diff = tgt.difference(today).inDays;
    if (diff == 0) return '今天';
    if (diff == 1) return '明天';
    if (diff == 2) return '后天';
    return null;
  }

  String _serviceTypeLabel(String s) {
    if (s == 'home' || s == '上门美甲') return '上门美甲';
    if (s == 'shop' || s == '到店美甲') return '到店美甲';
    return s.isEmpty ? '预约服务' : s;
  }

  String _statusLabel(String s) {
    switch (s) {
      case 'pending_quote':
        return '待报价';
      case 'pending_agree':
        return '待确认';
      case 'pending_confirm':
        return '待接单';
      case 'pending_home':
        return '待上门';
      case 'pending_shop':
        return '待到店';
      case 'in_progress':
        return '服务中';
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      default:
        return s;
    }
  }

  (Color, Color) _statusColors(String s) {
    switch (s) {
      case 'pending_quote':
        return (const Color(0xFFFFF6EB), const Color(0xFFB87425));
      case 'pending_agree':
        return (const Color(0xFFFFF4DF), const Color(0xFFC8892F));
      case 'pending_confirm':
        return (const Color(0xFFFFF6EB), const Color(0xFFB87425));
      case 'pending_home':
        return (const Color(0xFFE8F5E9), const Color(0xFF2E7D32));
      case 'pending_shop':
        return (const Color(0xFFE3F2FD), const Color(0xFF1565C0));
      case 'in_progress':
        return (const Color(0xFF3A2F23), DT.primary);
      case 'completed':
        return (const Color(0xFFEDF8F1), const Color(0xFF3B9460));
      default:
        return (const Color(0xFFF4F4F5), const Color(0xFF8F8F95));
    }
  }
}

// ───────── 月历弹窗 ─────────

class _CalendarSheet extends StatefulWidget {
  final DateTime initial;
  final Set<String> markedKeys;
  const _CalendarSheet({required this.initial, required this.markedKeys});

  @override
  State<_CalendarSheet> createState() => _CalendarSheetState();
}

class _CalendarSheetState extends State<_CalendarSheet> {
  late DateTime _month = DateTime(widget.initial.year, widget.initial.month, 1);
  late DateTime _selected = widget.initial;

  String _key(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).padding.bottom;
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Container(
          decoration: BoxDecoration(
              color: DT.surface.withOpacity(0.94),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(24))),
          padding: EdgeInsets.fromLTRB(16, 10, 16, bottomPad + 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                      color: DT.border,
                      borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 12),
              Row(
                children: [
                  IconButton(
                    icon: const Icon(CupertinoIcons.chevron_left, size: 20),
                    onPressed: () => setState(() =>
                        _month = DateTime(_month.year, _month.month - 1, 1)),
                  ),
                  Expanded(
                      child: Center(
                          child: Text('${_month.year}年 ${_month.month}月',
                              style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: DT.textPrimary)))),
                  IconButton(
                    icon: const Icon(CupertinoIcons.chevron_right, size: 20),
                    onPressed: () => setState(() =>
                        _month = DateTime(_month.year, _month.month + 1, 1)),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: const ['一', '二', '三', '四', '五', '六', '日']
                    .map((w) => Expanded(
                        child: Center(
                            child: Text(w,
                                style: TextStyle(
                                    fontSize: 11, color: DT.textTertiary)))))
                    .toList(),
              ),
              const SizedBox(height: 6),
              _grid(),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context, _selected),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: DT.cream,
                    foregroundColor: DT.onCream,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999)),
                  ),
                  child: const Text('选择该日',
                      style:
                          TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _grid() {
    // Dart weekday 1=周一..7=周日；与首行 ['一'..'日'] 一致，第一天的偏移 = (weekday - 1)
    final firstWeekday = DateTime(_month.year, _month.month, 1).weekday;
    final daysInMonth = DateTime(_month.year, _month.month + 1, 0).day;
    final cells = <Widget>[];
    for (var i = 0; i < firstWeekday - 1; i++) {
      cells.add(const SizedBox());
    }
    final today = DateTime.now();
    for (var day = 1; day <= daysInMonth; day++) {
      final d = DateTime(_month.year, _month.month, day);
      final selected = d.year == _selected.year &&
          d.month == _selected.month &&
          d.day == _selected.day;
      final hasOrders = widget.markedKeys.contains(_key(d));
      final isToday =
          d.year == today.year && d.month == today.month && d.day == today.day;
      cells.add(GestureDetector(
        onTap: () => setState(() => _selected = d),
        child: Container(
          margin: const EdgeInsets.all(2),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? DT.cream : Colors.transparent,
            border: isToday && !selected
                ? Border.all(color: DT.primary.withValues(alpha: 0.5))
                : null,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('$day',
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                      color: selected ? DT.onCream : DT.textPrimary)),
              const SizedBox(height: 2),
              Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  color: selected
                      ? DT.onCream
                      : (hasOrders
                          ? const Color(0xFF22C55E)
                          : Colors.transparent),
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        ),
      ));
    }
    return GridView.count(
      crossAxisCount: 7,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 0.92,
      children: cells,
    );
  }
}
