import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../auth/technician_auth_service.dart';
import 'technician_work_detail_screen.dart';
import 'technician_work_share_sheet.dart';
import '../works/technician_work_service.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

/// 作品管理：双列瀑布流照片墙 + 卡片操作弹层 + 新建/编辑表单。
/// 对齐 webapp technician-frontend/src/pages/WorksPage.tsx。
class TechnicianWorksScreen extends StatefulWidget {
  const TechnicianWorksScreen({super.key});

  @override
  State<TechnicianWorksScreen> createState() => _TechnicianWorksScreenState();
}

const _aspectPatterns = [3 / 4, 1.0, 4 / 5, 5 / 6, 3 / 4, 1.0];

class _TechnicianWorksScreenState extends State<TechnicianWorksScreen> {
  List<Map<String, dynamic>> _works = [];
  bool _loading = true;
  String? _invitationCode;
  String? _technicianName;

  @override
  void initState() {
    super.initState();
    _loadWorks();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final profile =
          await TechnicianAuthService(context.read<ApiClient>()).getProfile();
      if (mounted)
        setState(() {
          _invitationCode = profile.invitationCode;
          _technicianName = profile.name;
        });
    } catch (_) {}
  }

  Future<void> _loadWorks() async {
    try {
      final works =
          await TechnicianWorkService(context.read<ApiClient>()).list();
      if (mounted)
        setState(() {
          _works = works;
          _loading = false;
        });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  TechnicianWorkService get _service =>
      TechnicianWorkService(context.read<ApiClient>());

  Future<void> _openDetail(Map<String, dynamic> w) async {
    final changed = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
          builder: (_) => TechnicianWorkDetailScreen(
                work: w,
                invitationCode: _invitationCode,
                technicianName: _technicianName,
              )),
    );
    if (changed == true) _loadWorks();
  }

  Future<void> _openForm({Map<String, dynamic>? existing}) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _WorkFormSheet(existing: existing),
    );
    if (saved == true) _loadWorks();
  }

  Future<void> _togglePinned(Map<String, dynamic> w) async {
    final pinned = w['isPinned'] as bool? ?? false;
    try {
      await _service.togglePinned(w['id'] as int);
      if (mounted) NbToast.success(context, pinned ? '已取消置顶' : '已置顶');
      _loadWorks();
    } catch (_) {
      if (mounted) NbToast.error(context, '操作失败，请重试');
    }
  }

  Future<void> _toggleFeatured(Map<String, dynamic> w) async {
    final feat = w['isFeatured'] as bool? ?? false;
    try {
      await _service.toggleFeatured(w['id'] as int);
      if (mounted) NbToast.success(context, feat ? '已取消推荐' : '已设为推荐');
      _loadWorks();
    } catch (_) {
      if (mounted) NbToast.error(context, '操作失败，请重试');
    }
  }

  Future<void> _toggleVisible(Map<String, dynamic> w) async {
    final vis = w['isVisible'] as bool? ?? true;
    try {
      await _service.toggleVisible(w['id'] as int);
      if (mounted) NbToast.success(context, vis ? '作品已隐藏' : '作品已显示');
      _loadWorks();
    } catch (_) {
      if (mounted) NbToast.error(context, '操作失败，请重试');
    }
  }

  Future<void> _delete(Map<String, dynamic> w) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('删除作品'),
        content: Text(
            '确定要删除「${w['title']?.toString().isNotEmpty == true ? w['title'] : '该作品'}」吗？'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: TextButton.styleFrom(foregroundColor: DT.error),
              child: const Text('删除')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _service.delete(w['id'] as int);
      if (mounted) NbToast.success(context, '作品已删除');
      _loadWorks();
    } catch (_) {
      if (mounted) NbToast.error(context, '删除失败，请重试');
    }
  }

  void _showActionSheet(Map<String, dynamic> w) {
    final pinned = w['isPinned'] as bool? ?? false;
    final feat = w['isFeatured'] as bool? ?? false;
    final vis = w['isVisible'] as bool? ?? true;
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
          child: Container(
            decoration: BoxDecoration(
              color: DT.surface.withOpacity(0.9),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 10),
                  Container(
                      width: 38,
                      height: 4,
                      decoration: BoxDecoration(
                          color: DT.border,
                          borderRadius: BorderRadius.circular(2))),
                  const SizedBox(height: 8),
                  Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Text(
                        w['title']?.toString().isNotEmpty == true
                            ? w['title'].toString()
                            : '未命名作品',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: DT.textPrimary)),
                  ),
                  const Divider(height: 1, color: DT.divider),
                  _action(ctx, CupertinoIcons.pencil, '编辑作品',
                      () => _openForm(existing: w)),
                  _action(ctx, CupertinoIcons.pin, pinned ? '取消置顶' : '置顶作品',
                      () => _togglePinned(w)),
                  _action(ctx, CupertinoIcons.star, feat ? '取消推荐' : '推荐作品',
                      () => _toggleFeatured(w)),
                  _action(
                      ctx,
                      vis ? CupertinoIcons.eye_slash : CupertinoIcons.eye,
                      vis ? '隐藏作品' : '取消隐藏',
                      () => _toggleVisible(w)),
                  _action(
                      ctx,
                      CupertinoIcons.share,
                      '分享作品',
                      () => TechnicianWorkShareSheet.show(context,
                          work: w,
                          invitationCode: _invitationCode,
                          technicianName: _technicianName)),
                  _action(ctx, CupertinoIcons.trash, '删除作品', () => _delete(w),
                      danger: true),
                  const SizedBox(height: 4),
                  const Divider(height: 1, color: DT.divider),
                  _action(ctx, null, '取消', null, center: true),
                  const SizedBox(height: 4),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// 操作弹层行：图标 + 文字始终居中显示（[center]=true 用于「取消」按钮文案）。
  Widget _action(
      BuildContext ctx, IconData? icon, String label, VoidCallback? onTap,
      {bool danger = false, bool center = false}) {
    final color = danger ? DT.error : DT.textPrimary;
    return InkWell(
      onTap: () {
        Navigator.pop(ctx);
        onTap?.call();
      },
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
    return Scaffold(
      backgroundColor: DT.bg,
      appBar: GlassAppBar(
        technician: true,
        title: const Text('作品管理'),
        actions: [
          IconButton(
            icon: const Icon(CupertinoIcons.add),
            onPressed: () {
              HapticFeedback.lightImpact();
              _openForm();
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : _works.isEmpty
              ? _empty()
              : RefreshIndicator(
                  color: DT.primary,
                  onRefresh: _loadWorks,
                  child: _masonry(),
                ),
    );
  }

  Widget _masonry() {
    final left = <Widget>[];
    final right = <Widget>[];
    for (var i = 0; i < _works.length; i++) {
      final card = Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: _workCard(_works[i], i));
      (i % 2 == 0 ? left : right).add(card);
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 100),
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: Column(children: left)),
            const SizedBox(width: 8),
            Expanded(child: Column(children: right)),
          ],
        ),
      ],
    );
  }

  Widget _workCard(Map<String, dynamic> work, int index) {
    final title = work['title']?.toString();
    final cover = work['coverUrl']?.toString();
    final imgs = (work['imageUrls'] as List<dynamic>?) ?? const [];
    final url = (cover != null && cover.isNotEmpty)
        ? cover
        : (imgs.isNotEmpty ? imgs.first.toString() : null);
    final price = (work['price'] as num?)?.toDouble() ?? 0;
    final likeCount = work['likeCount'] as int? ?? 0;
    final favoriteCount = work['favoriteCount'] as int? ?? 0;
    final commentCount = work['commentCount'] as int? ?? 0;
    final isPinned = work['isPinned'] as bool? ?? false;
    final isFeatured = work['isFeatured'] as bool? ?? false;
    final isVisible = work['isVisible'] as bool? ?? true;
    final ratio = _aspectPatterns[index % _aspectPatterns.length];

    return GestureDetector(
      onTap: () => _openDetail(work),
      onLongPress: () => _showActionSheet(work),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: AspectRatio(
          aspectRatio: ratio,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (url != null)
                CachedNetworkImage(
                  imageUrl: url,
                  fit: BoxFit.cover,
                  placeholder: (_, __) =>
                      Container(color: const Color(0xFF2A241E)),
                  errorWidget: (_, __, ___) => Container(
                      color: const Color(0xFF2A241E),
                      child: const Center(
                          child: Text('暂无图片',
                              style: TextStyle(
                                  fontSize: 12, color: Color(0xFF9CA3AF))))),
                )
              else
                Container(
                    color: const Color(0xFF2A241E),
                    child: const Center(
                        child: Text('暂无作品图片',
                            style: TextStyle(
                                fontSize: 12, color: Color(0xFF9CA3AF))))),
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        Color(0x99000000),
                        Color(0x22000000),
                        Colors.transparent
                      ],
                      stops: [
                        0,
                        0.4,
                        0.7
                      ]),
                ),
              ),
              // bottom overlay：左下标题 + 右下三项统计（点赞/收藏/评论），底线对齐
              Positioned(
                left: 8,
                right: 8,
                bottom: 8,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title?.isNotEmpty == true ? title! : '未命名作品',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.white,
                                  height: 1.2)),
                          if (price > 0) ...[
                            const SizedBox(height: 2),
                            Text(
                                '¥${price.toStringAsFixed(price == price.roundToDouble() ? 0 : 2)}',
                                style: const TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFFFFD700),
                                    height: 1.2)),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    _statIcon(Icons.favorite, likeCount),
                    const SizedBox(width: 6),
                    _statIcon(Icons.bookmark, favoriteCount),
                    const SizedBox(width: 6),
                    _statIcon(Icons.mode_comment, commentCount),
                  ],
                ),
              ),
              // left-top badges
              Positioned(
                left: 6,
                top: 6,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (isPinned) _badge('置顶', DT.primary),
                    if (isFeatured) _badge('推荐', const Color(0xFFF59E0B)),
                    if (!isVisible) _badge('隐藏', const Color(0xCC6B7280)),
                  ],
                ),
              ),
              // right-top action
              Positioned(
                right: 6,
                top: 6,
                child: GestureDetector(
                  onTap: () => _showActionSheet(work),
                  behavior: HitTestBehavior.opaque,
                  child: Container(
                    width: 28,
                    height: 28,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.4),
                        shape: BoxShape.circle),
                    child: const Icon(Icons.more_vert_rounded,
                        size: 17, color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statIcon(IconData icon, int count) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 10.5, color: Colors.white70),
      const SizedBox(width: 2),
      Text('$count',
          style: const TextStyle(
              fontSize: 10.5, color: Colors.white70, height: 1.2)),
    ]);
  }

  Widget _badge(String text, Color bg) {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration:
          BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(text,
          style: const TextStyle(
              fontSize: 9, fontWeight: FontWeight.w600, color: Colors.white)),
    );
  }

  Widget _empty() {
    return ListView(
      children: [
        const SizedBox(height: 120),
        Center(
          child: Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
                color: DT.primarySoft, borderRadius: BorderRadius.circular(24)),
            child: const Icon(CupertinoIcons.photo_on_rectangle,
                size: 32, color: DT.primary),
          ),
        ),
        const SizedBox(height: 16),
        const Center(
            child: Text('还没有作品',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: DT.textPrimary))),
        const SizedBox(height: 6),
        const Center(
            child: Text('点击右上角 + 添加你的第一个作品',
                style: TextStyle(fontSize: 13, color: DT.textMuted))),
      ],
    );
  }
}

