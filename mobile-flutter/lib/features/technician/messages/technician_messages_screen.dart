import 'package:nailbook_mobile/core/widgets/glass_container.dart';

import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../shared/chat/chat_service.dart';
import '../../shared/chat/chat_screen.dart';
import '../orders/technician_order_detail_screen.dart';

/// 美甲师「消息」统一收件箱：会话 + 订单衍生通知（待处理/服务提醒/系统通知）。
/// 对齐 webapp technician-frontend/src/pages/MessagesPage.tsx。
class TechnicianMessagesScreen extends StatefulWidget {
  /// 初始过滤 tab：'all'（全部）/ 'unread'（未读）/ 'pending' / 'service' / 'system'。
  final String initialTab;
  const TechnicianMessagesScreen({super.key, this.initialTab = 'all'});

  @override
  State<TechnicianMessagesScreen> createState() =>
      _TechnicianMessagesScreenState();
}

enum _T { chat, pending, service, system }

class _Item {
  final _T type;
  final String name;
  final String? avatar;
  final String badge;
  final String preview;
  final String time;
  final bool unread;
  final int? conversationId;
  final int? orderId;

  _Item({
    required this.type,
    required this.name,
    this.avatar,
    this.badge = '',
    required this.preview,
    required this.time,
    required this.unread,
    this.conversationId,
    this.orderId,
  });
}

class _TechnicianMessagesScreenState extends State<TechnicianMessagesScreen> {
  List<_Item> _items = [];
  bool _loading = true;
  late String _tab = widget.initialTab;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = context.read<ApiClient>();
      final results = await Future.wait([
        ChatService(api).conversations(),
        api.getList('/orders'),
      ]);
      final convs = (results[0]).cast<Map<String, dynamic>>();
      final orders = (results[1]).cast<Map<String, dynamic>>();
      if (mounted)
        setState(() {
          _items = _build(convs, orders);
          _loading = false;
        });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _custName(Map<String, dynamic> o) =>
      (o['customer'] as Map<String, dynamic>?)?['name']?.toString() ??
      (o['client'] as Map<String, dynamic>?)?['nickname']?.toString() ??
      o['customerName']?.toString() ??
      '客户';

  String _svcName(Map<String, dynamic> o) =>
      o['serviceType']?.toString() ?? o['serviceName']?.toString() ?? '预约服务';

  bool _deposit(Map<String, dynamic> o) =>
      (o['depositPaid'] ?? o['isDepositPaid']) as bool? ?? false;

  List<_Item> _build(
      List<Map<String, dynamic>> convs, List<Map<String, dynamic>> orders) {
    final items = <_Item>[];

    // 会话
    for (final c in convs) {
      final client = c['client'] as Map<String, dynamic>?;
      items.add(_Item(
        type: _T.chat,
        name: client?['nickname']?.toString() ??
            client?['phone']?.toString() ??
            '客户',
        avatar: client?['avatarUrl']?.toString(),
        preview: c['lastMessage']?.toString() ?? '暂无消息',
        time: c['lastMessageAt']?.toString() ?? '',
        unread: (c['unreadCount'] as int? ?? 0) > 0,
        conversationId: c['id'] as int,
      ));
    }

    // 待确认
    for (final o in orders.where((o) => o['status'] == 'pending_confirm')) {
      items.add(_Item(
        type: _T.pending,
        name: _custName(o),
        badge: '待确认',
        preview: '预约待确认：${_svcName(o)}',
        time: o['startTime']?.toString() ?? '',
        unread: true,
        orderId: o['id'] as int,
      ));
    }
    // 定金待收
    for (final o in orders
        .where((o) =>
            !_deposit(o) &&
            o['status'] != 'cancelled' &&
            o['status'] != 'completed')
        .take(4)) {
      items.add(_Item(
        type: _T.pending,
        name: _custName(o),
        badge: '定金待收',
        preview: '请跟进 ${_svcName(o)} 的定金确认',
        time: o['startTime']?.toString() ?? '',
        unread: true,
        orderId: o['id'] as int,
      ));
    }
    // 服务提醒
    for (final o in orders
        .where((o) =>
            ['pending_home', 'pending_shop', 'completed'].contains(o['status']))
        .take(6)) {
      final done = o['status'] == 'completed';
      items.add(_Item(
        type: _T.service,
        name: _custName(o),
        badge: done ? '已完成' : '待服务',
        preview:
            done ? '服务完成：${_svcName(o)}，记得跟进复购与评价' : '服务提醒：${_svcName(o)} 即将开始',
        time: o['startTime']?.toString() ?? '',
        unread: !done,
        orderId: o['id'] as int,
      ));
    }
    // 系统通知（今日安排）
    final today = DateTime.now();
    final todayCount = orders.where((o) {
      final d = DateTime.tryParse(o['startTime']?.toString() ?? '');
      return d != null &&
          d.year == today.year &&
          d.month == today.month &&
          d.day == today.day;
    }).length;
    items.add(_Item(
      type: _T.system,
      name: '系统通知',
      badge: '系统',
      preview: '今日共有 $todayCount 个预约安排，请注意准时上门。',
      time: today.toIso8601String(),
      unread: false,
    ));

    items.sort((a, b) => b.time.compareTo(a.time));
    return items;
  }

