import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import '../../../core/socket/chat_socket.dart';
import '../booking/chat_booking_sheet.dart';
import 'chat_service.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

class ChatScreen extends StatefulWidget {
  final int? conversationId;
  final String title;
  final int? otherPartyId;

  /// 直接开聊：尚无会话时按美甲师/对方 id 发起新会话。
  final int? techId;

  const ChatScreen({
    super.key,
    this.conversationId,
    required this.title,
    this.otherPartyId,
    this.techId,
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
  int? _conversationId;

  @override
  void initState() {
    super.initState();
    _otherPartyId = widget.otherPartyId ?? widget.techId;
    _conversationId = widget.conversationId;
    if (_conversationId != null) {
      _loadMessages();
    } else {
      _loading = false; // 新会话：空白等待首条消息
    }
    _listenSocket();
    if (_otherPartyId == null && _conversationId != null)
      _resolveOtherPartyId();
  }

  @override
  void dispose() {
    _inputCtl.dispose();
    _scrollCtl.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    final cid = _conversationId;
    if (cid == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final apiClient = context.read<ApiClient>();
      final service = ChatService(apiClient);
      final messages = await service.messages(cid);
      if (mounted) {
        setState(() {
          _messages = messages;
          _loading = false;
        });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted)
        setState(() {
          _loading = false;
        });
    }
  }

  void _listenSocket() {
    final chatSocket = context.read<ChatSocket>();
    chatSocket.onMessageNew.listen((data) {
      if (_conversationId != null &&
          data['conversationId'] == _conversationId) {
        setState(() {
          _messages.add(data);
        });
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
        conversationId: _conversationId,
        techId: _conversationId == null ? widget.techId : null,
        messageType: 'text',
        content: text,
      );
      // 新会话首条消息：记录后端返回的 conversationId
      _conversationId ??=
          (msg['conversationId'] as int?) ?? (msg['conversation_id'] as int?);
      setState(() {
        _messages.add(msg);
      });
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
            (c) => c?["id"] == _conversationId,
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
      NbToast.show(context, '无法获取对方信息，请从消息列表重新进入');
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
      backgroundColor: DT.bg,
      appBar: GlassAppBar(
        title: Text(widget.title),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: TextButton.icon(
              onPressed: _openBookingSheet,
              icon: const Icon(Icons.calendar_today_rounded,
                  size: 16, color: DT.primary),
              label: const Text('发起预约',
                  style: TextStyle(
                      color: DT.primary, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
      body: Column(children: [
        Expanded(
          child: _loading
              ? const Center(
                  child: CircularProgressIndicator(color: DT.primary))
              : _messages.isEmpty
                  ? const Center(
                      child: Text('暂无消息，发条消息打个招呼吧～',
                          style: TextStyle(color: DT.textMuted)))
                  : ListView.builder(
                      controller: _scrollCtl,
                      keyboardDismissBehavior:
                          ScrollViewKeyboardDismissBehavior.onDrag,
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
            decoration: const BoxDecoration(
              color: DT.surface,
              border: Border(top: BorderSide(color: DT.divider)),
            ),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: _inputCtl,
                  decoration: InputDecoration(
                    hintText: '输入消息…',
                    filled: true,
                    fillColor: DT.surfaceAlt,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(999),
                        borderSide: BorderSide.none),
                    enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(999),
                        borderSide: BorderSide.none),
                    focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(999),
                        borderSide:
                            const BorderSide(color: DT.primary, width: 1.2)),
                  ),
                  minLines: 1,
                  maxLines: 4,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: _sendMessage,
                child: Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                      color: DT.primary, shape: BoxShape.circle),
                  child: const Icon(Icons.send_rounded,
                      color: Colors.white, size: 20),
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
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: isMe ? DT.primary : DT.surface,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(isMe ? 18 : 4),
            bottomRight: Radius.circular(isMe ? 4 : 18),
          ),
          border: isMe ? null : Border.all(color: DT.border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (msg['imageUrl'] != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.network(msg['imageUrl'].toString(),
                  width: 200, fit: BoxFit.cover),
            ),
          if (msg['content'] != null)
            Text(
              msg['content'].toString(),
              style: TextStyle(
                  color: isMe ? Colors.white : DT.textPrimary,
                  fontSize: 15,
                  height: 1.4),
            ),
        ]),
      ),
    );
  }
}
