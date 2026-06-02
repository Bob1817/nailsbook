import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../auth/technician_auth_service.dart';

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
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('标签已保存'),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ));
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Map<String, dynamic> _getColorEntry(String hexColor) {
    for (final c in _tagColors) {
      final textColor = c['text'] as Color;
      final hex = '#${textColor.value.toRadixString(16).substring(2).toUpperCase()}';
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
                          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                          children: [
                            _buildInfoBanner(),
                            const SizedBox(height: 16),
                            Wrap(
                              spacing: 8, runSpacing: 8,
                              children: _tags.asMap().entries.map((e) {
                                final i = e.key;
                                final tag = e.value;
                                final colorEntry = _getColorEntry(tag['color']?.toString() ?? '');
                                final bg = colorEntry['bg'] as Color;
                                final text = colorEntry['text'] as Color;
                                return GestureDetector(
                                  onTap: () => _showDeleteDialog(i),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: bg,
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(tag['name']?.toString() ?? '',
                                          style: TextStyle(color: text, fontSize: 14, fontWeight: FontWeight.w500)),
                                        const SizedBox(width: 6),
                                        Icon(Icons.close, size: 16, color: text),
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
      padding: EdgeInsets.fromLTRB(8, topPad + 4, 20, 8),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.8),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF374151)),
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text('标签管理',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: DT.textPrimary)),
          ),
          GestureDetector(
            onTap: _saving ? null : _showAddSheet,
            child: Container(
              width: 40, height: 40,
              decoration: const BoxDecoration(
                color: DT.primary,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.add, size: 22, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  // ── Info Banner ──

  Widget _buildInfoBanner() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline, size: 20, color: Color(0xFF3B82F6)),
          const SizedBox(width: 10),
          Expanded(
            child: Text('标签用于对客户进行分类管理，帮助你快速筛选和跟进客户。点击标签可删除。',
              style: TextStyle(fontSize: 14, color: const Color(0xFF2563EB).withOpacity(0.8), height: 1.5)),
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
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text('创建标签',
                        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary)),
                    ),
                    GestureDetector(
                      onTap: () => Navigator.pop(ctx),
                      child: Container(
                        width: 32, height: 32,
                        decoration: const BoxDecoration(color: Color(0xFFF2F0F3), shape: BoxShape.circle),
                        child: const Icon(Icons.close, size: 16, color: Color(0xFF6D6570)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Name input
                const Text('标签名称',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF374151))),
                const SizedBox(height: 6),
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: TextField(
                    controller: nameCtl,
                    style: const TextStyle(fontSize: 15, color: DT.textPrimary),
                    decoration: const InputDecoration(
                      hintText: '例如：VIP、新客户',
                      hintStyle: TextStyle(fontSize: 14, color: Color(0xFFB0AAB4)),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.all(14),
                    ),
                    onChanged: (v) => name = v,
                  ),
                ),
                const SizedBox(height: 16),
                // Color picker
                const Text('选择颜色',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF374151))),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 10, runSpacing: 10,
                  children: _tagColors.asMap().entries.map((e) {
                    final i = e.key;
                    final c = e.value;
                    final selected = selectedColorIdx == i;
                    return GestureDetector(
                      onTap: () => setSheetState(() => selectedColorIdx = i),
                      child: Container(
                        width: 36, height: 36,
                        decoration: BoxDecoration(
                          color: c['bg'] as Color,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: selected ? (c['text'] as Color) : Colors.transparent,
                            width: 2.5,
                          ),
                        ),
                        child: selected
                            ? Icon(Icons.check, size: 18, color: c['text'] as Color)
                            : null,
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                // Preview
                const Text('预览',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF374151))),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: _tagColors[selectedColorIdx]['bg'] as Color,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(name.isEmpty ? '预览' : name,
                    style: TextStyle(
                      color: _tagColors[selectedColorIdx]['text'] as Color,
                      fontSize: 14,
                      fontWeight: FontWeight.w500)),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity, height: 50,
                  child: ElevatedButton(
                    onPressed: () async {
                      final trimmed = name.trim();
                      if (trimmed.isEmpty) return;
                      if (_tags.any((t) => t['name'] == trimmed)) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: const Text('标签名称已存在'),
                          behavior: SnackBarBehavior.floating,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ));
                        return;
                      }
                      Navigator.pop(ctx);
                      final textColor = _tagColors[selectedColorIdx]['text'] as Color;
                      final hex = '#${textColor.value.toRadixString(16).substring(2).toUpperCase()}';
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
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
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
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('删除标签'),
        content: Text('确定要删除"${_tags[index]['name']}"吗？'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('删除', style: TextStyle(color: Color(0xFFEF4444)))),
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
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64, height: 64,
              decoration: const BoxDecoration(color: Color(0xFFFFF1F5), shape: BoxShape.circle),
              alignment: Alignment.center,
              child: const Icon(Icons.label_outline, size: 32, color: DT.primary),
            ),
            const SizedBox(height: 16),
            const Text('暂无标签',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: Color(0xFF374151))),
            const SizedBox(height: 4),
            Text('点击右上角创建标签',
              style: TextStyle(fontSize: 14, color: DT.textMuted)),
          ],
        ),
      ),
    );
  }
}
