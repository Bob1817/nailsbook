import 'dart:ui' show ImageFilter;

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import '../../../core/socket/chat_socket.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/nb_toast.dart';
import '../booking/chat_booking_sheet.dart';
import '../../client/orders/tech_availability_sheet.dart';
import 'chat_service.dart';

class ChatScreen extends StatefulWidget {
  final int? conversationId;
  final String title;
  final int? otherPartyId;
  final int? techId;
  final int? clientId;

  const ChatScreen({
    super.key,
    this.conversationId,
    required this.title,
    this.otherPartyId,
    this.techId,
    this.clientId,
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
    _otherPartyId = widget.otherPartyId ?? widget.techId ?? widget.clientId;
    _conversationId = widget.conversationId;
    if (_conversationId != null) {
      _loadMessages();
    } else {
      _loading = false;
    }
    _listenSocket();
    if (_otherPartyId == null && _conversationId != null) {
      _resolveOtherPartyId();
    }
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
      if (mounted) setState(() => _loading = false);
    }
  }

  void _listenSocket() {
    final chatSocket = context.read<ChatSocket>();
    chatSocket.onMessageNew.listen((data) {
      if (_conversationId != null &&
          data['conversationId'] == _conversationId) {
        setState(() => _messages.add(data));
        _scrollToBottom();
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _inputCtl.text.trim();
    if (text.isEmpty) return;
    _inputCtl.clear();
    HapticFeedback.lightImpact();

    try {
      final apiClient = context.read<ApiClient>();
      final service = ChatService(apiClient);
      final msg = await service.sendMessage(
        conversationId: _conversationId,
        techId: _conversationId == null ? widget.techId : null,
        clientId: _conversationId == null ? widget.clientId : null,
        messageType: 'text',
        content: text,
      );
      _conversationId ??=
          (msg['conversationId'] as int?) ?? (msg['conversation_id'] as int?);
      setState(() => _messages.add(msg));
      _scrollToBottom();
    } catch (_) {
      NbToast.error(context, '发送失败，请重试');
    }
  }

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
    final topPad = MediaQuery.of(context).padding.top;
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: DT.bgWarm,
      body: Stack(
        children: [
          // Main content column
          Column(
            children: [
              // Spacer for header
              SizedBox(height: topPad + 52),
              // Messages area
              Expanded(
                child: _loading
                    ? const Center(
                        child: CupertinoActivityIndicator(radius: 14))
                    : _messages.isEmpty
                        ? Center(
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
                                  child: const Icon(
                                      CupertinoIcons.chat_bubble_2,
                                      size: 26,
                                      color: DT.textTertiary),
                                ),
                                const SizedBox(height: DT.md),
                                Text('暂无消息，发条消息打个招呼吧',
                                    style: DT.bodyMedium
                                        .copyWith(color: DT.textMuted)),
                              ],
                            ),
                          )
                        : ListView.builder(
                            controller: _scrollCtl,
                            keyboardDismissBehavior:
                                ScrollViewKeyboardDismissBehavior.onDrag,
                            padding: EdgeInsets.fromLTRB(
                                DT.xl, DT.md, DT.xl, DT.md),
                            itemCount: _messages.length,
                            itemBuilder: (context, index) {
                              final authSession = context.read<AuthSession>();
                              final isClient = authSession.isClient;
                              final msg = _messages[index];
                              final isMe = isClient
                                  ? msg['senderType'] == 'client'
                                  : msg['senderType'] == 'technician';
                              return _buildBubble(msg, isMe);
                            },
                          ),
              ),
              // Input bar
              _inputBar(bottomPad),
            ],
          ),
          // Floating glass header
          Positioned(
            left: 0,
            right: 0,
            top: 0,
            child: _header(topPad),
          ),
        ],
      ),
    );
  }

  Widget _header(double topPad) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 32, sigmaY: 32),
        child: Container(
          decoration: BoxDecoration(
            color: DT.surface.withValues(alpha: 0.72),
            border: Border(
              bottom: BorderSide(
                  color: Colors.black.withValues(alpha: 0.06), width: 0.5),
            ),
          ),
          padding: EdgeInsets.fromLTRB(DT.xl, topPad + DT.sm, DT.xl, DT.md),
          child: Row(
            children: [
              GestureDetector(
                onTap: () {
                  HapticFeedback.lightImpact();
                  Navigator.pop(context);
                },
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: DT.surface.withValues(alpha: 0.45),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(CupertinoIcons.back,
                      size: 18, color: DT.textPrimary),
                ),
              ),
              const SizedBox(width: DT.sm),
              if (widget.techId != null)
                GestureDetector(
                  onTap: () => showTechAvailabilitySheet(context,
                      techId: widget.techId),
                  child: Container(
                    width: 36,
                    height: 36,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                        color: DT.primarySoft, shape: BoxShape.circle),
                    child: Text(
                        widget.title.isNotEmpty
                            ? widget.title.substring(0, 1)
                            : '美',
                        style: const TextStyle(
                            color: DT.primaryDark,
                            fontSize: 14,
                            fontWeight: FontWeight.w600)),
                  ),
                ),
              const SizedBox(width: DT.sm),
              Expanded(
                child: Text(widget.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: DT.titleMedium),
              ),
              GestureDetector(
                onTap: _openBookingSheet,
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: DT.primarySoft,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(CupertinoIcons.calendar_badge_plus,
                      size: 20, color: DT.primary),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _inputBar(double bottomPad) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 28, sigmaY: 28),
        child: Container(
          decoration: BoxDecoration(
            color: DT.surface.withValues(alpha: 0.82),
            border: Border(
              top: BorderSide(
                  color: Colors.black.withValues(alpha: 0.06), width: 0.5),
            ),
          ),
          padding:
              EdgeInsets.fromLTRB(DT.xl, DT.sm, DT.xl, bottomPad + DT.sm),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: TextField(
                  controller: _inputCtl,
                  style: DT.bodyMedium.copyWith(color: DT.textPrimary),
                  minLines: 1,
                  maxLines: 4,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _sendMessage(),
                  decoration: InputDecoration(
                    hintText: '输入消息…',
                    hintStyle: DT.bodyMedium.copyWith(color: DT.textTertiary),
                    filled: true,
                    fillColor: DT.surfaceAlt,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: BorderSide.none),
                    enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: BorderSide.none),
                    focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide:
                            const BorderSide(color: DT.primary, width: 1.2)),
                  ),
                ),
              ),
              const SizedBox(width: DT.sm),
              GestureDetector(
                onTap: _sendMessage,
                child: Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: DT.primary,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                          color: DT.primary.withValues(alpha: 0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4)),
                    ],
                  ),
                  child: const Icon(CupertinoIcons.arrow_up,
                      color: Colors.white, size: 20),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBubble(Map<String, dynamic> msg, bool isMe) {
    final hasImage = msg['imageUrl'] != null;
    final hasText = msg['content'] != null && msg['content'].toString().isNotEmpty;

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 3),
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
        child: Column(
          crossAxisAlignment:
              isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (hasImage)
              Container(
                margin: const EdgeInsets.only(bottom: 4),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: CachedNetworkImage(
                    imageUrl: msg['imageUrl'].toString(),
                    width: 200,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(
                        width: 200, height: 120, color: DT.surfaceAlt),
                    errorWidget: (_, __, ___) => Container(
                      width: 200,
                      height: 120,
                      color: DT.surfaceAlt,
                      child: const Icon(CupertinoIcons.photo,
                          color: DT.textTertiary),
                    ),
                  ),
                ),
              ),
            if (hasText)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isMe ? DT.primary : DT.surface,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(18),
                    topRight: const Radius.circular(18),
                    bottomLeft: Radius.circular(isMe ? 18 : 4),
                    bottomRight: Radius.circular(isMe ? 4 : 18),
                  ),
                  boxShadow: isMe
                      ? [
                          BoxShadow(
                              color: DT.primary.withValues(alpha: 0.2),
                              blurRadius: 8,
                              offset: const Offset(0, 2)),
                        ]
                      : [
                          BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 8,
                              offset: const Offset(0, 2)),
                        ],
                ),
                child: Text(
                  msg['content'].toString(),
                  style: DT.bodyMedium.copyWith(
                    color: isMe ? DT.onCream : DT.textPrimary,
                    height: 1.45,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
