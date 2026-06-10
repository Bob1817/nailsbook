import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/technician_auth_service.dart';
import '../../../core/widgets/nb_toast.dart';

const _tagColors = [
  {'bg': Color(0xFFFFE9F0), 'text': Color(0xFFFF5E93), 'name': '粉'},
  {'bg': Color(0xFFFFF1E5), 'text': Color(0xFFC9792A), 'name': '橙'},
  {'bg': Color(0xFFEEF9F1), 'text': Color(0xFF31B46C), 'name': '绿'},
  {'bg': Color(0xFFEBF4FF), 'text': Color(0xFF3B82F6), 'name': '蓝'},
  {'bg': Color(0xFFF5F0FF), 'text': Color(0xFF7C3AED), 'name': '紫'},
  {'bg': Color(0xFFFFF8E6), 'text': Color(0xFFC9860A), 'name': '黄'},
  {'bg': Color(0xFFF2F0F3), 'text': Color(0xFF6D6570), 'name': '灰'},
  {'bg': Color(0xFFFFE4E4), 'text': Color(0xFFE53E3E), 'name': '红'},
];

class TechnicianTagScreen extends StatefulWidget {
  const TechnicianTagScreen({super.key});

  @override
  State<TechnicianTagScreen> createState() => _TechnicianTagScreenState();
}

