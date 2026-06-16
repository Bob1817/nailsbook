import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' show ImageFilter;

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import '../../../core/media/image_pick.dart';
import 'package:gal/gal.dart';
import 'package:any_link_preview/any_link_preview.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import '../../../core/socket/chat_socket.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/theme/editorial_tokens.dart';
import '../../../core/widgets/nb_toast.dart';
import '../../client/orders/client_order_detail_screen.dart';
import '../../technician/orders/technician_order_detail_screen.dart';
import '../booking/chat_booking_sheet.dart';
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
  final _inputFocus = FocusNode();
  final _scrollCtl = ScrollController();
  int? _otherPartyId;
  int? _conversationId;
  String? _myAvatar;
  String? _otherAvatar;

  // ── 语音 ──
  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _player = AudioPlayer();
  bool _voiceMode = false; // true=按住说话，false=文字
  bool _recording = false;
  bool _cancelArmed = false; // 上滑取消已就绪
  int _recordSeconds = 0;
  Timer? _recordTimer;
  String? _recordPath;
  bool _sendingVoice = false;
  bool _sendingImage = false;
  int? _playingMsgId; // 正在播放的消息 id

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
    _loadAvatars();
    _player.onPlayerComplete.listen((_) {
      if (mounted) setState(() => _playingMsgId = null);
    });
  }

  /// 拉取会话双方真实头像（消息接口不含头像）。
  Future<void> _loadAvatars() async {
    try {
      final api = context.read<ApiClient>();
      final isClient = context.read<AuthSession>().isClient;
      final convs = await ChatService(api).conversations();
      Map<String, dynamic>? conv;
      for (final c in convs) {
        if (_conversationId != null && c['id'] == _conversationId) {
          conv = c;
          break;
        }
      }
      if (conv == null && _otherPartyId != null) {
        for (final c in convs) {
          final tech = c['technician'] as Map<String, dynamic>?;
          final client = c['client'] as Map<String, dynamic>?;
          final other = isClient ? tech : client;
          if (other?['id'] == _otherPartyId) {
            conv = c;
            break;
          }
        }
      }
      if (conv == null || !mounted) return;
      final tech = conv['technician'] as Map<String, dynamic>?;
      final client = conv['client'] as Map<String, dynamic>?;
      setState(() {
        _myAvatar = (isClient ? client : tech)?['avatarUrl']?.toString();
        _otherAvatar = (isClient ? tech : client)?['avatarUrl']?.toString();
      });
    } catch (_) {}
  }

  @override
  void dispose() {
    _inputCtl.dispose();
    _inputFocus.dispose();
    _scrollCtl.dispose();
    _recordTimer?.cancel();
    _recorder.dispose();
    _player.dispose();
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
      // 进入会话即标记该会话所有消息为已读
      try {
        await service.markAsRead(cid);
      } catch (_) {}
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
      if (!mounted) return;
      NbToast.error(context, '发送失败，请重试');
    }
  }

  // ── 语音录制 / 播放 ──

  void _toggleVoiceMode() {
    HapticFeedback.selectionClick();
    if (!_voiceMode) FocusScope.of(context).unfocus();
    setState(() => _voiceMode = !_voiceMode);
  }

  Future<void> _startRecording() async {
    if (_recording || _sendingVoice) return;
    final ok = await _recorder.hasPermission();
    if (!ok) {
      if (mounted) NbToast.error(context, '请在系统设置中允许麦克风权限');
      return;
    }
    final dir = await getTemporaryDirectory();
    final path =
        '${dir.path}/voice_${DateTime.now().millisecondsSinceEpoch}.m4a';
    try {
      await _recorder.start(
          const RecordConfig(encoder: AudioEncoder.aacLc), path: path);
    } catch (_) {
      if (mounted) NbToast.error(context, '无法开始录音');
      return;
    }
    HapticFeedback.mediumImpact();
    _recordPath = path;
    _recordSeconds = 0;
    _cancelArmed = false;
    setState(() => _recording = true);
    _recordTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      setState(() => _recordSeconds++);
      if (_recordSeconds >= 60) _finishRecording(); // 最长 60s 自动结束
    });
  }

  void _updateRecordingDrag(double dy) {
    if (!_recording) return;
    final armed = dy < -70; // 上滑超过阈值进入「取消」区
    if (armed != _cancelArmed) setState(() => _cancelArmed = armed);
  }

  Future<void> _finishRecording() async {
    if (!_recording) return;
    _recordTimer?.cancel();
    final seconds = _recordSeconds;
    final cancel = _cancelArmed;
    setState(() {
      _recording = false;
      _cancelArmed = false;
    });
    String? path;
    try {
      path = await _recorder.stop();
    } catch (_) {}
    final file = path ?? _recordPath;
    if (cancel || seconds < 1) {
      if (!cancel && seconds < 1 && mounted) NbToast.show(context, '说话时间太短');
      if (file != null) {
        try {
          await File(file).delete();
        } catch (_) {}
      }
      return;
    }
    if (file != null) await _sendVoice(file, seconds);
  }

  Future<void> _sendVoice(String filePath, int seconds) async {
    setState(() => _sendingVoice = true);
    HapticFeedback.lightImpact();
    try {
      final api = context.read<ApiClient>();
      final service = ChatService(api);
      final url = await service.uploadAudio(filePath);
      if (url == null) throw Exception('upload failed');
      final msg = await service.sendMessage(
        conversationId: _conversationId,
        techId: _conversationId == null ? widget.techId : null,
        clientId: _conversationId == null ? widget.clientId : null,
        messageType: 'voice',
        imageUrl: url,
        content: seconds.toString(),
      );
      _conversationId ??=
          (msg['conversationId'] as int?) ?? (msg['conversation_id'] as int?);
      if (mounted) setState(() => _messages.add(msg));
      _scrollToBottom();
    } catch (_) {
      if (mounted) NbToast.error(context, '语音发送失败，请重试');
    } finally {
      if (mounted) setState(() => _sendingVoice = false);
      try {
        await File(filePath).delete();
      } catch (_) {}
    }
  }

  Future<void> _playVoice(Map<String, dynamic> msg) async {
    final url = msg['imageUrl']?.toString();
    if (url == null || url.isEmpty) return;
    final id = msg['id'] as int?;
    if (_playingMsgId == id) {
      await _player.stop();
      if (mounted) setState(() => _playingMsgId = null);
      return;
    }
    try {
      await _player.stop();
      await _player.play(UrlSource(url));
      if (mounted) setState(() => _playingMsgId = id);
    } catch (_) {
      if (mounted) NbToast.error(context, '语音播放失败');
    }
  }

  // ── 图片：选择发送 / 预览 / 保存 ──

  Future<void> _pickAndSendImage() async {
    final file = await ImagePick.content();
    if (file == null || !mounted) return;
    HapticFeedback.lightImpact();
    setState(() => _sendingImage = true);
    try {
      final api = context.read<ApiClient>();
      final service = ChatService(api);
      final url = await service.uploadImage(file.path);
      if (url == null) throw Exception('upload failed');
      final msg = await service.sendMessage(
        conversationId: _conversationId,
        techId: _conversationId == null ? widget.techId : null,
        clientId: _conversationId == null ? widget.clientId : null,
        messageType: 'image',
        imageUrl: url,
      );
      _conversationId ??=
          (msg['conversationId'] as int?) ?? (msg['conversation_id'] as int?);
      if (mounted) setState(() => _messages.add(msg));
      _scrollToBottom();
    } catch (_) {
      if (mounted) NbToast.error(context, '图片发送失败，请重试');
    } finally {
      if (mounted) setState(() => _sendingImage = false);
    }
  }

  Widget _sendingImageOverlay() {
    return Positioned.fill(
      child: IgnorePointer(
        child: Container(
          color: Colors.black.withValues(alpha: 0.25),
          alignment: Alignment.center,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18),
            decoration: BoxDecoration(
              color: DT.surface.withValues(alpha: 0.96),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CupertinoActivityIndicator(radius: 14),
                SizedBox(height: 10),
                Text('图片发送中…',
                    style: TextStyle(fontSize: 13, color: DT.textSecondary)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openImageViewer(String url) {
    showDialog<void>(
      context: context,
      barrierColor: Colors.black,
      builder: (dctx) => Stack(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(dctx),
            child: InteractiveViewer(
              minScale: 1,
              maxScale: 4,
              child: Center(
                child: CachedNetworkImage(imageUrl: url, fit: BoxFit.contain),
              ),
            ),
          ),
          Positioned(
            top: MediaQuery.of(dctx).padding.top + 8,
            right: 12,
            child: Row(
              children: [
                _viewerAction(Icons.download_rounded, () => _saveImage(url)),
                const SizedBox(width: 8),
                _viewerAction(Icons.close_rounded, () => Navigator.pop(dctx)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _viewerAction(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle),
        child: Icon(icon, color: Colors.white, size: 22),
      ),
    );
  }

  Future<void> _saveImage(String url) async {
    try {
      if (!await Gal.hasAccess()) {
        if (!await Gal.requestAccess()) {
          if (mounted) NbToast.error(context, '未授权保存到相册');
          return;
        }
      }
      final res = await http.get(Uri.parse(url));
      if (res.statusCode != 200) throw Exception('download failed');
      await Gal.putImageBytes(res.bodyBytes);
      if (mounted) NbToast.success(context, '已保存到相册');
    } catch (_) {
      if (mounted) NbToast.error(context, '保存失败，请重试');
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
    final headerH = topPad + DT.sm + 44 + DT.md;

    return Scaffold(
      backgroundColor: DT.bgWarm,
      body: Stack(
        children: [
          // Main content column
          Column(
            children: [
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
                                DT.xl, headerH + DT.md, DT.xl, DT.md),
                            itemCount: _messages.length,
                            itemBuilder: (context, index) {
                              final authSession = context.read<AuthSession>();
                              final isClient = authSession.isClient;
                              final msg = _messages[index];
                              final isMe = isClient
                                  ? msg['senderType'] == 'client'
                                  : msg['senderType'] == 'technician';
                              final sep = _separatorText(index);
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  if (sep != null) _timeSeparator(sep),
                                  _messageRow(msg, isMe),
                                ],
                              );
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
          if (_recording) _recordingOverlay(),
          if (_sendingImage) _sendingImageOverlay(),
        ],
      ),
    );
  }

  Widget _recordingOverlay() {
    final cancel = _cancelArmed;
    return Positioned.fill(
      child: IgnorePointer(
        child: Container(
          color: Colors.black.withValues(alpha: 0.25),
          alignment: Alignment.center,
          child: Container(
            width: 150,
            padding: const EdgeInsets.symmetric(vertical: 22),
            decoration: BoxDecoration(
              color: (cancel ? DT.error : DT.surface).withValues(alpha: 0.96),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(cancel ? Icons.delete_outline : Icons.mic,
                    size: 40, color: Colors.white),
                const SizedBox(height: 14),
                Text(
                    '${_recordSeconds ~/ 60}:${(_recordSeconds % 60).toString().padLeft(2, '0')}',
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Colors.white)),
                const SizedBox(height: 10),
                Text(cancel ? '松开手指，取消发送' : '手指上滑，取消发送',
                    style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withValues(alpha: 0.9))),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _header(double topPad) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: ET.glassBlur, sigmaY: ET.glassBlur),
        child: Container(
          decoration: const BoxDecoration(
            color: ET.glassFill,
            border: Border(
              bottom: BorderSide(color: ET.hairlineFaint, width: 0.5),
            ),
          ),
          padding: EdgeInsets.fromLTRB(DT.xl, topPad + DT.sm, DT.xl, DT.md),
          child: SizedBox(
            height: 44,
            child: Stack(
              alignment: Alignment.center,
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      Navigator.pop(context);
                    },
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: DT.surface.withValues(alpha: 0.36),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(CupertinoIcons.back,
                          size: 18, color: DT.textPrimary),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 64),
                  child: Text(widget.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: DT.titleMedium),
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: GestureDetector(
                    onTap: _openBookingSheet,
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: DT.primarySoft.withValues(alpha: 0.86),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(CupertinoIcons.calendar_badge_plus,
                          size: 20, color: DT.primary),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _inputBar(double bottomPad) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: ET.glassBlur, sigmaY: ET.glassBlur),
        child: Container(
          decoration: const BoxDecoration(
            color: ET.glassFill,
            border: Border(
              top: BorderSide(color: ET.hairlineFaint, width: 0.5),
            ),
          ),
          padding: EdgeInsets.fromLTRB(DT.xl, DT.sm, DT.xl, bottomPad + DT.sm),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // 语音 / 键盘 切换
              GestureDetector(
                onTap: _toggleVoiceMode,
                child: Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    color: DT.surfaceAlt,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                      _voiceMode
                          ? CupertinoIcons.keyboard
                          : CupertinoIcons.mic,
                      size: 20,
                      color: DT.textPrimary),
                ),
              ),
              const SizedBox(width: DT.sm),
              Expanded(
                  child: _voiceMode ? _holdToTalkButton() : _textInput()),
              if (!_voiceMode) ...[
                const SizedBox(width: DT.sm),
                GestureDetector(
                  onTap: _pickAndSendImage,
                  child: Container(
                    width: 40,
                    height: 40,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      color: DT.surfaceAlt,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(CupertinoIcons.photo,
                        size: 20, color: DT.textPrimary),
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
            ],
          ),
        ),
      ),
    );
  }

  Widget _textInput() {
    return AnimatedBuilder(
      animation: _inputFocus,
      builder: (context, child) {
        final focused = _inputFocus.hasFocus;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          decoration: BoxDecoration(
            color: focused ? DT.surface.withValues(alpha: 0.84) : DT.surfaceAlt,
            borderRadius: BorderRadius.circular(20),
            boxShadow: focused
                ? [
                    BoxShadow(
                      color: DT.primary.withValues(alpha: 0.22),
                      blurRadius: 18,
                      spreadRadius: 1,
                      offset: const Offset(0, 0),
                    ),
                    BoxShadow(
                      color: Colors.white.withValues(alpha: 0.28),
                      blurRadius: 10,
                      spreadRadius: -2,
                      offset: const Offset(0, -1),
                    ),
                  ]
                : null,
          ),
          child: child,
        );
      },
      child: TextField(
        controller: _inputCtl,
        focusNode: _inputFocus,
        style: DT.bodyMedium.copyWith(color: DT.textPrimary),
        minLines: 1,
        maxLines: 4,
        textInputAction: TextInputAction.send,
        onSubmitted: (_) => _sendMessage(),
        decoration: InputDecoration(
          hintText: '输入消息…',
          hintStyle: DT.bodyMedium.copyWith(color: DT.textTertiary),
          filled: true,
          fillColor: Colors.transparent,
          isDense: true,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: BorderSide.none),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: BorderSide.none),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: BorderSide.none),
        ),
      ),
    );
  }

  Widget _holdToTalkButton() {
    final active = _recording;
    return GestureDetector(
      onLongPressStart: (_) => _startRecording(),
      onLongPressMoveUpdate: (d) =>
          _updateRecordingDrag(d.localOffsetFromOrigin.dy),
      onLongPressEnd: (_) => _finishRecording(),
      onLongPressCancel: () {
        if (_recording) _finishRecording();
      },
      child: Container(
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: active ? DT.primary.withValues(alpha: 0.18) : DT.surfaceAlt,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: active ? DT.primary : Colors.transparent, width: 1),
        ),
        child: Text(active ? '松开 发送' : '按住 说话',
            style: DT.bodyMedium
                .copyWith(color: DT.textPrimary, fontWeight: FontWeight.w600)),
      ),
    );
  }

  // ── 微信式消息时间分隔 ──

  DateTime? _msgTime(int index) =>
      DateTime.tryParse(_messages[index]['createdAt']?.toString() ?? '')
          ?.toLocal();

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  /// 返回该消息上方应显示的时间文案；不显示则返回 null。
  /// 规则（参考微信）：首条显示日期；跨天显示日期；同日间隔 ≥5 分钟显示时间。
  String? _separatorText(int index) {
    final cur = _msgTime(index);
    if (cur == null) return null;
    final prev = index > 0 ? _msgTime(index - 1) : null;
    final newDay = prev == null || !_sameDay(cur, prev);
    final bigGap = prev != null && cur.difference(prev).inMinutes.abs() >= 5;
    if (index == 0 || newDay) return _fmtSep(cur, withDate: true);
    if (bigGap) return _fmtSep(cur, withDate: false);
    return null;
  }

  String _fmtSep(DateTime dt, {required bool withDate}) {
    final now = DateTime.now();
    final hm =
        '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    if (!withDate) return hm;
    if (_sameDay(dt, now)) return hm;
    if (_sameDay(dt, now.subtract(const Duration(days: 1)))) return '昨天 $hm';
    if (dt.year == now.year) return '${dt.month}月${dt.day}日 $hm';
    return '${dt.year}年${dt.month}月${dt.day}日 $hm';
  }

  Widget _timeSeparator(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: ET.surfaceGlass,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(text,
              style: const TextStyle(fontSize: 11, color: ET.inkMuted)),
        ),
      ),
    );
  }

  Widget _msgAvatar(bool isMe) {
    final url = isMe ? _myAvatar : _otherAvatar;
    if (url != null && url.isNotEmpty) {
      return ClipOval(
        child: CachedNetworkImage(
          imageUrl: url,
          width: 36,
          height: 36,
          fit: BoxFit.cover,
          placeholder: (_, __) => Container(width: 36, height: 36, color: ET.surface),
          errorWidget: (_, __, ___) => _avatarFallback(isMe),
        ),
      );
    }
    return _avatarFallback(isMe);
  }

  Widget _avatarFallback(bool isMe) {
    final letter = isMe
        ? '我'
        : (widget.title.isNotEmpty ? widget.title.substring(0, 1) : '美');
    return Container(
      width: 36,
      height: 36,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isMe ? ET.accent : ET.accentSoft,
      ),
      child: Text(letter,
          style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isMe ? ET.onCream : ET.accentOnDark)),
    );
  }

  /// 微信式一行：对方头像在左、我方头像在右，消息在头像旁。
  Widget _messageRow(Map<String, dynamic> msg, bool isMe) {
    final bubble = _buildBubble(msg, isMe);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        mainAxisAlignment:
            isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: isMe
            ? [Flexible(child: bubble), const SizedBox(width: 8), _msgAvatar(true)]
            : [_msgAvatar(false), const SizedBox(width: 8), Flexible(child: bubble)],
      ),
    );
  }

  Widget _buildBubble(Map<String, dynamic> msg, bool isMe) {
    if (msg['messageType'] == 'order_card') return _orderCard(msg, isMe);
    if (msg['messageType'] == 'voice') return _voiceBubble(msg, isMe);
    final hasImage = msg['imageUrl'] != null;
    final hasText =
        msg['content'] != null && msg['content'].toString().isNotEmpty;

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.66),
        child: Column(
          crossAxisAlignment:
              isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (hasImage)
              GestureDetector(
                onTap: () => _openImageViewer(msg['imageUrl'].toString()),
                child: Container(
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
            if (hasText && _firstUrl(msg['content'].toString()) != null)
              _linkPreview(_firstUrl(msg['content'].toString())!),
          ],
        ),
      ),
    );
  }

  // ── 链接预览 ──

  String? _firstUrl(String text) =>
      RegExp(r'https?://[^\s]+').firstMatch(text)?.group(0);

  Future<void> _openLink(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {}
  }

  Widget _linkPreview(String url) {
    return Container(
      margin: const EdgeInsets.only(top: 4),
      constraints: const BoxConstraints(maxWidth: 240),
      child: AnyLinkPreview(
        link: url,
        displayDirection: UIDirection.uiDirectionHorizontal,
        backgroundColor: DT.surface,
        borderRadius: 12,
        removeElevation: true,
        bodyMaxLines: 2,
        cache: const Duration(days: 7),
        titleStyle: const TextStyle(
            fontSize: 13, fontWeight: FontWeight.w600, color: DT.textPrimary),
        bodyStyle: const TextStyle(fontSize: 11, color: DT.textSecondary),
        errorTitle: '链接',
        errorBody: url,
        onTap: () => _openLink(url),
      ),
    );
  }

  // ── 语音消息气泡（messageType == voice）──

  Widget _voiceBubble(Map<String, dynamic> msg, bool isMe) {
    final seconds = int.tryParse(msg['content']?.toString() ?? '') ?? 0;
    final playing = _playingMsgId == (msg['id'] as int?);
    // 气泡宽度随时长增长（微信式）
    final width = (70 + seconds * 6).clamp(70, 180).toDouble();
    final color = isMe ? DT.primary : DT.surface;
    final fg = isMe ? DT.onCream : DT.textPrimary;
    final icon =
        playing ? CupertinoIcons.waveform : CupertinoIcons.volume_up;
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        onTap: () => _playVoice(msg),
        child: Container(
          width: width,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(18),
              topRight: const Radius.circular(18),
              bottomLeft: Radius.circular(isMe ? 18 : 4),
              bottomRight: Radius.circular(isMe ? 4 : 18),
            ),
          ),
          child: Row(
            mainAxisAlignment:
                isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
            children: isMe
                ? [
                    Text("$seconds''", style: TextStyle(fontSize: 13, color: fg)),
                    const SizedBox(width: 8),
                    Icon(icon, size: 18, color: fg),
                  ]
                : [
                    Icon(icon, size: 18, color: fg),
                    const SizedBox(width: 8),
                    Text("$seconds''", style: TextStyle(fontSize: 13, color: fg)),
                  ],
          ),
        ),
      ),
    );
  }

  // ── 预约卡片消息（messageType == order_card）──

  Widget _orderCard(Map<String, dynamic> msg, bool isMe) {
    Map<String, dynamic> data = {};
    try {
      final raw = msg['content'];
      if (raw is String && raw.isNotEmpty) {
        data = jsonDecode(raw) as Map<String, dynamic>;
      }
    } catch (_) {}
    final orderId = (msg['relatedId'] as int?) ?? (data['orderId'] as int?);
    final start =
        DateTime.tryParse(data['startTime']?.toString() ?? '')?.toLocal();
    final end =
        DateTime.tryParse(data['endTime']?.toString() ?? '')?.toLocal();
    final isShop = data['serviceType'] == 'shop';
    final theme = data['customTitle']?.toString();
    final address = data['address']?.toString();

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        margin: const EdgeInsets.symmetric(vertical: 2),
        decoration: BoxDecoration(
          color: DT.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: DT.border),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.12),
                blurRadius: 10,
                offset: const Offset(0, 3)),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              color: DT.primarySoft.withValues(alpha: 0.5),
              child: Row(
                children: [
                  const Icon(Icons.event_note_rounded,
                      size: 16, color: DT.primary),
                  const SizedBox(width: 6),
                  const Text('预约详情',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: DT.primary)),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                        color: DT.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(999)),
                    child: Text(isShop ? '到店美甲' : '上门美甲',
                        style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: DT.primary)),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _cardRow(Icons.calendar_today_rounded, '预约日期',
                      _cardDate(start)),
                  _cardRow(Icons.schedule_rounded, '预约时间',
                      _cardTime(start, end)),
                  if (theme != null && theme.isNotEmpty)
                    _cardRow(Icons.brush_outlined, '服务主题', theme),
                  if (address != null && address.isNotEmpty)
                    _cardRow(Icons.location_on_outlined,
                        isShop ? '店铺地址' : '上门地址', address),
                  _cardRow(Icons.payments_outlined, '服务价格',
                      _money(data['price'])),
                  _cardRow(Icons.account_balance_wallet_outlined, '预收定金',
                      _money(data['depositAmount'])),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap:
                        orderId == null ? null : () => _openOrderDetail(orderId),
                    child: Container(
                      width: double.infinity,
                      height: 38,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                          color: DT.primary,
                          borderRadius: BorderRadius.circular(10)),
                      child: const Text('查看详情',
                          style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Colors.white)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _cardRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: DT.textMuted),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(fontSize: 13, color: DT.textMuted)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(value,
                textAlign: TextAlign.right,
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: DT.textPrimary)),
          ),
        ],
      ),
    );
  }

  String _cardDate(DateTime? d) {
    if (d == null) return '--';
    const wk = ['一', '二', '三', '四', '五', '六', '日'];
    return '${d.month}月${d.day}日 周${wk[d.weekday - 1]}';
  }

  String _cardTime(DateTime? s, DateTime? e) {
    if (s == null) return '--';
    String hm(DateTime t) =>
        '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    return e == null ? hm(s) : '${hm(s)} - ${hm(e)}';
  }

  String _money(dynamic v) {
    final n = v is num ? v : num.tryParse(v?.toString() ?? '');
    if (n == null || n == 0) return '¥0';
    return '¥${n.toInt()}';
  }

  void _openOrderDetail(int orderId) {
    final isClient = context.read<AuthSession>().isClient;
    // 移动端最优：底部上滑 action sheet + 背景模糊蒙版；点击蒙版关闭。
    showGeneralDialog<void>(
      context: context,
      barrierDismissible: true,
      barrierLabel: '关闭',
      barrierColor: Colors.black.withValues(alpha: 0.28),
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (dctx, animation, _) {
        final h = MediaQuery.of(dctx).size.height;
        final fade = CurvedAnimation(parent: animation, curve: Curves.easeOut);
        final slide = Tween<Offset>(
                begin: const Offset(0, 1), end: Offset.zero)
            .animate(
                CurvedAnimation(parent: animation, curve: Curves.easeOutCubic));
        return Stack(
          children: [
            // 模糊蒙版：点击非弹窗区域即关闭
            FadeTransition(
              opacity: fade,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => Navigator.of(dctx).pop(),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                  child: const SizedBox.expand(),
                ),
              ),
            ),
            // 底部上滑卡片
            Align(
              alignment: Alignment.bottomCenter,
              child: SlideTransition(
                position: slide,
                child: ClipRRect(
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(24)),
                  child: SizedBox(
                    width: double.infinity,
                    height: h * 0.9,
                    child: MediaQuery.removePadding(
                      context: dctx,
                      removeTop: true,
                      child: isClient
                          ? ClientOrderDetailScreen(orderId: orderId)
                          : TechnicianOrderDetailScreen(orderId: orderId),
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
