
import '../../../core/media/oss_image.dart';
import '../../../core/widgets/fullscreen_gallery.dart';
import '../../../core/widgets/glass_container.dart';
import '../../../core/widgets/glow_field.dart';
import '../orders/client_create_order_screen.dart';

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

  final _sheetCtl = DraggableScrollableController();
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
    _sheetCtl.dispose();
    _inputCtl.dispose();
    _inputFocus.dispose();
    super.dispose();
  }

  /// 展开评论面板（回复时把面板拉起，露出评论与输入区）。
  void _expandSheet() {
    if (!_sheetCtl.isAttached) return;
    _sheetCtl.animateTo(0.94,
        duration: const Duration(milliseconds: 260), curve: Curves.easeOut);
  }

  Future<void> _loadWork() async {
    try {
      final api = context.read<ApiClient>()..setRole('client');
      final data = await api.get('/works/${widget.workId}');
      if (mounted) {
        setState(() {
          _work = data;
          _liked = _bool(data['isLiked'] ?? data['liked']);
          _favorited = _bool(data['isFavorited'] ??
              data['favorited'] ??
              data['isFavorite'] ??
              data['favorite']);
          _likeCount = _int(data['likeCount'] ?? data['likesCount']);
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
      final api = context.read<ApiClient>()..setRole('client');
      final data = await api.get('/works/${widget.workId}');
      if (mounted) {
        setState(() => _comments = (data['comments'] as List<dynamic>?)
                ?.cast<Map<String, dynamic>>() ??
            []);
      }
    } catch (_) {}
  }

  Future<void> _toggleLike() async {
    final next = !_liked;
    setState(() {
      _liked = next;
      _likeCount = (_likeCount + (next ? 1 : -1)).clamp(0, 1 << 31);
    });
    try {
      final api = context.read<ApiClient>()..setRole('client');
      final res = await api.post('/works/${widget.workId}/like');
      final payload = _payload(res);
      if (!mounted) return;
      setState(() {
        _liked = _bool(payload['isLiked'] ?? payload['liked'], fallback: next);
        _likeCount = _int(payload['likeCount'] ?? payload['likesCount'],
            fallback: _likeCount);
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _liked = !next;
          _likeCount = (_likeCount + (next ? -1 : 1)).clamp(0, 1 << 31);
        });
      }
    }
  }

  Future<void> _toggleFavorite() async {
    final next = !_favorited;
    setState(() => _favorited = next);
    try {
      final api = context.read<ApiClient>()..setRole('client');
      final res = await api.post('/works/${widget.workId}/favorite');
      final payload = _payload(res);
      if (!mounted) return;
      setState(() {
        _favorited = _bool(
            payload['isFavorited'] ??
                payload['favorited'] ??
                payload['isFavorite'] ??
                payload['favorite'],
            fallback: next);
      });
    } catch (_) {
      if (mounted) setState(() => _favorited = !next);
    }
  }

  void _bookSameStyle() {
    final techId = _work?['technicianId'] as int?;
    final title = _work?['title']?.toString();
    final images = ((_work?['imageUrls'] as List<dynamic>?) ?? const [])
        .map((e) => e.toString())
        .toList();
    Navigator.push(
        context,
        MaterialPageRoute(
            builder: (_) => ClientCreateOrderScreen(
                  preselectedTechId: techId,
                  // 作品标题/图作为自定义服务内容预填，进入精简向导（方式→时间→确认）
                  preselectedCustomTitle:
                      (title == null || title.isEmpty) ? '同款作品' : title,
                  preselectedCustomImages: images,
                )));
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
    _expandSheet();
    _inputFocus.requestFocus();
  }

  void _openFullscreen(List<String> images, int index) =>
      openFullscreenGallery(context, images.map(ossFull).toList(), index);

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
      backgroundColor: ET.bg,
      resizeToAvoidBottomInset: true,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final availH = constraints.maxHeight;
          const overlap = 24.0;
          final double minSize =
              ((availH - galleryH + overlap) / availH).clamp(0.3, 0.85);
          const double maxSize = 0.94;
          return Stack(
            children: [
              // 固定底层图集（面板可上拉盖住它）
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: galleryH,
                child: images.isEmpty
                    ? Container(color: const Color(0xFF1A1A1A))
                    : PageView.builder(
                        itemCount: images.length,
                        onPageChanged: (i) => setState(() => _imageIndex = i),
                        itemBuilder: (context, index) => GestureDetector(
                          onTap: () => _openFullscreen(images, index),
                          child: CachedNetworkImage(
                            imageUrl: ossDetail(images[index]),
                            fit: BoxFit.cover,
                            placeholder: (_, __) =>
                                Container(color: const Color(0xFF1A1A1A)),
                            errorWidget: (_, __, ___) => Container(
                                color: const Color(0xFF1A1A1A),
                                child: const Icon(Icons.image_not_supported,
                                    color: Colors.white24)),
                          ),
                        ),
                      ),
              ),
              // 可拖动的标题/内容/评论面板（拖动手柄上下滑动展示更多评论）
              DraggableScrollableSheet(
                controller: _sheetCtl,
                initialChildSize: minSize,
                minChildSize: minSize,
                maxChildSize: maxSize,
                builder: (ctx, scrollController) {
                  return Container(
                    decoration: const BoxDecoration(
                      color: ET.bgElevated,
                      borderRadius:
                          BorderRadius.vertical(top: Radius.circular(28)),
                    ),
                    child: ListView(
                      controller: scrollController,
                      keyboardDismissBehavior:
                          ScrollViewKeyboardDismissBehavior.onDrag,
                      padding: const EdgeInsets.fromLTRB(20, 14, 20, 96),
                      children: [
                        Center(
                          child: Container(
                              width: 40,
                              height: 4,
                              decoration: BoxDecoration(
                                  color: ET.hairlineStrong,
                                  borderRadius: BorderRadius.circular(2))),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                                child: Text(title,
                                    style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.w600,
                                        letterSpacing: -0.3,
                                        color: ET.ink))),
                            _actionIcon(
                                _liked
                                    ? Icons.favorite
                                    : Icons.favorite_border,
                                _liked ? ET.like : ET.inkMuted,
                                _toggleLike,
                                label: '$_likeCount'),
                            const SizedBox(width: 4),
                            _actionIcon(
                                _favorited
                                    ? Icons.bookmark
                                    : Icons.bookmark_border,
                                _favorited ? ET.accent : ET.inkMuted,
                                _toggleFavorite),
                          ],
                        ),
                        if (description.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Text(description,
                              style: const TextStyle(
                                  fontSize: 14,
                                  height: 1.6,
                                  color: ET.inkSecondary)),
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
                                          color: ET.surface,
                                          borderRadius:
                                              BorderRadius.circular(999)),
                                      child: Text('#${t.toString()}',
                                          style: const TextStyle(
                                              fontSize: 12,
                                              color: ET.inkSecondary)),
                                    ))
                                .toList(),
                          ),
                        ],
                        const SizedBox(height: 18),
                        _technicianRow(techName, techAvatar),
                        const SizedBox(height: 22),
                        Text('评论 (${_comments.length})',
                            style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w600,
                                color: ET.ink)),
                        const SizedBox(height: 10),
                        if (_comments.isEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(
                                child: Text('暂无评论，快来抢沙发！',
                                    style: TextStyle(
                                        fontSize: 13, color: ET.inkMuted))),
                          )
                        else
                          ..._comments.map((c) => _commentTile(c)),
                        const SizedBox(height: 8),
                      ],
                    ),
                  );
                },
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
              // 底部固定评论输入栏
              Positioned(
                  left: 0, right: 0, bottom: 0, child: _commentInputBar()),
            ],
          );
        },
      ),
    );
  }

  Widget _technicianRow(String techName, String? techAvatar) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: ET.surface, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: ET.accentSoft,
            backgroundImage: (techAvatar != null && techAvatar.isNotEmpty)
                ? CachedNetworkImageProvider(techAvatar)
                : null,
            child: (techAvatar == null || techAvatar.isEmpty)
                ? Text(techName.isNotEmpty ? techName.substring(0, 1) : '美',
                    style: const TextStyle(color: ET.accentOnDark))
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
                        color: ET.ink)),
                const SizedBox(height: 2),
                const Text('发布者',
                    style: TextStyle(fontSize: 12, color: ET.inkSecondary)),
              ],
            ),
          ),
          GestureDetector(
            onTap: _bookSameStyle,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
              decoration: BoxDecoration(
                  color: ET.cream, borderRadius: BorderRadius.circular(999)),
              child: const Text('预约同款',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: ET.onCream)),
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
                style: const TextStyle(fontSize: 13, color: ET.inkSecondary)),
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
                backgroundColor: ET.accentSoft,
                backgroundImage: (avatar != null && avatar.isNotEmpty)
                    ? CachedNetworkImageProvider(avatar)
                    : null,
                child: (avatar == null || avatar.isEmpty)
                    ? Text(name.substring(0, 1),
                        style: const TextStyle(
                            color: ET.accentOnDark, fontSize: 12))
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
                              color: ET.ink)),
                      if (isTech) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                              color: ET.accentSoft,
                              borderRadius: BorderRadius.circular(4)),
                          child: const Text('美甲师',
                              style: TextStyle(
                                  fontSize: 9, color: ET.accentOnDark)),
                        ),
                      ],
                      const SizedBox(width: 8),
                      Text(_fmtTime(c['createdAt']?.toString()),
                          style: const TextStyle(
                              fontSize: 11, color: ET.inkMuted)),
                    ]),
                    const SizedBox(height: 3),
                    Text(c['content']?.toString() ?? '',
                        style: const TextStyle(fontSize: 14, color: ET.ink)),
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
                                size: 14, color: ET.accentOnDark),
                            SizedBox(width: 4),
                            Text('回复',
                                style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: ET.accentOnDark)),
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
      tint: Colors.black,
      blur: 30,
      opacity: 0.55,
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
                        const TextStyle(fontSize: 12, color: ET.inkSecondary)),
                const Spacer(),
                GestureDetector(
                  onTap: () => setState(() => _replyTo = null),
                  child: const Icon(Icons.close_rounded,
                      size: 16, color: ET.inkMuted),
                ),
              ]),
            ),
          Row(children: [
            Expanded(
              child: GlowField(
                controller: _inputCtl,
                focusNode: _inputFocus,
                hint: _replyTo != null ? '回复 @${_replyTo!['name']}…' : '写评论…',
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
                    color: ET.accent, shape: BoxShape.circle),
                child:
                    const Icon(Icons.send_rounded, color: ET.onCream, size: 20),
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

  bool _bool(dynamic value, {bool fallback = false}) {
    if (value is bool) return value;
    if (value is num) return value != 0;
    if (value is String) {
      final normalized = value.toLowerCase().trim();
      if (normalized == 'true' || normalized == '1') return true;
      if (normalized == 'false' || normalized == '0') return false;
    }
    return fallback;
  }

  int _int(dynamic value, {int fallback = 0}) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value) ?? fallback;
    return fallback;
  }

  Map<String, dynamic> _payload(Map<String, dynamic> response) {
    final data = response['data'];
    if (data is Map<String, dynamic>) return data;
    return response;
  }
}
