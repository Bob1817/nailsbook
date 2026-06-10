import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/glass_container.dart';
import '../orders/client_create_order_screen.dart';
import '../../../core/widgets/nb_toast.dart';

class ClientWorkDetailScreen extends StatefulWidget {
  final int workId;

  const ClientWorkDetailScreen({super.key, required this.workId});

  @override
  State<ClientWorkDetailScreen> createState() => _ClientWorkDetailScreenState();
}

class _ClientWorkDetailScreenState extends State<ClientWorkDetailScreen> {
  Map<String, dynamic>? _work;
  List<Map<String, dynamic>> _comments = [];
  bool _loading = true;
  bool _liked = false;
  bool _favorited = false;
  int _likeCount = 0;
  int _imageIndex = 0;

  final _scrollCtl = ScrollController();
  final _inputCtl = TextEditingController();
  final _inputFocus = FocusNode();
  // 正在回复的评论：{id, name}
  Map<String, dynamic>? _replyTo;

  @override
  void initState() {
    super.initState();
    _loadWork();
  }

  @override
  void dispose() {
    _scrollCtl.dispose();
    _inputCtl.dispose();
    _inputFocus.dispose();
    super.dispose();
  }

  Future<void> _loadWork() async {
    try {
      final data =
          await context.read<ApiClient>().get('/works/${widget.workId}');
      if (mounted) {
        setState(() {
          _work = data;
          _liked = data['isLiked'] as bool? ?? false;
          _favorited = data['isFavorited'] as bool? ?? false;
          _likeCount = data['likeCount'] as int? ?? 0;
          _comments = (data['comments'] as List<dynamic>?)
                  ?.cast<Map<String, dynamic>>() ??
              [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _reloadComments() async {
    try {
      final data =
          await context.read<ApiClient>().get('/works/${widget.workId}');
      if (mounted)
        setState(() => _comments = (data['comments'] as List<dynamic>?)
                ?.cast<Map<String, dynamic>>() ??
            []);
    } catch (_) {}
  }

  Future<void> _toggleLike() async {
    final next = !_liked;
    setState(() {
      _liked = next;
      _likeCount += next ? 1 : -1;
    });
    try {
      await context.read<ApiClient>().post('/works/${widget.workId}/like');
    } catch (_) {
      if (mounted)
        setState(() {
          _liked = !next;
          _likeCount += next ? -1 : 1;
        });
    }
  }

  Future<void> _toggleFavorite() async {
    final next = !_favorited;
    setState(() => _favorited = next);
    try {
      await context.read<ApiClient>().post('/works/${widget.workId}/favorite');
    } catch (_) {
      if (mounted) setState(() => _favorited = !next);
    }
  }

  void _bookSameStyle() {
    final techId = _work?['technicianId'] as int?;
    Navigator.push(
        context,
        MaterialPageRoute(
            builder: (_) =>
                ClientCreateOrderScreen(preselectedTechId: techId)));
  }

  Future<void> _sendComment() async {
    final content = _inputCtl.text.trim();
    if (content.isEmpty) return;
    final parentId = _replyTo?['id'] as int?;
    _inputCtl.clear();
    setState(() => _replyTo = null);
    _inputFocus.unfocus();
    try {
      await context.read<ApiClient>().post('/works/${widget.workId}/comments',
          body: {
            'content': content,
            if (parentId != null) 'parentId': parentId
          });
      await _reloadComments();
    } catch (_) {
      if (mounted) NbToast.show(context, '评论失败');
    }
  }

  Future<void> _deleteComment(int id) async {
    final api = context.read<ApiClient>();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('删除评论'),
        content: const Text('确定删除这条评论吗？'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: DT.error),
            child: const Text('删除'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await api.delete('/works/${widget.workId}/comments/$id');
      await _reloadComments();
    } catch (_) {
      if (mounted) NbToast.show(context, '删除失败');
    }
  }

  void _startReply(Map<String, dynamic> c) {
    setState(() => _replyTo = {
          'id': c['id'],
          'name': (c['user'] as Map<String, dynamic>?)?['name'] ?? '用户'
        });
    _inputFocus.requestFocus();
  }

  void _openFullscreen(List<String> images, int index) {
    Navigator.push(
        context,
        PageRouteBuilder(
          opaque: false,
          barrierColor: Colors.black,
          pageBuilder: (_, __, ___) =>
              _FullscreenGallery(images: images, initialIndex: index),
        ));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
          backgroundColor: Colors.black,
          body: Center(child: CircularProgressIndicator(color: Colors.white)));
    }
    if (_work == null) return const Scaffold(body: Center(child: Text('加载失败')));

    final images = ((_work!['imageUrls'] as List<dynamic>?) ?? [])
        .map((e) => e.toString())
        .toList();
    final title = _work!['title'] as String? ?? '未命名作品';
    final description = _work!['description'] as String? ?? '';
    final tags = (_work!['tags'] as List<dynamic>?) ?? [];
    final techName = _work!['technicianName']?.toString() ?? '美甲师';
    final techAvatar = _work!['technicianAvatarUrl']?.toString();
    final topPad = MediaQuery.of(context).padding.top;
    final galleryH = MediaQuery.of(context).size.width * 1.2;

    return Scaffold(
      backgroundColor: DT.surface,
      resizeToAvoidBottomInset: true,
      body: Stack(
        children: [
          Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  controller: _scrollCtl,
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 全幅画廊（点击全屏预览）
                      SizedBox(
                        height: galleryH,
                        child: images.isEmpty
                            ? Container(color: const Color(0xFF1A1A1A))
                            : PageView.builder(
                                itemCount: images.length,
                                onPageChanged: (i) =>
                                    setState(() => _imageIndex = i),
                                itemBuilder: (context, index) =>
                                    GestureDetector(
                                  onTap: () => _openFullscreen(images, index),
                                  child: CachedNetworkImage(
                                    imageUrl: images[index],
                                    fit: BoxFit.cover,
                                    placeholder: (_, __) => Container(
                                        color: const Color(0xFF1A1A1A)),
                                    errorWidget: (_, __, ___) => Container(
                                        color: const Color(0xFF1A1A1A),
                                        child: const Icon(
                                            Icons.image_not_supported,
                                            color: Colors.white24)),
                                  ),
                                ),
                              ),
                      ),
                      // 信息面板
                      Transform.translate(
                        offset: const Offset(0, -24),
                        child: Container(
                          width: double.infinity,
                          decoration: const BoxDecoration(
                            color: DT.surface,
                            borderRadius:
                                BorderRadius.vertical(top: Radius.circular(28)),
                          ),
                          padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Center(
                                child: Container(
                                    width: 40,
                                    height: 4,
                                    decoration: BoxDecoration(
                                        color: DT.border,
                                        borderRadius:
                                            BorderRadius.circular(2))),
                              ),
                              const SizedBox(height: 16),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                      child: Text(title, style: DT.titleLarge)),
                                  _actionIcon(
                                      _liked
                                          ? Icons.favorite
                                          : Icons.favorite_border,
                                      _liked ? DT.primary : DT.textTertiary,
                                      _toggleLike,
                                      label: '$_likeCount'),
                                  const SizedBox(width: 4),
                                  _actionIcon(
                                      _favorited
                                          ? Icons.bookmark
                                          : Icons.bookmark_border,
                                      _favorited ? DT.warning : DT.textTertiary,
                                      _toggleFavorite),
                                ],
                              ),
                              if (description.isNotEmpty) ...[
                                const SizedBox(height: 10),
                                Text(description,
                                    style: const TextStyle(
                                        fontSize: 14,
                                        height: 1.6,
                                        color: DT.textSecondary)),
                              ],
                              if (tags.isNotEmpty) ...[
                                const SizedBox(height: 14),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: tags
                                      .map((t) => Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 10, vertical: 5),
                                            decoration: BoxDecoration(
                                                color: DT.surfaceAlt,
                                                borderRadius:
                                                    BorderRadius.circular(999)),
                                            child: Text('#${t.toString()}',
                                                style: const TextStyle(
                                                    fontSize: 12,
                                                    color: DT.textSecondary)),
                                          ))
                                      .toList(),
                                ),
                              ],
                              const SizedBox(height: 18),
                              _technicianRow(techName, techAvatar),
                              const SizedBox(height: 22),
                              Text('评论 (${_comments.length})',
                                  style: DT.titleMedium),
                              const SizedBox(height: 10),
                              if (_comments.isEmpty)
                                const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 16),
                                  child: Center(
                                      child: Text('暂无评论，快来抢沙发！',
                                          style: TextStyle(
                                              fontSize: 13,
                                              color: DT.textMuted))),
                                )
                              else
                                ..._comments.map((c) => _commentTile(c)),
                              const SizedBox(height: 8),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              _commentInputBar(),
            ],
          ),
          // 顶部玻璃返回键 + 页码
          Positioned(
            left: 16,
            right: 16,
            top: topPad + 8,
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: const GlassContainer(
                    tint: Colors.black,
                    opacity: 0.28,
                    blur: DT.glassBlurLight,
                    borderRadius: 999,
                    padding: EdgeInsets.all(9),
                    child: Icon(Icons.arrow_back_ios_new_rounded,
                        size: 18, color: Colors.white),
                  ),
                ),
                const Spacer(),
                if (images.length > 1)
                  GlassContainer(
                    tint: Colors.black,
                    opacity: 0.28,
                    blur: DT.glassBlurLight,
                    borderRadius: 999,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    child: Text('${_imageIndex + 1}/${images.length}',
                        style:
                            const TextStyle(fontSize: 12, color: Colors.white)),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _technicianRow(String techName, String? techAvatar) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: DT.surfaceAlt, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: DT.primarySoft,
            backgroundImage: (techAvatar != null && techAvatar.isNotEmpty)
                ? CachedNetworkImageProvider(techAvatar)
                : null,
            child: (techAvatar == null || techAvatar.isEmpty)
                ? Text(techName.isNotEmpty ? techName.substring(0, 1) : '美',
                    style: const TextStyle(color: DT.primary))
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(techName,
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: DT.textPrimary)),
                const SizedBox(height: 2),
                const Text('发布者',
                    style: TextStyle(fontSize: 12, color: DT.textSecondary)),
              ],
            ),
          ),
          GestureDetector(
            onTap: _bookSameStyle,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
              decoration: BoxDecoration(
                  color: DT.primary, borderRadius: BorderRadius.circular(999)),
              child: const Text('预约同款',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionIcon(IconData icon, Color color, VoidCallback onTap,
      {String? label}) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: color, size: 26),
          if (label != null) ...[
            const SizedBox(width: 4),
            Text(label,
                style: const TextStyle(fontSize: 13, color: DT.textSecondary)),
          ],
        ]),
      ),
    );
  }

  Widget _commentTile(Map<String, dynamic> c, {bool isReply = false}) {
    final user = (c['user'] as Map<String, dynamic>?) ?? {};
    final name = user['name']?.toString() ?? '用户';
    final avatar = user['avatarUrl']?.toString();
    final isTech = user['role'] == 'technician';
    final isAuthor = c['isAuthor'] as bool? ?? false;
    final replies =
        (c['replies'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ??
            const [];

    return Padding(
      padding: EdgeInsets.only(left: isReply ? 36 : 0, top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: isReply ? 13 : 16,
                backgroundColor: DT.primarySoft,
                backgroundImage: (avatar != null && avatar.isNotEmpty)
                    ? CachedNetworkImageProvider(avatar)
                    : null,
                child: (avatar == null || avatar.isEmpty)
                    ? Text(name.substring(0, 1),
                        style: const TextStyle(color: DT.primary, fontSize: 12))
                    : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Text(name,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                              color: DT.textPrimary)),
                      if (isTech) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                              color: DT.primarySoft,
                              borderRadius: BorderRadius.circular(4)),
                          child: const Text('美甲师',
                              style: TextStyle(
                                  fontSize: 9, color: DT.primaryDark)),
                        ),
                      ],
                      const SizedBox(width: 8),
                      Text(_fmtTime(c['createdAt']?.toString()),
                          style: const TextStyle(
                              fontSize: 11, color: DT.textMuted)),
                    ]),
                    const SizedBox(height: 3),
                    Text(c['content']?.toString() ?? '',
                        style: const TextStyle(
                            fontSize: 14, color: DT.textPrimary)),
                    const SizedBox(height: 2),
                    Row(children: [
                      GestureDetector(
                        onTap: () => _startReply(c),
                        behavior: HitTestBehavior.opaque,
                        child: const Padding(
                          padding:
                              EdgeInsets.symmetric(vertical: 6, horizontal: 0),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            Icon(Icons.reply_rounded,
                                size: 14, color: DT.primary),
                            SizedBox(width: 4),
                            Text('回复',
                                style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: DT.primary)),
                          ]),
                        ),
                      ),
                      if (isAuthor) ...[
                        const SizedBox(width: 20),
                        GestureDetector(
                          onTap: () => _deleteComment(c['id'] as int),
                          behavior: HitTestBehavior.opaque,
                          child: const Padding(
                            padding: EdgeInsets.symmetric(vertical: 6),
                            child: Text('删除',
                                style:
                                    TextStyle(fontSize: 12, color: DT.error)),
                          ),
                        ),
                      ],
                    ]),
                  ],
                ),
              ),
            ],
          ),
          ...replies.map((r) => _commentTile(r, isReply: true)),
        ],
      ),
    );
  }

  Widget _commentInputBar() {
    return GlassContainer(
      blur: 30,
      opacity: 0.6,
      borderRadius: 0,
      showBorder: false,
      padding: EdgeInsets.fromLTRB(
          12, 8, 12, 8 + MediaQuery.of(context).padding.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_replyTo != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(children: [
                Text('回复 @${_replyTo!['name']}',
                    style:
                        const TextStyle(fontSize: 12, color: DT.textSecondary)),
                const Spacer(),
                GestureDetector(
                  onTap: () => setState(() => _replyTo = null),
                  child: const Icon(Icons.close_rounded,
                      size: 16, color: DT.textTertiary),
                ),
              ]),
            ),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _inputCtl,
                focusNode: _inputFocus,
                decoration: InputDecoration(
                  hintText:
                      _replyTo != null ? '回复 @${_replyTo!['name']}…' : '写评论…',
                  filled: true,
                  fillColor: DT.surfaceAlt,
                  isDense: true,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
                onSubmitted: (_) => _sendComment(),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _sendComment,
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
        ],
      ),
    );
  }

  String _fmtTime(String? iso) {
    final d = DateTime.tryParse(iso ?? '');
    if (d == null) return '';
    final diff = DateTime.now().difference(d);
    if (diff.inMinutes < 1) return '刚刚';
    if (diff.inMinutes < 60) return '${diff.inMinutes}分钟前';
    if (diff.inHours < 24) return '${diff.inHours}小时前';
    if (diff.inDays < 7) return '${diff.inDays}天前';
    return '${d.month}/${d.day}';
  }
}