  List<_Item> get _filtered => _items.where((i) {
        if (_tab == 'all') return true;
        if (_tab == 'unread') return i.unread;
        return i.type.name == _tab;
      }).toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DT.bg,
      appBar: GlassAppBar(title: const Text('消息')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : Column(
              children: [
                _tabs(),
                Expanded(
                  child: _filtered.isEmpty
                      ? const Center(
                          child: Text('暂无消息',
                              style: TextStyle(color: DT.textMuted)))
                      : RefreshIndicator(
                          color: DT.primary,
                          onRefresh: _load,
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                            itemCount: _filtered.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 8),
                            itemBuilder: (_, i) => _card(_filtered[i]),
                          ),
                        ),
                ),
              ],
            ),
    );
  }

  Widget _tabs() {
    final unread = _items.where((i) => i.unread).length;
    final tabs = <(String, String, bool)>[
      ('all', '全部', true),
      ('unread', '未读${unread > 0 ? ' $unread' : ''}', true),
      ('pending', '待处理', _items.any((i) => i.type == _T.pending)),
      ('service', '服务提醒', _items.any((i) => i.type == _T.service)),
      ('system', '系统通知', _items.any((i) => i.type == _T.system)),
    ].where((t) => t.$3).toList();
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: tabs.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final t = tabs[i];
          final active = _tab == t.$1;
          return GestureDetector(
            onTap: () => setState(() => _tab = t.$1),
            child: Container(
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: active ? DT.textPrimary : DT.surface,
                borderRadius: BorderRadius.circular(DT.rFull),
                border: Border.all(color: active ? DT.textPrimary : DT.border),
              ),
              child: Text(t.$2,
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                      color: active ? Colors.white : DT.textSecondary)),
            ),
          );
        },
      ),
    );
  }

  Widget _card(_Item item) {
    final isChat = item.type == _T.chat;
    return GestureDetector(
      onTap: () => _open(item),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: DT.surface,
          borderRadius: BorderRadius.circular(DT.radius16),
          border: Border.all(color: DT.border),
          boxShadow: DT.shadowTile,
        ),
        child: Row(
          children: [
            _leading(item),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                          child: Text(item.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: DT.textPrimary))),
                      if (!isChat && item.badge.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                              color: DT.primarySoft,
                              borderRadius: BorderRadius.circular(6)),
                          child: Text(item.badge,
                              style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: DT.primaryDark)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(item.preview,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 13, color: DT.textSecondary)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(_fmt(item.time),
                    style: const TextStyle(fontSize: 11, color: DT.textMuted)),
                if (item.unread) ...[
                  const SizedBox(height: 6),
                  Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                          color: DT.primary, shape: BoxShape.circle)),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _leading(_Item item) {
    if (item.type == _T.chat) {
      return CircleAvatar(
        radius: 24,
        backgroundColor: DT.primarySoft,
        backgroundImage: (item.avatar != null && item.avatar!.isNotEmpty)
            ? CachedNetworkImageProvider(item.avatar!)
            : null,
        child: (item.avatar == null || item.avatar!.isEmpty)
            ? Text(item.name.isNotEmpty ? item.name.substring(0, 1) : '?',
                style: const TextStyle(
                    color: DT.primary, fontWeight: FontWeight.w600))
            : null,
      );
    }
    final icon = switch (item.type) {
      _T.pending => Icons.assignment_late_outlined,
      _T.service => Icons.event_note_rounded,
      _T.system => Icons.notifications_none_rounded,
      _T.chat => Icons.chat_bubble_outline_rounded,
    };
    return Container(
      width: 48,
      height: 48,
      decoration:
          const BoxDecoration(color: DT.primarySoft, shape: BoxShape.circle),
      child: Icon(icon, color: DT.primary, size: 22),
    );
  }

  void _open(_Item item) {
    if (item.type == _T.chat && item.conversationId != null) {
      Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) => ChatScreen(
                  conversationId: item.conversationId!,
                  title: item.name))).then((_) => _load());
    } else if (item.orderId != null) {
      Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) =>
                      TechnicianOrderDetailScreen(orderId: item.orderId!)))
          .then((_) => _load());
    }
  }

  String _fmt(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '';
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return '刚刚';
    if (diff.inMinutes < 60) return '${diff.inMinutes}分钟前';
    if (diff.inHours < 24) return '${diff.inHours}小时前';
    if (diff.inDays < 7) return '${diff.inDays}天前';
    return '${dt.month}/${dt.day}';
  }
}
