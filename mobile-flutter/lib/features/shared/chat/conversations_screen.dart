import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import '../../client/orders/client_order_detail_screen.dart';
import 'chat_service.dart';
import 'chat_screen.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

/// 消息页。
/// 客户端：统一收件箱（会话 + 通知聚合，标签：全部/未读/预约提醒/服务提醒/系统通知）。
/// 美甲师端：会话列表。
/// 对齐 webapp client-frontend/src/pages/Chat.tsx。
class ConversationsScreen extends StatefulWidget {
  const ConversationsScreen({super.key});

  @override
  State<ConversationsScreen> createState() => _ConversationsScreenState();
}

enum _ItemType { chat, booking, service, system }

class _InboxItem {
  final _ItemType type;
  final String title;
  final String? avatar;
  final String preview;
  final String time;
  final bool unread;
  final int conversationId;
  final String? relatedType;
  final int? relatedId;

  _InboxItem({
    required this.type,
    required this.title,
    this.avatar,
    required this.preview,
    required this.time,
    required this.unread,
    required this.conversationId,
    this.relatedType,
    this.relatedId,
  });
}

class _ConversationsScreenState extends State<ConversationsScreen> {
  final List<Map<String, dynamic>> _conversations = [];
  final List<_InboxItem> _notifications = [];
  bool _loading = true;
  String _activeTab = 'all';
  bool _isClient = true;