// ───────── 新建 / 编辑作品表单 ─────────

class _WorkFormSheet extends StatefulWidget {
  final Map<String, dynamic>? existing;
  const _WorkFormSheet({this.existing});

  @override
  State<_WorkFormSheet> createState() => _WorkFormSheetState();
}

class _WorkFormSheetState extends State<_WorkFormSheet> {
  late final _titleCtl =
      TextEditingController(text: widget.existing?['title']?.toString() ?? '');
  late final _descCtl = TextEditingController(
      text: widget.existing?['description']?.toString() ?? '');
  late final _tagsCtl = TextEditingController(
      text:
          ((widget.existing?['tags'] as List<dynamic>?) ?? const []).join(','));
  late final _priceCtl = TextEditingController(
      text: widget.existing?['price'] != null
          ? '${widget.existing!['price']}'
          : '');
  late List<String> _images =
      ((widget.existing?['imageUrls'] as List<dynamic>?) ?? const [])
          .map((e) => e.toString())
          .toList();
  late bool _isVisible = widget.existing?['isVisible'] as bool? ?? true;
  bool _uploading = false;
  bool _saving = false;

  bool get _isEdit => widget.existing != null;

  @override
  void dispose() {
    _titleCtl.dispose();
    _descCtl.dispose();
    _tagsCtl.dispose();
    _priceCtl.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final file = await ImagePicker().pickImage(
        source: ImageSource.gallery, maxWidth: 1280, imageQuality: 82);
    if (file == null) return;
    setState(() => _uploading = true);
    try {
      final api = context.read<ApiClient>();
      final resp =
          await api.uploadMultipart('/uploads/image', file.path, 'file');
      final body = await resp.stream.bytesToString();
      if (resp.statusCode >= 400) throw Exception('upload failed');
      final url = (jsonDecode(body) as Map<String, dynamic>)['url'] as String?;
      if (url != null && mounted) setState(() => _images = [..._images, url]);
    } catch (_) {
      if (mounted) NbToast.error(context, '图片上传失败');
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _save() async {
    if (_images.isEmpty) {
      NbToast.error(context, '请至少上传一张作品图片');
      return;
    }
    if (_titleCtl.text.trim().isEmpty) {
      NbToast.error(context, '请填写作品标题');
      return;
    }
    setState(() => _saving = true);
    try {
      final service = TechnicianWorkService(context.read<ApiClient>());
      final priceText = _priceCtl.text.trim();
      final data = <String, dynamic>{
        'title': _titleCtl.text.trim(),
        'description': _descCtl.text.trim(),
        'tags': _tagsCtl.text
            .split(',')
            .map((t) => t.trim())
            .where((t) => t.isNotEmpty)
            .toList(),
        'coverUrl': _images.first,
        'images': _images,
        if (priceText.isNotEmpty) 'price': num.tryParse(priceText),
        'isVisible': _isVisible,
      };
      if (_isEdit) {
        await service.update(widget.existing!['id'] as int, data);
      } else {
        await service.create(data);
      }
      if (mounted) {
        Navigator.pop(context, true);
        NbToast.success(context, _isEdit ? '作品已更新' : '作品已发布');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _saving = false);
        NbToast.error(context, '保存失败，请重试');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final viewInsets = MediaQuery.of(context).viewInsets.bottom;
    final bottomPad = MediaQuery.of(context).padding.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: viewInsets),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
          child: Container(
            decoration: BoxDecoration(
              color: DT.surface.withOpacity(0.94),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 10, 8, 4),
                  child: Row(
                    children: [
                      const SizedBox(width: 40),
                      Expanded(
                          child: Center(
                              child: Text(_isEdit ? '编辑作品' : '发布作品',
                                  style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: DT.textPrimary)))),
                      IconButton(
                          icon: const Icon(Icons.close_rounded,
                              size: 22, color: DT.textSecondary),
                          onPressed: () => Navigator.pop(context)),
                    ],
                  ),
                ),
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 6, 20, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _label('作品图片'),
                        const SizedBox(height: 8),
                        _imageGrid(),
                        const SizedBox(height: 16),
                        _label('标题'),
                        const SizedBox(height: 8),
                        _field(_titleCtl, '给作品起个名字'),
                        const SizedBox(height: 14),
                        _label('描述（选填）'),
                        const SizedBox(height: 8),
                        _field(_descCtl, '款式、工艺、灵感等', maxLines: 3),
                        const SizedBox(height: 14),
                        Row(children: [
                          Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                _label('参考价格（选填）'),
                                const SizedBox(height: 8),
                                _field(_priceCtl, '¥',
                                    keyboard:
                                        const TextInputType.numberWithOptions(
                                            decimal: true))
                              ])),
                          const SizedBox(width: 12),
                          Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                _label('标签（逗号分隔）'),
                                const SizedBox(height: 8),
                                _field(_tagsCtl, '法式,渐变')
                              ])),
                        ]),
                        const SizedBox(height: 16),
                        _visibleToggle(),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.fromLTRB(20, 4, 20, bottomPad + 16),
                  child: SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _saving ? null : _save,
                      style: ElevatedButton.styleFrom(
                          backgroundColor: DT.cream,
                          foregroundColor: DT.onCream,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(999))),
                      child: _saving
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : Text(_isEdit ? '保存修改' : '发布作品',
                              style: const TextStyle(
                                  fontSize: 16, fontWeight: FontWeight.w600)),
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

  Widget _label(String t) => Text(t,
      style: const TextStyle(
          fontSize: 13, fontWeight: FontWeight.w500, color: DT.textPrimary));

  Widget _imageGrid() {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        ..._images.asMap().entries.map((e) => Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: CachedNetworkImage(
                      imageUrl: e.value,
                      width: 84,
                      height: 84,
                      fit: BoxFit.cover),
                ),
                if (e.key == 0)
                  Positioned(
                    left: 0,
                    bottom: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: const BoxDecoration(
                          color: DT.primary,
                          borderRadius: BorderRadius.only(
                              topRight: Radius.circular(8),
                              bottomLeft: Radius.circular(12))),
                      child: const Text('封面',
                          style: TextStyle(fontSize: 9, color: Colors.white)),
                    ),
                  ),
                Positioned(
                  right: 2,
                  top: 2,
                  child: GestureDetector(
                    onTap: () => setState(() {
                      final l = List<String>.from(_images);
                      l.removeAt(e.key);
                      _images = l;
                    }),
                    child: Container(
                      width: 20,
                      height: 20,
                      decoration: const BoxDecoration(
                          color: Color(0xCC000000), shape: BoxShape.circle),
                      child: const Icon(Icons.close,
                          size: 13, color: Colors.white),
                    ),
                  ),
                ),
              ],
            )),
        if (_images.length < 9)
          GestureDetector(
            onTap: _uploading ? null : _pickImage,
            child: Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(
                  color: DT.surfaceAlt,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: DT.border)),
              child: _uploading
                  ? const Center(
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: DT.primary))
                  : const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                          Icon(CupertinoIcons.camera,
                              size: 22, color: DT.textTertiary),
                          SizedBox(height: 4),
                          Text('上传',
                              style: TextStyle(
                                  fontSize: 11, color: DT.textTertiary)),
                        ]),
            ),
          ),
      ],
    );
  }

  Widget _field(TextEditingController ctl, String hint,
      {int maxLines = 1, TextInputType? keyboard}) {
    return TextField(
      controller: ctl,
      maxLines: maxLines,
      keyboardType: keyboard,
      style: const TextStyle(fontSize: 14, color: DT.textPrimary),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: DT.textMuted, fontSize: 14),
        filled: true,
        fillColor: DT.surfaceAlt,
        isDense: true,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: DT.primary, width: 1.4)),
      ),
    );
  }

  Widget _visibleToggle() {
    return GestureDetector(
      onTap: () => setState(() => _isVisible = !_isVisible),
      behavior: HitTestBehavior.opaque,
      child: Row(
        children: [
          Expanded(
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('客户端可见',
                      style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: DT.textPrimary)),
                  SizedBox(height: 3),
                  Text('关闭后作品仅自己可见，不展示给客户',
                      style: TextStyle(fontSize: 12, color: DT.textMuted)),
                ]),
          ),
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: 48,
            height: 28,
            decoration: BoxDecoration(
                color: _isVisible ? DT.primary : const Color(0xFFD1D1D6),
                borderRadius: BorderRadius.circular(999)),
            child: AnimatedAlign(
              duration: const Duration(milliseconds: 180),
              alignment:
                  _isVisible ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                  width: 22,
                  height: 22,
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  decoration: const BoxDecoration(
                      color: DT.surface, shape: BoxShape.circle)),
            ),
          ),
        ],
      ),
    );
  }
}
