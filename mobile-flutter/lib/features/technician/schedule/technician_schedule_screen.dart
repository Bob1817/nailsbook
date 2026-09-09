import '../../../core/theme/colors.generated.dart';
import '../../../core/maps/map_service.dart';
import '../../../core/widgets/glass_container.dart';
import '../../shared/chat/chat_screen.dart';
import '../../shared/chat/chat_service.dart';
import '../orders/technician_order_service.dart';
import '../orders/technician_order_detail_screen.dart';
import '../auth/technician_auth_service.dart';
import '../widgets/technician_appointment_card.dart';

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
  List<String> _restDays = [];

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
      final api = context.read<ApiClient>();
      final orders = await TechnicianOrderService(api).list();
      // 加载休息日数据
      List<String> restDays = [];
      try {
        api.setRole('technician');
        final profile = await TechnicianAuthService(api).getProfile();
        final raw = profile.serviceSchedule;
        final rest = raw?['restDays'];
        if (rest is List) {
          restDays = rest.map((e) => e.toString()).toList()..sort();
        }
      } catch (_) {}
      if (!mounted) return;
      setState(() {
        _orders = orders;
        _restDays = restDays;
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

  bool get _isActiveDateRestDay => _restDays.contains(_dateKey(_activeDate));

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
    if (_stripCtl.hasClients) {
      _stripCtl.animateTo(0,
          duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
    }
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
          _CalendarSheet(initial: _activeDate, markedKeys: _orderDateKeys, restDayKeys: _restDays.toSet()),
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

  Future<void> _openChat(Map<String, dynamic> order, String name) async {
    final clientUserId = _clientUserId(order);
    if (clientUserId == null) {
      NbToast.error(context, '该客户尚未注册客户端，暂不支持在线消息');
      return;
    }
    HapticFeedback.lightImpact();
    final api = context.read<ApiClient>();
    int? convId;
    try {
      final convs = await ChatService(api).conversations();
      for (final conv in convs) {
        if ((conv['client'] as Map<String, dynamic>?)?['id'] == clientUserId) {
          convId = conv['id'] as int?;
          break;
        }
      }
    } catch (_) {}
    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatScreen(
          conversationId: convId,
          title: name,
          otherPartyId: clientUserId,
          clientId: clientUserId,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final topPanelH = _topPanelHeight(context);
    return Scaffold(
      backgroundColor: DT.bg,
      body: Stack(
        children: [
          Positioned.fill(
            top: topPanelH,
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: DT.primary))
                : RefreshIndicator(
                    color: DT.primary,
                    onRefresh: _load,
                    child: _listOrders.isEmpty ? _emptyList() : _list(),
                  ),
          ),
          Positioned(
            left: 0,
            right: 0,
            top: 0,
            child: _topPanel(today),
          ),
        ],
      ),
    );
  }

  double _topPanelHeight(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    return topPad + 300;
  }

  Widget _topPanel(DateTime today) {
    return GlassContainer(
      tint: ET.glassTint,
      blur: ET.glassBlur,
      opacity: ET.glassOpacity,
      borderRadius: 0,
      showBorder: false,
      padding: EdgeInsets.zero,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _headerRow(),
          _dateStrip(today),
          _summaryCard(),
          _tabBar(),
        ],
      ),
    );
  }

  Widget _headerRow() {
    final topPad = MediaQuery.of(context).padding.top;
    return Padding(
      padding: EdgeInsets.fromLTRB(DT.xl, topPad + DT.sm, DT.xl, DT.md),
      child: SizedBox(
        height: 44,
        child: Row(
          children: [
            const Expanded(child: Text('行程', style: DT.titleLarge)),
            GestureDetector(
              onTap: _openCalendar,
              child: Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                    color: DT.primarySoft, shape: BoxShape.circle),
                child: const Icon(CupertinoIcons.calendar,
                    size: 20, color: DT.primary),
              ),
            ),
          ],
        ),
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
          SizedBox(
              height: 70,
              child: _dateTile(today, isTodayActive, isTodayPill: true)),
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
    final isRestDay = _restDays.contains(_dateKey(d));
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
          color: active ? DT.cream : (isRestDay ? DT.error.withValues(alpha: 0.06) : DT.surfaceAlt),
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
                    color: active ? DT.onCream : (isRestDay ? DT.error.withValues(alpha: 0.65) : DT.textPrimary),
                    height: 1.1)),
            Text('${d.month}月',
                style: TextStyle(
                    fontSize: 11,
                    height: 1,
                    color: active
                        ? DT.onCream.withValues(alpha: 0.75)
                        : DT.textTertiary)),
            const SizedBox(height: 2),
            if (isRestDay && !active)
              Text('休', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w600, color: DT.error.withValues(alpha: 0.6), height: 1))
            else
              Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  color: active
                      ? Colors.white
                      : (hasOrders
                          ? NBColors.action
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
    final isRestDay = _isActiveDateRestDay;
    return ListView(
      children: [
        if (isRestDay) ...[
          const SizedBox(height: 24),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 20),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: DT.error.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Icon(CupertinoIcons.moon_zzz, size: 20, color: DT.error.withValues(alpha: 0.6)),
                const SizedBox(width: 10),
                Expanded(
                  child: Text('该日已设为休息日，不可预约',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: DT.error.withValues(alpha: 0.75))),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 80),
        Center(
          child: Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
                color: isRestDay ? DT.error.withValues(alpha: 0.06) : DT.surfaceAlt,
                borderRadius: BorderRadius.circular(24)),
            child: Icon(
                isRestDay ? CupertinoIcons.moon_zzz : CupertinoIcons.calendar,
                size: 32, color: isRestDay ? DT.error.withValues(alpha: 0.45) : DT.textTertiary),
          ),
        ),
        const SizedBox(height: 14),
        Center(
            child: Text(
                isRestDay ? '休息日' : (_tab == 'trips' ? '当天暂无行程' : '当天暂无预约'),
                style: TextStyle(fontSize: 14, color: isRestDay ? DT.error.withValues(alpha: 0.6) : DT.textMuted))),
      ],
    );
  }

  Widget _orderCard(Map<String, dynamic> o) {
    final customerName = o['customerName']?.toString() ??
        (o['client'] as Map<String, dynamic>?)?['nickname']?.toString() ??
        (o['customer'] as Map<String, dynamic>?)?['name']?.toString() ??
        '客户';
    final customerPhone = o['customerPhone']?.toString();
    return TechnicianAppointmentCard(
      order: o,
      isTrip: _tab == 'trips',
      onTap: () => _openOrderDetail(o['id'] as int),
      onCall: () => _callCustomer(customerPhone),
      onMessage: () => _openChat(o, customerName),
      onNavigate: () => _navigateTo(o['address']?.toString()),
    );
  }

  // ── Helpers ──

  int? _clientUserId(Map<String, dynamic> order) {
    final client = order['client'] as Map<String, dynamic>?;
    final customer = order['customer'] as Map<String, dynamic>?;
    final clientUser = order['clientUser'] as Map<String, dynamic>?;
    final customerClientUser = customer?['clientUser'] as Map<String, dynamic>?;
    return _int(order['clientUserId']) ??
        _int(clientUser?['id']) ??
        _int(client?['id']) ??
        _int(customer?['clientUserId']) ??
        _int(customerClientUser?['id']);
  }

  int? _int(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
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

}