  @override
  void initState() {
    super.initState();
    _isClient = context.read<AuthSession>().isClient;
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final service = ChatService(context.read<ApiClient>());
      final convs = await service.conversations();

      final notifs = <_InboxItem>[];
      if (_isClient) {
        final batches = await Future.wait(convs.map((c) async {
          try {
            return MapEntry(c, await service.messages(c['id'] as int));
          } catch (_) {
            return MapEntry(c, <Map<String, dynamic>>[]);
          }
        }));
        for (final e in batches) {
          final conv = e.key;
          for (final m in e.value) {
            final mt = m['messageType']?.toString();
            final rt = m['relatedType']?.toString();
            final isNotif = (mt == 'system' ||
                    mt == 'booking' ||
                    mt == 'quote' ||
                    mt == 'order') &&
                (rt == 'order' ||
                    rt == 'booking' ||
                    rt == 'comment' ||
                    rt == 'work_comment');
            if (!isNotif) continue;
            final type = _categorize(mt, rt);
            notifs.add(_InboxItem(
              type: type,
              title: _typeName(type),
              preview: m['content']?.toString() ?? '系统通知',
              time: m['createdAt']?.toString() ?? '',
              unread: !(m['isRead'] as bool? ?? false),
              conversationId: conv['id'] as int,
              relatedType: rt,
              relatedId: m['relatedId'] as int?,
            ));
          }
        }
      }

      if (mounted) {
        setState(() {
          _conversations
            ..clear()
            ..addAll(convs.cast<Map<String, dynamic>>());
          _notifications
            ..clear()
            ..addAll(notifs);
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  _ItemType _categorize(String? mt, String? rt) {
    if (rt == 'comment' || rt == 'work_comment') return _ItemType.service;
    if (rt == 'order' ||
        rt == 'booking' ||
        mt == 'quote' ||
        mt == 'order' ||
        mt == 'booking') return _ItemType.booking;
    return _ItemType.system;
  }

  String _typeName(_ItemType t) => switch (t) {
        _ItemType.booking => '预约提醒',
        _ItemType.service => '服务提醒',
        _ItemType.system => '系统通知',
        _ItemType.chat => '聊天',
      };

  List<_InboxItem> get _allItems {
    final chatItems = _conversations.map((conv) {
      final tech = conv['technician'] as Map<String, dynamic>?;
      final client = conv['client'] as Map<String, dynamic>?;
      final party = _isClient ? tech : client;
      final title =
          (party?['name'] ?? party?['nickname'] ?? (_isClient ? '美甲师' : '客户'))
              .toString();
      return _InboxItem(
        type: _ItemType.chat,
        title: title,
        avatar: party?['avatarUrl']?.toString(),
        preview: conv['lastMessage']?.toString() ?? '',
        time: conv['lastMessageAt']?.toString() ?? '',
        unread: (conv['unreadCount'] as int? ?? 0) > 0,
        conversationId: conv['id'] as int,
      );
    }).toList();
    final all = [...chatItems, ..._notifications]
      ..sort((a, b) => b.time.compareTo(a.time));
    return all;
  }

  List<_InboxItem> get _filtered {
    final all = _allItems;
    return all.where((i) {
      if (_activeTab == 'all') return true;
      if (_activeTab == 'unread') return i.unread;
      return i.type.name == _activeTab;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DT.bg,
      appBar: GlassAppBar(title: const Text('消息')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : Column(
              children: [
                if (_isClient) _tabs(),
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
                            itemBuilder: (_, i) => _itemCard(_filtered[i]),
                          ),
                        ),
                ),
              ],
            ),
    );
  }

  Widget _tabs() {
    final all = _allItems;
    final unreadCount = all.where((i) => i.unread).length;
    final tabs = <(String, String, bool)>[
      ('all', '全部', true),
      ('unread', '未读${unreadCount > 0 ? ' $unreadCount' : ''}', true),
      ('booking', '预约提醒', all.any((i) => i.type == _ItemType.booking)),
      ('service', '服务提醒', all.any((i) => i.type == _ItemType.service)),
      ('system', '系统通知', all.any((i) => i.type == _ItemType.system)),
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
          final active = _activeTab == t.$1;
          return GestureDetector(
            onTap: () => setState(() => _activeTab = t.$1),
            child: Container(
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: active ? DT.cream : DT.surface,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: active ? DT.cream : DT.border),
              ),
              child: Text(t.$2,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                    color: active ? DT.onCream : DT.textSecondary,
                  )),
            ),
          );
        },
      ),
    );
  }

  Widget _itemCard(_InboxItem item) {
    final isChat = item.type == _ItemType.chat;
    return GestureDetector(
      onTap: () => _openItem(item),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: DT.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: DT.border)),
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
                          child: Text(item.title,
                              style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: DT.textPrimary))),
                      if (!isChat)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                              color: DT.primarySoft,
                              borderRadius: BorderRadius.circular(6)),
                          child: Text(_typeName(item.type),
                              style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: DT.primaryDark)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(item.preview.isEmpty ? '暂无消息' : item.preview,
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
                Text(_formatTime(item.time),
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

  Widget _leading(_InboxItem item) {
    if (item.type == _ItemType.chat) {
      return CircleAvatar(
        radius: 24,
        backgroundColor: DT.primarySoft,
        backgroundImage: (item.avatar != null && item.avatar!.isNotEmpty)
            ? CachedNetworkImageProvider(item.avatar!)
            : null,
        child: (item.avatar == null || item.avatar!.isEmpty)
            ? Text(item.title.isNotEmpty ? item.title.substring(0, 1) : '?',
                style: const TextStyle(
                    color: DT.primary, fontWeight: FontWeight.w600))
            : null,
      );
    }
    final icon = switch (item.type) {
      _ItemType.booking => Icons.event_note_rounded,
      _ItemType.service => Icons.spa_outlined,
      _ItemType.system => Icons.notifications_none_rounded,
      _ItemType.chat => Icons.chat_bubble_outline_rounded,
    };
    return Container(
      width: 48,
      height: 48,
      decoration:
          const BoxDecoration(color: DT.primarySoft, shape: BoxShape.circle),
      child: Icon(icon, color: DT.primary, size: 22),
    );
  }

  void _openItem(_InboxItem item) {
    if (item.type != _ItemType.chat &&
        _isClient &&
        (item.relatedType == 'order' || item.relatedType == 'booking') &&
        item.relatedId != null) {
      Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) =>
                      ClientOrderDetailScreen(orderId: item.relatedId!)))
          .then((_) => _load());
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
          builder: (_) => ChatScreen(
              conversationId: item.conversationId,
              title: item.type == _ItemType.chat ? item.title : '聊天')),
    ).then((_) => _load());
  }

  String _formatTime(String isoTime) {
    if (isoTime.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoTime);
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1) return '刚刚';
      if (diff.inMinutes < 60) return '${diff.inMinutes}分钟前';
      if (diff.inHours < 24) return '${diff.inHours}小时前';
      if (diff.inDays < 7) return '${diff.inDays}天前';
      return '${dt.month}/${dt.day}';
    } catch (_) {
      return '';
    }
  }
}
