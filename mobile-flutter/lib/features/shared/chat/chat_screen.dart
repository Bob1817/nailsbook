import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import '../../../core/socket/chat_socket.dart';
import '../booking/chat_booking_sheet.dart';
import 'chat_service.dart';

class ChatScreen extends StatefulWidget {
  final int conversationId;
  final String title;
  final int? otherPartyId;

  const ChatScreen({
    super.key,
    required this.conversationId,
    required this.title,
    this.otherPartyId,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  List<Map<String, dynamic>> _messages = [];
  bool _loading = true;
  final _inputCtl = TextEditingController();
  final _scrollCtl = ScrollController();
  int? _otherPartyId;

  @override
  void initState() {
    super.initState();
    _otherPartyId = widget.otherPartyId;
    _loadMessages();
    _listenSocket();
    if (_otherPartyId == null) _resolveOtherPartyId();
  }

  @override
  void dispose() {
    _inputCtl.dispose();
    _scrollCtl.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    try {
      final apiClient = context.read<ApiClient>();
      final service = ChatService(apiClient);
      final messages = await service.messages(widget.conversationId);
      if (mounted) {
        setState(() { _messages = messages; _loading = false; });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  void _listenSocket() {
    final chatSocket = context.read<ChatSocket>();
    chatSocket.onMessageNew.listen((data) {
      if (data['conversationId'] == widget.conversationId) {
        setState(() { _messages.add(data); });
        _scrollToBottom();
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _inputCtl.text.trim();
    if (text.isEmpty) return;
    _inputCtl.clear();

    try {
      final apiClient = context.read<ApiClient>();
      final service = ChatService(apiClient);
      final msg = await service.sendMessage(
        conversationId: widget.conversationId,
        messageType: 'text',
        content: text,
      );
      setState(() { _messages.add(msg); });
      _scrollToBottom();
    } catch (_) {}
  }

  /// Resolve the other party's id when opened via a deep link (which only
  /// carries conversationId). Looks up the conversation in the list and
  /// extracts the technician id (client side) or client-user id (technician side).
  Future<void> _resolveOtherPartyId() async {
    final authSession = context.read<AuthSession>();
    final isClient = authSession.isClient;
    try {
      final api = context.read<ApiClient>();
      final convs = await ChatService(api).conversations();
      final conv = convs.cast<Map<String, dynamic>?>().firstWhere(
            (c) => c?['id'] == widget.conversationId,
            orElse: () => null,
          );
      if (conv == null) return;
      final party = (isClient ? conv['technician'] : conv['client'])
          as Map<String, dynamic>?;
      final id = party?['id'] as int?;
      if (id != null && mounted) setState(() => _otherPartyId = id);
    } catch (_) {}
  }

  Future<void> _openBookingSheet() async {
    final otherPartyId = _otherPartyId;
    if (otherPartyId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('无法获取对方信息，请从消息列表重新进入')),
      );
      return;
    }
    await showChatBookingSheet(context, otherPartyId: otherPartyId);
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtl.hasClients) {
        _scrollCtl.animateTo(
          _scrollCtl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final authSession = context.read<AuthSession>();
    final isClient = authSession.isClient;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: TextButton.icon(
              onPressed: _openBookingSheet,
              icon: const Icon(Icons.calendar_today_rounded, size: 16, color: Color(0xFFE91E63)),
              label: const Text('发起预约', style: TextStyle(color: Color(0xFFE91E63), fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
      body: Column(children: [
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _messages.isEmpty
                  ? const Center(child: Text('暂无消息'))
                  : ListView.builder(
                      controller: _scrollCtl,
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        final msg = _messages[index];
                        final isMe = isClient
                            ? msg['senderType'] == 'client'
                            : msg['senderType'] == 'technician';
                        return _buildMessageBubble(msg, isMe);
                      },
                    ),
        ),
        SafeArea(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
            ),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: _inputCtl,
                  decoration: const InputDecoration(
                    hintText: '输入消息...',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  minLines: 1,
                  maxLines: 4,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.send, color: Color(0xFFE91E63)),
                onPressed: _sendMessage,
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFFFCE4EC),
                  minimumSize: const Size(44, 44),
                ),
              ),
            ]),
          ),
        ),
      ]),
    );
  }

  Widget _buildMessageBubble(Map<String, dynamic> msg, bool isMe) {
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: isMe ? const Color(0xFFE91E63) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (msg['imageUrl'] != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(msg['imageUrl'].toString(), width: 200, fit: BoxFit.cover),
            ),
          if (msg['content'] != null)
            Text(
              msg['content'].toString(),
              style: TextStyle(color: isMe ? Colors.white : Colors.black87, fontSize: 15),
            ),
        ]),
      ),
    );
  }
}