// ───────── 月历弹窗 ─────────

class _CalendarSheet extends StatefulWidget {
  final DateTime initial;
  final Set<String> markedKeys;
  final Set<String> restDayKeys;
  const _CalendarSheet({required this.initial, required this.markedKeys, this.restDayKeys = const {}});

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
              color: DT.surface.withValues(alpha: 0.94),
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
                                style: const TextStyle(
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
      final isRestDay = widget.restDayKeys.contains(_key(d));
      final isToday =
          d.year == today.year && d.month == today.month && d.day == today.day;
      cells.add(GestureDetector(
        onTap: () => setState(() => _selected = d),
        child: Container(
          margin: const EdgeInsets.all(2),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? DT.cream : (isRestDay ? DT.error.withValues(alpha: 0.06) : Colors.transparent),
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
                      color: selected ? DT.onCream : (isRestDay ? DT.error.withValues(alpha: 0.7) : DT.textPrimary))),
              const SizedBox(height: 2),
              if (isRestDay && !selected)
                Text('休', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w600, color: DT.error.withValues(alpha: 0.65), height: 1))
              else
                Container(
                  width: 4,
                  height: 4,
                  decoration: BoxDecoration(
                    color: selected
                        ? DT.onCream
                        : (hasOrders
                            ? NBColors.action
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
