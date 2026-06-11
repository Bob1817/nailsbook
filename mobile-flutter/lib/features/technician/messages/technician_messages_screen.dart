import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/glass_container.dart';
import '../../../core/widgets/technician_glass_header.dart';
import '../../shared/chat/chat_service.dart';
import '../../shared/chat/chat_screen.dart';
import '../orders/technician_order_detail_screen.dart';

/// 美甲师「消息」统一收件箱：会话 + 预约衍生通知（待处理/服务提醒/系统通知）。
/// 对齐 webapp technician-frontend/src/pages/MessagesPage.tsx。
/// 设计风格对齐客户列表页（Stack + 浮动玻璃头部 + 柔玻璃卡片）。
class TechnicianMessagesScreen extends StatefulWidget {
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
  String _search = '';
  final _searchCtl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtl.dispose();
    super.dispose();
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
      if (mounted) {
        setState(() {
          _items = _build(convs, orders);
          _loading = false;
        });
      }
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

  List<_Item> get _filtered {
    final base = _items.where((i) {
      if (_tab == 'all') return true;
      if (_tab == 'unread') return i.unread;
      return i.type.name == _tab;
    });
    if (_search.trim().isEmpty) return base.toList();
    final q = _search.trim().toLowerCase();
    return base
        .where((i) =>
            i.name.toLowerCase().contains(q) ||
            i.preview.toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    final headerH =
        TechnicianGlassHeader.estimateHeight(context, belowHeight: 102);

    return Scaffold(
      backgroundColor: DT.bg,
      body: _loading
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(height: topPad + 60),
                  const CupertinoActivityIndicator(radius: 14),
                ],
              ),
            )
          : Stack(
              children: [
                // Scrollable content (extends behind header)
                _filtered.isEmpty
                    ? Padding(
                        padding: EdgeInsets.only(top: headerH + 40),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  color: DT.surfaceAlt,
                                  borderRadius: BorderRadius.circular(18),
                                ),
                                child: const Icon(CupertinoIcons.chat_bubble_2,
                                    size: 26, color: DT.textTertiary),
                              ),
                              const SizedBox(height: DT.md),
                              Text('暂无消息',
                                  style: DT.bodyMedium
                                      .copyWith(color: DT.textMuted)),
                            ],
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        color: DT.primary,
                        onRefresh: _load,
                        child: ListView.separated(
                          padding: EdgeInsets.fromLTRB(
                              DT.xl, headerH + DT.sm, DT.xl, 110),
                          itemCount: _filtered.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 10),
                          itemBuilder: (_, i) => _card(_filtered[i]),
                        ),
                      ),
                // Floating glass header
                Positioned(
                  left: 0,
                  right: 0,
                  top: 0,
                  child: _header(),
                ),
              ],
            ),
    );
  }

  Widget _header() {
    final unread = _items.where((i) => i.unread).length;
    return TechnicianGlassHeader(
      title: '消息',
      below: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 40,
            decoration: BoxDecoration(
              color: DT.surfaceAlt,
              borderRadius: BorderRadius.circular(12),
            ),
            child: TextField(
              controller: _searchCtl,
              textAlignVertical: TextAlignVertical.center,
              style: DT.bodyMedium.copyWith(color: DT.textPrimary),
              onChanged: (v) => setState(() => _search = v),
              decoration: InputDecoration(
                hintText: '搜索消息内容或客户名称',
                hintStyle: DT.bodyMedium.copyWith(color: DT.textTertiary),
                prefixIcon: const Icon(CupertinoIcons.search,
                    size: 18, color: DT.textTertiary),
                suffixIcon: _search.isNotEmpty
                    ? GestureDetector(
                        onTap: () {
                          _searchCtl.clear();
                          setState(() => _search = '');
                        },
                        child: const Icon(CupertinoIcons.xmark_circle_fill,
                            size: 18, color: DT.textTertiary),
                      )
                    : null,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                isCollapsed: true,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 4, vertical: 11),
              ),
            ),
          ),
          const SizedBox(height: DT.md),
          _tabs(unread),
        ],
      ),
    );
  }

  Widget _tabs(int unread) {
    final tabs = <(String, String, bool)>[
      ('all', '全部', true),
      ('unread', '未读${unread > 0 ? ' $unread' : ''}', true),
      ('pending', '待处理', _items.any((i) => i.type == _T.pending)),
      ('service', '服务提醒', _items.any((i) => i.type == _T.service)),
      ('system', '系统通知', _items.any((i) => i.type == _T.system)),
    ].where((t) => t.$3).toList();

    return SizedBox(
      height: 34,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: tabs.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final t = tabs[i];
          final active = _tab == t.$1;
          return GestureDetector(
            onTap: () {
              HapticFeedback.selectionClick();
              setState(() => _tab = t.$1);
            },
            child: Container(
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: active ? DT.cream : DT.surface,
                borderRadius: BorderRadius.circular(DT.rFull),
                border: Border.all(color: active ? DT.textPrimary : DT.border),
              ),
              child: Text(t.$2,
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                      color: active ? DT.onCream : DT.textSecondary)),
            ),
          );
        },
      ),
    );
  }

  Widget _card(_Item item) {
    final isChat = item.type == _T.chat;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _open(item),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
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
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
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
                            style: DT.titleSmall),
                      ),
                      if (!isChat && item.badge.isNotEmpty)
                        Container(
                          margin: const EdgeInsets.only(left: 6),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: _badgeColor(item.type).$1,
                            borderRadius: BorderRadius.circular(DT.rFull),
                          ),
                          child: Text(item.badge,
                              style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: _badgeColor(item.type).$2)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(item.preview,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: DT.bodySmall
                          .copyWith(color: DT.textSecondary, height: 1.4)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(_fmt(item.time),
                    style: DT.captionLarge.copyWith(color: DT.textMuted)),
                if (item.unread) ...[
                  const SizedBox(height: 6),
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                        color: DT.primary, shape: BoxShape.circle),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  (Color, Color) _badgeColor(_T type) {
    switch (type) {
      case _T.pending:
        return (const Color(0xFFFFF1E5), DT.actionOrange);
      case _T.service:
        return (const Color(0xFFEEF9F1), DT.actionGreen);
      case _T.system:
        return (const Color(0xFFEBF4FF), DT.actionBlue);
      default:
        return (DT.primarySoft, DT.primary);
    }
  }

  Widget _leading(_Item item) {
    if (item.type == _T.chat) {
      if (item.avatar != null && item.avatar!.isNotEmpty) {
        return ClipOval(
          child: CachedNetworkImage(
            imageUrl: item.avatar!,
            width: 44,
            height: 44,
            fit: BoxFit.cover,
            placeholder: (_, __) =>
                Container(width: 44, height: 44, color: DT.primarySoft),
            errorWidget: (_, __, ___) => _avatarFallback(item.name),
          ),
        );
      }
      return _avatarFallback(item.name);
    }
    final (icon, color) = switch (item.type) {
      _T.pending => (CupertinoIcons.exclamationmark_circle, DT.actionOrange),
      _T.service => (CupertinoIcons.clock, DT.actionGreen),
      _T.system => (CupertinoIcons.bell, DT.actionBlue),
      _T.chat => (CupertinoIcons.chat_bubble_2, DT.primary),
    };
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: _badgeColor(item.type).$1,
        shape: BoxShape.circle,
      ),
      child: Icon(icon, color: color, size: 20),
    );
  }

  Widget _avatarFallback(String name) {
    return Container(
      width: 44,
      height: 44,
      alignment: Alignment.center,
      decoration:
          const BoxDecoration(color: DT.primarySoft, shape: BoxShape.circle),
      child: Text(name.isNotEmpty ? name.substring(0, 1) : '?',
          style: const TextStyle(
              fontSize: 16, fontWeight: FontWeight.w600, color: DT.primary)),
    );
  }

  void _open(_Item item) {
    HapticFeedback.lightImpact();
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