class _TechnicianTagScreenState extends State<TechnicianTagScreen> {
  List<Map<String, dynamic>> _tags = [];
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      final p = await TechnicianAuthService(api).getProfile();
      if (mounted) {
        setState(() {
          _loading = false;
          _tags = (p.customTags ?? []).cast<Map<String, dynamic>>();
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _saveTags(List<Map<String, dynamic>> tags) async {
    setState(() => _saving = true);
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      await TechnicianAuthService(api).updateProfile({'customTags': tags});
      setState(() => _tags = tags);
      if (mounted) {
        NbToast.show(context, '标签已保存');
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Map<String, dynamic> _getColorEntry(String hexColor) {
    for (final c in _tagColors) {
      final textColor = c['text'] as Color;
      final hex = '#${textColor.toARGB32().toRadixString(16).padLeft(8, '0').substring(0, 8).toUpperCase()}';
      if (hex == hexColor.toUpperCase()) return c;
    }
    return _tagColors[0];
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: DT.bgWarm,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : Column(
              children: [
                _buildHeader(topPad),
                Expanded(
                  child: _tags.isEmpty
                      ? _buildEmpty()
                      : ListView(
                          padding: const EdgeInsets.fromLTRB(DT.xl, 0, DT.xl, DT.xxl),
                          children: [
                            _buildInfoBanner(),
                            const SizedBox(height: DT.lg),
                            Wrap(
                              spacing: DT.sm, runSpacing: DT.sm,
                              children: _tags.asMap().entries.map((e) {
                                final i = e.key;
                                final tag = e.value;
                                final colorEntry = _getColorEntry(tag['color']?.toString() ?? '');
                                final bg = colorEntry['bg'] as Color;
                                final text = colorEntry['text'] as Color;
                                return GestureDetector(
                                  onTap: () {
                                    HapticFeedback.lightImpact();
                                    _showDeleteDialog(i);
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: DT.md, vertical: DT.sm),
                                    constraints: const BoxConstraints(minHeight: 44),
                                    decoration: BoxDecoration(
                                      color: bg,
                                      borderRadius: BorderRadius.circular(DT.rFull),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(tag['name']?.toString() ?? '',
                                          style: TextStyle(color: text, fontSize: 14, fontWeight: FontWeight.w500)),
                                        const SizedBox(width: 6),
                                        Icon(CupertinoIcons.xmark, size: 16, color: text),
                                      ],
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                ),
              ],
            ),
    );
  }

  // ── Header ──

  Widget _buildHeader(double topPad) {
    return Padding(
      padding: EdgeInsets.fromLTRB(DT.sm, topPad + DT.xs, DT.xl, DT.sm),
      child: Row(
        children: [
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
            },
            child: Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: DT.surface.withValues(alpha: 0.8),
                shape: BoxShape.circle,
              ),
              child: const Icon(CupertinoIcons.back, size: 18, color: DT.textDarkGrey),
            ),
          ),
          const SizedBox(width: DT.md),
          const Expanded(
            child: Text('标签管理',
              style: DT.titleLarge),
          ),
          GestureDetector(
            onTap: _saving ? null : () {
              HapticFeedback.lightImpact();
              _showAddSheet();
            },
            child: Container(
              width: 40, height: 40,
              decoration: const BoxDecoration(
                color: DT.primary,
                shape: BoxShape.circle,
              ),
              child: const Icon(CupertinoIcons.plus, size: 22, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  // ── Info Banner ──

  Widget _buildInfoBanner() {
    return Container(
      padding: const EdgeInsets.all(DT.md),
      decoration: BoxDecoration(
        color: DT.infoBg,
        borderRadius: BorderRadius.circular(DT.radius14),
        border: Border.all(color: DT.infoBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(CupertinoIcons.info_circle, size: 20, color: DT.info),
          const SizedBox(width: DT.sm),
          Expanded(
            child: Text('标签用于对客户进行分类管理，帮助你快速筛选和跟进客户。点击标签可删除。',
              style: TextStyle(fontSize: 14, color: DT.actionBlue.withValues(alpha: 0.8), height: 1.5)),
          ),
        ],
      ),
    );
  }

  // ── Add Sheet ──

  void _showAddSheet() {
    String name = '';
    int selectedColorIdx = 0;
    final nameCtl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: Container(
            decoration: const BoxDecoration(
              color: DT.surface,
              borderRadius: BorderRadius.vertical(top: Radius.circular(DT.rCard)),
            ),
            padding: const EdgeInsets.all(DT.xl),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text('创建标签',
                        style: DT.titleMedium),
                    ),
                    GestureDetector(
                      onTap: () => Navigator.pop(ctx),
                      child: Container(
                        width: 32, height: 32,
                        decoration: const BoxDecoration(color: DT.dividerWarm, shape: BoxShape.circle),
                        child: const Icon(CupertinoIcons.xmark, size: 16, color: DT.textMidGrey),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: DT.lg),
                // Name input
                const Text('标签名称',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DT.textDarkGrey)),
                const SizedBox(height: 6),
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: DT.borderGrey),
                    borderRadius: BorderRadius.circular(DT.radius14),
                  ),
                  child: TextField(
                    controller: nameCtl,
                    style: const TextStyle(fontSize: 15, color: DT.textPrimary),
                    decoration: const InputDecoration(
                      hintText: '例如：VIP、新客户',
                      hintStyle: TextStyle(fontSize: 14, color: DT.iconGrey),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.all(DT.md),
                    ),
                    onChanged: (v) => name = v,
                  ),
                ),
                const SizedBox(height: DT.lg),
                // Color picker
                const Text('选择颜色',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DT.textDarkGrey)),
                const SizedBox(height: DT.sm),
                Wrap(
                  spacing: DT.sm, runSpacing: DT.sm,
                  children: _tagColors.asMap().entries.map((e) {
                    final i = e.key;
                    final c = e.value;
                    final selected = selectedColorIdx == i;
                    return GestureDetector(
                      onTap: () {
                        HapticFeedback.selectionClick();
                        setSheetState(() => selectedColorIdx = i);
                      },
                      child: Container(
                        width: 44, height: 44,
                        decoration: BoxDecoration(
                          color: c['bg'] as Color,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: selected ? (c['text'] as Color) : Colors.transparent,
                            width: 2.5,
                          ),
                        ),
                        child: selected
                            ? Icon(CupertinoIcons.check_mark, size: 18, color: c['text'] as Color)
                            : null,
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: DT.lg),
                // Preview
                const Text('预览',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DT.textDarkGrey)),
                const SizedBox(height: DT.sm),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: DT.md, vertical: DT.sm),
                  decoration: BoxDecoration(
                    color: _tagColors[selectedColorIdx]['bg'] as Color,
                    borderRadius: BorderRadius.circular(DT.rFull),
                  ),
                  child: Text(name.isEmpty ? '预览' : name,
                    style: TextStyle(
                      color: _tagColors[selectedColorIdx]['text'] as Color,
                      fontSize: 14,
                      fontWeight: FontWeight.w500)),
                ),
                const SizedBox(height: DT.xl),
                SizedBox(
                  width: double.infinity, height: 50,
                  child: ElevatedButton(
                    onPressed: () async {
                      HapticFeedback.mediumImpact();
                      final trimmed = name.trim();
                      if (trimmed.isEmpty) return;
                      if (_tags.any((t) => t['name'] == trimmed)) {
                        NbToast.show(context, '标签名称已存在');
                        return;
                      }
                      Navigator.pop(ctx);
                      final textColor = _tagColors[selectedColorIdx]['text'] as Color;
                      final hex = '#${textColor.toARGB32().toRadixString(16).padLeft(8, '0').substring(0, 8).toUpperCase()}';
                      final newTags = [
                        ..._tags,
                        {
                          'id': DateTime.now().millisecondsSinceEpoch.toString(),
                          'name': trimmed,
                          'color': hex,
                        },
                      ];
                      await _saveTags(newTags);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: DT.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DT.radius14)),
                      elevation: 0,
                    ),
                    child: const Text('创建标签', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ── Delete Dialog ──

  Future<void> _showDeleteDialog(int index) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('删除标签'),
        content: Text('确定要删除"${_tags[index]['name']}"吗？'),
        actions: [
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消'),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true,
            onPressed: () {
              HapticFeedback.heavyImpact();
              Navigator.pop(ctx, true);
            },
            child: const Text('删除')),
        ],
      ),
    );
    if (confirmed != true) return;
    final newTags = List<Map<String, dynamic>>.from(_tags)..removeAt(index);
    await _saveTags(newTags);
  }

  // ── Empty ──

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(DT.space40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64, height: 64,
              decoration: const BoxDecoration(color: DT.primarySoft, shape: BoxShape.circle),
              alignment: Alignment.center,
              child: const Icon(CupertinoIcons.tag, size: 32, color: DT.primary),
            ),
            const SizedBox(height: DT.lg),
            const Text('暂无标签',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: DT.textDarkGrey)),
            const SizedBox(height: DT.xs),
            Text('点击右上角创建标签',
              style: TextStyle(fontSize: 14, color: DT.textMuted)),
          ],
        ),
      ),
    );
  }
}
