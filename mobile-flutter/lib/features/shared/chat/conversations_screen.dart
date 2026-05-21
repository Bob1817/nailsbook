import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import 'chat_service.dart';
import 'chat_screen.dart';

class ConversationsScreen extends StatefulWidget {
  const ConversationsScreen({super.key});

  @override
  State<ConversationsScreen> createState() => _ConversationsScreenState();
}

class _ConversationsScreenState extends State<ConversationsScreen> {
  List<Map<String, dynamic>> _conversations = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  Future<void> _loadConversations() async {
    try {
      final apiClient = context.read<ApiClient>();
      final service = ChatService(apiClient);
      final conversations = await service.conversations();
      if (mounted) setState(() { _conversations = conversations; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final authSession = context.read<AuthSession>();

    return Scaffold(
      appBar: AppBar(title: const Text('消息')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _conversations.isEmpty
              ? const Center(child: Text('暂无会话'))
              : RefreshIndicator(
                  onRefresh: _loadConversations,
                  child: ListView.builder(
                    itemCount: _conversations.length,
                    itemBuilder: (context, index) {
                      final conv = _conversations[index];
                      final conversationId = conv['id'] as int;
                      final lastMessage = conv['lastMessage'] as String? ?? '';
                      final lastTime = conv['lastMessageAt'] as String? ?? '';

                      String title;
                      if (authSession.isClient) {
                        title = (conv['technician'] as Map<String, dynamic>?)?['name']?.toString() ?? '美甲师';
                      } else {
                        title = (conv['client'] as Map<String, dynamic>?)?['nickname']?.toString() ?? '客户';
                      }

                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: const Color(0xFFE91E63),
                            child: Text(title.substring(0, 1), style: const TextStyle(color: Colors.white)),
                          ),
                          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(lastMessage, maxLines: 1, overflow: TextOverflow.ellipsis),
                          trailing: Text(_formatTime(lastTime), style: const TextStyle(fontSize: 12, color: Color(0xFF757575))),
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ChatScreen(conversationId: conversationId, title: title),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  String _formatTime(String isoTime) {
    if (isoTime.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoTime);
      final now = DateTime.now();
      final diff = now.difference(dt);
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