/// 图片全屏预览：左右翻页 + 双指缩放 + 点击关闭。
class _FullscreenGallery extends StatefulWidget {
  final List<String> images;
  final int initialIndex;
  const _FullscreenGallery({required this.images, required this.initialIndex});

  @override
  State<_FullscreenGallery> createState() => _FullscreenGalleryState();
}

class _FullscreenGalleryState extends State<_FullscreenGallery> {
  late final PageController _ctl =
      PageController(initialPage: widget.initialIndex);
  late int _index = widget.initialIndex;

  @override
  void dispose() {
    _ctl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          PageView.builder(
            controller: _ctl,
            itemCount: widget.images.length,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (_, i) => GestureDetector(
              onTap: () => Navigator.pop(context),
              child: InteractiveViewer(
                minScale: 1,
                maxScale: 4,
                child: Center(
                  child: CachedNetworkImage(
                    imageUrl: widget.images[i],
                    fit: BoxFit.contain,
                    placeholder: (_, __) => const Center(
                        child: CircularProgressIndicator(color: Colors.white)),
                    errorWidget: (_, __, ___) => const Icon(
                        Icons.image_not_supported,
                        color: Colors.white24,
                        size: 48),
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: 16,
            top: topPad + 8,
            child: GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.18),
                    shape: BoxShape.circle),
                child: const Icon(Icons.close_rounded,
                    color: Colors.white, size: 22),
              ),
            ),
          ),
          if (widget.images.length > 1)
            Positioned(
              bottom: MediaQuery.of(context).padding.bottom + 20,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(999)),
                  child: Text('${_index + 1} / ${widget.images.length}',
                      style:
                          const TextStyle(color: Colors.white, fontSize: 13)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
