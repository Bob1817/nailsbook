import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/nb_toast.dart';
import 'technician_work_service.dart';
import 'technician_work_share_sheet.dart';

/// 美甲师端作品详情 + 评论管理。
/// 对齐 webapp WorksPage 中的「详情大图 + 标题 + 评论列表 + 评论输入」 + 评论操作（置顶/隐藏/删除/回复）。
class TechnicianWorkDetailScreen extends StatefulWidget {
  final Map<String, dynamic> work;
  final String? invitationCode;
  final String? technicianName;

  const TechnicianWorkDetailScreen({
    super.key,
    required this.work,
    this.invitationCode,
    this.technicianName,
  });

  @override
  State<TechnicianWorkDetailScreen> createState() => _TechnicianWorkDetailScreenState();
}

class _TechnicianWorkDetailScreenState extends State<TechnicianWorkDetailScreen> {
  late Map<String, dynamic> _work = Map<String, dynamic>.from(widget.work);
  List<Map<String, dynamic>> _comments = [];
  bool _loading = true;
  bool _changed = false; // 关闭时通知列表刷新
  int _imageIndex = 0;

  final _scrollCtl = ScrollController();
  final _inputCtl = TextEditingController();
  final _inputFocus = FocusNode();
  Map<String, dynamic>? _replyTo;

  TechnicianWorkService get _service => TechnicianWorkService(context.read<ApiClient>());

  @override
  void initState() {
    super.initState();
    _loadComments();
    _markRead();
  }

  @override
  void dispose() {
    _scrollCtl.dispose();
    _inputCtl.dispose();
    _inputFocus.dispose();
    super.dispose();
  }

  Future<void> _loadComments() async {
    try {
      final c = await _service.comments(_work['id'] as int);
      if (mounted) setState(() { _comments = c; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markRead() async {
    final unread = (_work['unreadComments'] as int? ?? 0) +
        (_work['unreadLikes'] as int? ?? 0) +
        (_work['unreadFavorites'] as int? ?? 0);
    if (unread == 0) return;
    try { await _service.markCommentsAsRead(_work['id'] as int); _changed = true; } catch (_) {}
  }

  Future<void> _refreshWork() async {
    try {
      final fresh = await _service.detail(_work['id'] as int);
      if (mounted) setState(() => _work = fresh);
      _changed = true;
    } catch (_) {}
  }

  // ── 作品级操作 ──

  Future<void> _togglePinned() async {
    try { await _service.togglePinned(_work['id'] as int); _changed = true; await _refreshWork();
      if (mounted) NbToast.success(context, (_work['isPinned'] as bool? ?? false) ? '已置顶' : '已取消置顶');
    } catch (_) { if (mounted) NbToast.error(context, '操作失败'); }
  }
  Future<void> _toggleFeatured() async {
    try { await _service.toggleFeatured(_work['id'] as int); _changed = true; await _refreshWork();
      if (mounted) NbToast.success(context, (_work['isFeatured'] as bool? ?? false) ? '已设为推荐' : '已取消推荐');
    } catch (_) { if (mounted) NbToast.error(context, '操作失败'); }
  }
  Future<void> _toggleVisible() async {
    try { await _service.toggleVisible(_work['id'] as int); _changed = true; await _refreshWork();
      if (mounted) NbToast.success(context, (_work['isVisible'] as bool? ?? true) ? '作品已显示' : '作品已隐藏');
    } catch (_) { if (mounted) NbToast.error(context, '操作失败'); }
  }
  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('删除作品'),
        content: const Text('确定要删除该作品吗？删除后无法恢复。'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), style: TextButton.styleFrom(foregroundColor: DT.error), child: const Text('删除')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _service.delete(_work['id'] as int);
      if (mounted) {
        Navigator.pop(context, true);
        NbToast.success(context, '作品已删除');
      }
    } catch (_) { if (mounted) NbToast.error(context, '删除失败'); }
  }

  void _showWorkActions() {
    final pinned = _work['isPinned'] as bool? ?? false;
    final feat = _work['isFeatured'] as bool? ?? false;
    final vis = _work['isVisible'] as bool? ?? true;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _glassSheet(
        radius: 24,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _grabber(),
            _sheetAction(ctx, CupertinoIcons.pin, pinned ? '取消置顶' : '置顶', _togglePinned),
            _sheetAction(ctx, CupertinoIcons.star, feat ? '取消推荐' : '设为推荐', _toggleFeatured),
            _sheetAction(ctx, vis ? CupertinoIcons.eye_slash : CupertinoIcons.eye, vis ? '隐藏作品' : '显示作品', _toggleVisible),
            _sheetAction(ctx, CupertinoIcons.share, '分享作品', () => TechnicianWorkShareSheet.show(context, work: _work, invitationCode: widget.invitationCode, technicianName: widget.technicianName)),
            const Divider(height: 1, color: DT.divider),
            _sheetAction(ctx, CupertinoIcons.trash, '删除作品', _delete, danger: true),
            const Divider(height: 1, color: DT.divider),
            _sheetAction(ctx, null, '取消', null, center: true),
            const SizedBox(height: 4),
          ],
        ),
      ),
    );
  }

  // ── 评论 ──

  Future<void> _sendComment() async {
    final text = _inputCtl.text.trim();
    if (text.isEmpty) return;
    final parentId = _replyTo?['id'] as int?;
    _inputCtl.clear();
    setState(() => _replyTo = null);
    _inputFocus.unfocus();
    try {
      await _service.addComment(_work['id'] as int, text, parentId: parentId);
      _changed = true;
      await _loadComments();
    } catch (_) {
      if (mounted) NbToast.error(context, '评论失败，请重试');
    }
  }

  /// 点击某条评论 → 引用并准备回复（输入栏出现引用预览，发送后嵌套到该条下方）。
  void _startReply(Map<String, dynamic> c) {
    setState(() => _replyTo = {
      'id': c['id'],
      'name': (c['user'] as Map<String, dynamic>?)?['name'] ?? '用户',
      'content': c['content']?.toString() ?? '',
    });
    _inputFocus.requestFocus();
  }

  Future<void> _pinComment(Map<String, dynamic> c) async {
    try { final r = await _service.pinComment(_work['id'] as int, c['id'] as int); _changed = true;
      if (mounted) NbToast.success(context, (r['pinned'] == true) ? '评论已置顶' : '已取消置顶');
      _loadComments();
    } catch (_) { if (mounted) NbToast.error(context, '操作失败'); }
  }
  Future<void> _hideComment(Map<String, dynamic> c) async {
    try { final r = await _service.hideComment(_work['id'] as int, c['id'] as int); _changed = true;
      if (mounted) NbToast.success(context, (r['hidden'] == true) ? '评论已隐藏' : '评论已取消隐藏');
      _loadComments();
    } catch (_) { if (mounted) NbToast.error(context, '操作失败'); }
  }
  Future<void> _deleteComment(Map<String, dynamic> c) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('删除评论'),
        content: const Text('确定删除这条评论吗？'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), style: TextButton.styleFrom(foregroundColor: DT.error), child: const Text('删除')),
        ],
      ),
    );
    if (ok != true) return;
    try { await _service.deleteComment(_work['id'] as int, c['id'] as int); _changed = true;
      if (mounted) NbToast.success(context, '评论已删除'); _loadComments();
    } catch (_) { if (mounted) NbToast.error(context, '删除失败'); }
  }

  void _showCommentActions(Map<String, dynamic> c) {
    final pinned = c['isPinned'] as bool? ?? false;
    final hidden = c['isHidden'] as bool? ?? false;
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _glassSheet(
        radius: 20,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _grabber(),
            _sheetAction(ctx, CupertinoIcons.pin, pinned ? '取消置顶' : '置顶评论', () => _pinComment(c)),
            _sheetAction(ctx, hidden ? CupertinoIcons.eye : CupertinoIcons.eye_slash, hidden ? '取消隐藏' : '隐藏评论', () => _hideComment(c)),
            const Divider(height: 1, color: DT.divider),
            _sheetAction(ctx, CupertinoIcons.trash, '删除评论', () => _deleteComment(c), danger: true),
            const Divider(height: 1, color: DT.divider),
            _sheetAction(ctx, null, '取消', null, center: true),
            const SizedBox(height: 4),
          ],
        ),
      ),
    );
  }

  // ── UI 通用 ──

  Widget _glassSheet({required double radius, required Widget child}) {
    return ClipRRect(
      borderRadius: BorderRadius.vertical(top: Radius.circular(radius)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Container(
          decoration: BoxDecoration(color: DT.surface.withOpacity(0.92), borderRadius: BorderRadius.vertical(top: Radius.circular(radius))),
          child: SafeArea(top: false, child: child),
        ),
      ),
    );
  }

  Widget _grabber() => Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Container(width: 38, height: 4, decoration: BoxDecoration(color: DT.border, borderRadius: BorderRadius.circular(2))),
      );

  /// 操作弹层行：图标 + 文字始终居中显示。
  /// [center]=true 表示「取消」按钮（无图标 + 灰色文字）。
  Widget _sheetAction(BuildContext ctx, IconData? icon, String label, VoidCallback? onTap, {bool danger = false, bool center = false}) {
    final color = danger ? DT.error : DT.textPrimary;
    return InkWell(
      onTap: () { Navigator.pop(ctx); onTap?.call(); },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 15),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 20, color: danger ? DT.error : DT.textSecondary),
              const SizedBox(width: 10),
            ],
            Text(label,
                style: TextStyle(
                  fontSize: 15.5,
                  fontWeight: center ? FontWeight.w500 : FontWeight.w400,
                  color: center ? DT.textMuted : color,
                )),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final imgs = ((_work['imageUrls'] as List<dynamic>?) ?? const []).map((e) => e.toString()).toList();
    final topPad = MediaQuery.of(context).padding.top;
    final galleryH = MediaQuery.of(context).size.width * 1.1;
    final title = _work['title']?.toString();
    final desc = _work['description']?.toString() ?? '';
    final tags = ((_work['tags'] as List<dynamic>?) ?? const []).map((e) => e.toString()).toList();
    final price = (_work['price'] as num?)?.toDouble() ?? 0;

    return WillPopScope(
      onWillPop: () async { Navigator.pop(context, _changed); return false; },
      child: Scaffold(
        backgroundColor: DT.surface,
        resizeToAvoidBottomInset: true,
        body: Stack(
          children: [
            Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    controller: _scrollCtl,
                    keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 顶部图集
                        SizedBox(
                          height: galleryH,
                          child: imgs.isEmpty
                              ? Container(color: const Color(0xFF1A1A1A))
                              : PageView.builder(
                                  itemCount: imgs.length,
                                  onPageChanged: (i) => setState(() => _imageIndex = i),
                                  itemBuilder: (_, i) => CachedNetworkImage(
                                    imageUrl: imgs[i],
                                    fit: BoxFit.cover,
                                    placeholder: (_, __) => Container(color: const Color(0xFF1A1A1A)),
                                    errorWidget: (_, __, ___) => Container(color: const Color(0xFF1A1A1A), child: const Icon(Icons.image_not_supported, color: Colors.white24)),
                                  ),
                                ),
                        ),
                        // 信息面板
                        Transform.translate(
                          offset: const Offset(0, -28),
                          child: Container(
                            width: double.infinity,
                            decoration: const BoxDecoration(color: DT.surface, borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
                            padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: DT.border, borderRadius: BorderRadius.circular(2)))),
                                const SizedBox(height: 16),
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Expanded(child: Text(title?.isNotEmpty == true ? title! : '未命名作品', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: DT.textPrimary, letterSpacing: -0.2))),
                                    if (price > 0) Text('¥${price.toStringAsFixed(price == price.roundToDouble() ? 0 : 2)}',
                                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: DT.primary)),
                                  ],
                                ),
                                if (desc.isNotEmpty) ...[
                                  const SizedBox(height: 10),
                                  Text(desc, style: const TextStyle(fontSize: 14, height: 1.6, color: DT.textSecondary)),
                                ],
                                if (tags.isNotEmpty) ...[
                                  const SizedBox(height: 12),
                                  Wrap(spacing: 6, runSpacing: 6, children: tags.map((t) => Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(color: DT.primarySoft, borderRadius: BorderRadius.circular(999)),
                                    child: Text('#$t', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: DT.primary)),
                                  )).toList()),
                                ],
                                const SizedBox(height: 18),
                                _statsRow(),
                                const SizedBox(height: 20),
                                Row(
                                  children: [
                                    Text('评论 (${_comments.where((c) => c['isHidden'] != true).length})', style: DT.titleMedium),
                                    const Spacer(),
                                    if (_comments.any((c) => c['isHidden'] == true))
                                      Text('${_comments.where((c) => c['isHidden'] == true).length} 条隐藏', style: const TextStyle(fontSize: 12, color: DT.textMuted)),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                if (_loading)
                                  const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator(color: DT.primary)))
                                else if (_comments.isEmpty)
                                  const Padding(
                                    padding: EdgeInsets.symmetric(vertical: 20),
                                    child: Center(child: Text('暂无评论', style: TextStyle(fontSize: 13, color: DT.textMuted))),
                                  )
                                else
                                  ..._comments.map(_commentTile),
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
            // 顶部操作栏（关闭 + 更多 + 页码）
            Positioned(
              left: 16, right: 16, top: topPad + 8,
              child: Row(
                children: [
                  _circleBtn(Icons.arrow_back_ios_new_rounded, () => Navigator.pop(context, _changed)),
                  const Spacer(),
                  if (imgs.length > 1)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: Colors.black.withOpacity(0.32), borderRadius: BorderRadius.circular(999)),
                      child: Text('${_imageIndex + 1}/${imgs.length}', style: const TextStyle(fontSize: 12, color: Colors.white)),
                    ),
                  const SizedBox(width: 10),
                  _circleBtn(Icons.more_horiz_rounded, _showWorkActions),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _circleBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 38, height: 38,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: Colors.black.withOpacity(0.4), shape: BoxShape.circle),
        child: Icon(icon, size: 18, color: Colors.white),
      ),
    );
  }

  Widget _statsRow() {
    final stat = (IconData i, String label, int n) => Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(i, size: 15, color: DT.textTertiary), const SizedBox(width: 4),
          Text('$n $label', style: const TextStyle(fontSize: 12, color: DT.textSecondary)),
        ]);
    final pinned = _work['isPinned'] as bool? ?? false;
    final feat = _work['isFeatured'] as bool? ?? false;
    final vis = _work['isVisible'] as bool? ?? true;
    return Wrap(
      spacing: 14, runSpacing: 8,
      children: [
        stat(Icons.favorite, '点赞', _work['likeCount'] as int? ?? 0),
        stat(Icons.bookmark, '收藏', _work['favoriteCount'] as int? ?? 0),
        stat(Icons.mode_comment_outlined, '评论', _work['commentCount'] as int? ?? 0),
        if (pinned) _badge('置顶', DT.primary),
        if (feat) _badge('推荐', const Color(0xFFF59E0B)),
        if (!vis) _badge('已隐藏', DT.textSecondary),
      ],
    );
  }

  Widget _badge(String t, Color c) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: c.withOpacity(0.12), borderRadius: BorderRadius.circular(999)),
        child: Text(t, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: c)),
      );

  Widget _commentTile(Map<String, dynamic> c, {bool isReply = false}) {
    final user = (c['user'] as Map<String, dynamic>?) ?? {};
    final name = user['name']?.toString() ?? '用户';
    final avatar = user['avatarUrl']?.toString();
    final isTech = user['role'] == 'technician';
    final isDeleted = user['role'] == 'unknown';
    final pinned = c['isPinned'] as bool? ?? false;
    final hidden = c['isHidden'] as bool? ?? false;
    final replies = ((c['replies'] as List<dynamic>?) ?? const []).cast<Map<String, dynamic>>();

    return Opacity(
      opacity: hidden ? 0.55 : 1,
      child: Padding(
        padding: EdgeInsets.only(left: isReply ? 36 : 0, top: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: isReply ? 13 : 16,
                  backgroundColor: isTech ? DT.primary : DT.surfaceAlt,
                  backgroundImage: (avatar != null && avatar.isNotEmpty) ? CachedNetworkImageProvider(avatar) : null,
                  child: (avatar == null || avatar.isEmpty)
                      ? Text(name.isNotEmpty ? name.substring(0, 1) : '?', style: TextStyle(color: isTech ? Colors.white : DT.textSecondary, fontSize: 11, fontWeight: FontWeight.w600))
                      : null,
                ),
                const SizedBox(width: 10),
                // 评论气泡：点击文字引用并回复；右侧元数据（时间 + ⋮）紧贴气泡右缘。
                Expanded(
                  child: GestureDetector(
                    onTap: isDeleted ? null : () => _startReply(c),
                    behavior: HitTestBehavior.opaque,
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(12, 6, 4, 10),
                      decoration: BoxDecoration(color: DT.surfaceAlt, borderRadius: BorderRadius.circular(14)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // 头部：左侧姓名+标签 | 右侧时间+⋮（成对右对齐到气泡边缘）
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              // 左：姓名 + 角色/置顶/隐藏标签
                              Expanded(
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Flexible(
                                      child: Text(name,
                                          maxLines: 1, overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: DT.textPrimary)),
                                    ),
                                    if (isTech) ...[const SizedBox(width: 6), _miniTag('美甲师', DT.primary, DT.primarySoft)],
                                    if (pinned) ...[const SizedBox(width: 6), _miniTag('置顶', const Color(0xFFB45309), const Color(0xFFFEF3C7))],
                                    if (hidden) ...[const SizedBox(width: 6), _miniTag('已隐藏', DT.textSecondary, const Color(0xFF3A2F23))],
                                  ],
                                ),
                              ),
                              // 右：时间 + ⋮
                              Text(_fmtTime(c['createdAt']?.toString()),
                                  style: const TextStyle(fontSize: 10.5, color: DT.textMuted)),
                              if (!isDeleted)
                                GestureDetector(
                                  onTap: () => _showCommentActions(c),
                                  behavior: HitTestBehavior.opaque,
                                  child: const Padding(
                                    padding: EdgeInsets.fromLTRB(6, 2, 4, 2),
                                    child: Icon(Icons.more_horiz_rounded, size: 16, color: DT.textTertiary),
                                  ),
                                )
                              else
                                const SizedBox(width: 4),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: Text(c['content']?.toString() ?? '',
                                style: TextStyle(fontSize: 14, height: 1.4, color: isDeleted ? DT.textMuted : DT.textPrimary, fontStyle: isDeleted ? FontStyle.italic : FontStyle.normal)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            // 引用回复的子评论：直接显示在父评论下方（缩进）
            ...replies.map((r) => _commentTile(r, isReply: true)),
          ],
        ),
      ),
    );
  }

  Widget _miniTag(String t, Color fg, Color bg) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
        child: Text(t, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: fg)),
      );

  Widget _commentInputBar() {
    // 底部留白 16，与主导航 dock 间距一致；不再叠加 home indicator inset
    return Container(
      decoration: const BoxDecoration(color: DT.surface, border: Border(top: BorderSide(color: DT.divider, width: 0.5))),
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_replyTo != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                padding: const EdgeInsets.fromLTRB(10, 8, 8, 8),
                decoration: BoxDecoration(
                  color: DT.surfaceAlt,
                  borderRadius: BorderRadius.circular(12),
                  border: const Border(left: BorderSide(color: DT.primary, width: 3)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('回复 @${_replyTo!['name']}',
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: DT.primary)),
                          if ((_replyTo!['content']?.toString() ?? '').isNotEmpty) ...[
                            const SizedBox(height: 3),
                            Text(_replyTo!['content']!.toString(),
                                maxLines: 2, overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12, height: 1.4, color: DT.textSecondary)),
                          ],
                        ],
                      ),
                    ),
                    GestureDetector(
                      onTap: () => setState(() => _replyTo = null),
                      behavior: HitTestBehavior.opaque,
                      child: const Padding(
                        padding: EdgeInsets.all(4),
                        child: Icon(Icons.close_rounded, size: 16, color: DT.textTertiary),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _inputCtl,
                focusNode: _inputFocus,
                decoration: InputDecoration(
                  hintText: _replyTo != null ? '回复 @${_replyTo!['name']}…' : '说点什么…',
                  filled: true, fillColor: DT.surfaceAlt, isDense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: BorderSide.none),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: BorderSide.none),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: const BorderSide(color: DT.primary, width: 1.2)),
                ),
                minLines: 1, maxLines: 4,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendComment(),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _sendComment,
              child: Container(
                width: 44, height: 44,
                alignment: Alignment.center,
                decoration: const BoxDecoration(color: DT.primary, shape: BoxShape.circle),
                child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
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
