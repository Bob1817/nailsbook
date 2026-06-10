import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/glass_container.dart';
import '../../../core/widgets/nb_toast.dart';
import '../auth/technician_auth_service.dart';
import 'technician_customer_service.dart';
import 'technician_customer_detail_screen.dart';

/// 客户页面：对齐 webapp technician-frontend/src/pages/CustomersPage.tsx。
/// 模块：标题 + 邀请客户按钮 / 搜索框 / Tab 分类 / 客户卡片（头像/姓名编辑/地址/标签/统计三宫格）。
class TechnicianCustomersScreen extends StatefulWidget {
  const TechnicianCustomersScreen({super.key});

  @override
  State<TechnicianCustomersScreen> createState() =>
      _TechnicianCustomersScreenState();
}

const _customerTabs = ['全部', '常客', '新客', '高频'];
const _clientBaseUrl = 'https://m.lunails.cn';

// 标签兜底色板（与 webapp 一致）
const _tagFallbackColors = <String, ({Color bg, Color text})>{
  '常客': (bg: Color(0xFFFCE7EE), text: Color(0xFFE86B8F)),
  '新客': (bg: Color(0xFFE8F4FE), text: Color(0xFF4A90C2)),
  '高频': (bg: Color(0xFFFFF4E5), text: Color(0xFFC8892F)),
};
const _tagDefaultColor = (bg: Color(0xFFF2F0F3), text: Color(0xFF6D6570));

bool _isPhoneAsName(String s) => RegExp(r'^1[3-9]\d{9}$').hasMatch(s);

({Color bg, Color text}) _getTagColor(String tag, List<dynamic> customTags) {
  for (final t in customTags) {
    if (t is Map<String, dynamic> && t['name'] == tag) {
      final bg = t['bgColor']?.toString();
      final fg = t['textColor']?.toString();
      if (bg != null && fg != null) {
        return (bg: _parseHex(bg), text: _parseHex(fg));
      }
    }
  }
  return _tagFallbackColors[tag] ?? _tagDefaultColor;
}

Color _parseHex(String s) {
  var h = s.replaceAll('#', '');
  if (h.length == 6) h = 'FF$h';
  return Color(int.parse(h, radix: 16));
}

List<String> _parseTags(dynamic raw) {
  if (raw == null) return const [];
  if (raw is List)
    return raw.map((e) => e.toString()).where((s) => s.isNotEmpty).toList();
  final s = raw.toString().trim();
  if (s.isEmpty) return const [];
  try {
    final decoded = jsonDecode(s);
    if (decoded is List)
      return decoded
          .map((e) => e.toString())
          .where((t) => t.isNotEmpty)
          .toList();
  } catch (_) {}
  return s
      .split(RegExp(r'[,，;]'))
      .map((e) => e.trim())
      .where((e) => e.isNotEmpty)
      .toList();
}

class _TechnicianCustomersScreenState extends State<TechnicianCustomersScreen> {
  List<Map<String, dynamic>> _customers = [];
  List<dynamic> _customTags = [];
  String? _invitationCode;
  String _technicianName = '美甲师';
  bool _loading = true;
  String _search = '';
  String _activeTab = '全部';
  int? _editingId;
  final _searchCtl = TextEditingController();
  final _nameCtl = TextEditingController();
  final _nameFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    _loadProfile();
    _loadCustomers();
  }

  @override
  void dispose() {
    _searchCtl.dispose();
    _nameCtl.dispose();
    _nameFocus.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    try {
      final p =
          await TechnicianAuthService(context.read<ApiClient>()).getProfile();
      if (mounted)
        setState(() {
          _customTags = p.customTags ?? const [];
          _invitationCode = p.invitationCode;
          _technicianName = p.name;
        });
    } catch (_) {}
  }

  Future<void> _loadCustomers() async {
    try {
      final svc = TechnicianCustomerService(context.read<ApiClient>());
      final items = await svc.list(search: _search.isEmpty ? null : _search);
      if (mounted)
        setState(() {
          _customers = items;
          _loading = false;
        });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _visibleCustomers {
    return _customers.where((c) {
      if (_activeTab == '全部') return true;
      return _parseTags(c['tags']).contains(_activeTab);
    }).toList();
  }

  Future<void> _invite() async {
    HapticFeedback.lightImpact();
    if ((_invitationCode ?? '').isEmpty) {
      NbToast.error(context, '暂未生成邀请码，请稍后重试');
      return;
    }
    final link =
        '$_clientBaseUrl/invite?invite_code=${Uri.encodeComponent(_invitationCode!)}';
    final text = '$_technicianName 邀请你预约美甲服务，点击链接完成绑定：\n$link';
    try {
      await Share.share(text, subject: '邀请你预约美甲');
    } catch (_) {
      await Clipboard.setData(ClipboardData(text: link));
      if (mounted) NbToast.success(context, '邀请链接已复制');
    }
  }

  Future<void> _saveName(int id) async {
    final n = _nameCtl.text.trim();
    if (n.isEmpty) {
      NbToast.error(context, '客户名称不能为空');
      return;
    }
    try {
      await TechnicianCustomerService(context.read<ApiClient>())
          .updateName(id, n);
      if (mounted) {
        setState(() {
          final idx = _customers.indexWhere((c) => c['id'] == id);
          if (idx >= 0) _customers[idx]['name'] = n;
          _editingId = null;
        });
        NbToast.success(context, '客户名称已更新');
      }
    } catch (_) {
      if (mounted) NbToast.error(context, '更新失败，请重试');
    }
  }

  void _startEdit(Map<String, dynamic> c) {
    final cur = c['name']?.toString() ?? '';
    _nameCtl.text = _isPhoneAsName(cur) ? '' : cur;
    setState(() => _editingId = c['id'] as int);
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _nameFocus.requestFocus());
  }

  void _openDetail(int id) {
    Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => TechnicianCustomerDetailScreen(customerId: id),
        )).then((_) => _loadCustomers());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DT.bg,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            _header(),
            _searchBox(),
            _tabs(),
            Expanded(
              child: _loading
                  ? const Center(
                      child: CircularProgressIndicator(color: DT.primary))
                  : _visibleCustomers.isEmpty
                      ? _empty()
                      : RefreshIndicator(
                          color: DT.primary,
                          onRefresh: _loadCustomers,
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(20, 4, 20, 100),
                            itemCount: _visibleCustomers.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 12),
                            itemBuilder: (_, i) =>
                                _customerCard(_visibleCustomers[i]),
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _header() {
    return GlassContainer(
      blur: DT.glassBlurHeavy,
      opacity: 0.64,
      borderRadius: 0,
      showBorder: false,
      padding: const EdgeInsets.fromLTRB(20, 14, 16, 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('客户',
                    style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: DT.textPrimary)),
                SizedBox(height: 4),
                Text('管理客户档案、标签与服务记录',
                    style: TextStyle(fontSize: 13, color: DT.textTertiary)),
              ],
            ),
          ),
          GestureDetector(
            onTap: _invite,
            child: Container(
              constraints: const BoxConstraints(minHeight: 36),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                  color: const Color(0xFFFFE9F0),
                  borderRadius: BorderRadius.circular(999)),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(CupertinoIcons.share, size: 14, color: DT.primary),
                  SizedBox(width: 6),
                  Text('邀请客户',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: DT.primary)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _searchBox() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: Container(
        height: 44,
        decoration: BoxDecoration(
            color: DT.surfaceAlt, borderRadius: BorderRadius.circular(14)),
        child: TextField(
          controller: _searchCtl,
          textAlignVertical: TextAlignVertical.center,
          style: const TextStyle(fontSize: 14, color: DT.textPrimary),
          decoration: const InputDecoration(
            hintText: '搜索客户姓名或联系方式',
            hintStyle: TextStyle(color: DT.textTertiary, fontSize: 14),
            prefixIcon:
                Icon(CupertinoIcons.search, size: 18, color: DT.textTertiary),
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            isCollapsed: true,
            contentPadding: EdgeInsets.symmetric(horizontal: 4, vertical: 12),
          ),
          textInputAction: TextInputAction.search,
          onSubmitted: (v) {
            setState(() {
              _search = v.trim();
              _loading = true;
            });
            _loadCustomers();
          },
          onChanged: (v) {
            // 简单防抖：500ms 后触发
            final q = v.trim();
            Future.delayed(const Duration(milliseconds: 500), () {
              if (!mounted) return;
              if (q == _searchCtl.text.trim() && q != _search) {
                setState(() {
                  _search = q;
                  _loading = true;
                });
                _loadCustomers();
              }
            });
          },
        ),
      ),
    );
  }

  Widget _tabs() {
    return SizedBox(
      height: 38,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
        itemCount: _customerTabs.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final t = _customerTabs[i];
          final active = _activeTab == t;
          return GestureDetector(
            onTap: () {
              HapticFeedback.selectionClick();
              setState(() => _activeTab = t);
            },
            child: Container(
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: active ? DT.textPrimary : DT.surface,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: active ? DT.textPrimary : DT.border),
              ),
              child: Text(t,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                    color: active ? Colors.white : DT.textSecondary,
                  )),
            ),
          );
        },
      ),
    );
  }

  Widget _empty() {
    return ListView(
      children: [
        const SizedBox(height: 80),
        Center(
          child: Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
                color: DT.surfaceAlt, borderRadius: BorderRadius.circular(24)),
            child: const Icon(CupertinoIcons.person_2,
                size: 32, color: DT.textTertiary),
          ),
        ),
        const SizedBox(height: 14),
        Center(
            child: Text(
                _search.isNotEmpty || _activeTab != '全部'
                    ? '没有找到匹配的客户'
                    : '还没有客户',
                style: const TextStyle(fontSize: 14, color: DT.textMuted))),
        const SizedBox(height: 6),
        const Center(
            child: Text('点击右上角「邀请客户」分享你的邀请链接',
                style: TextStyle(fontSize: 12, color: DT.textTertiary))),
      ],
    );
  }

  Widget _customerCard(Map<String, dynamic> c) {
    final id = c['id'] as int;
    final name = c['name']?.toString() ?? '';
    final phoneAsName = _isPhoneAsName(name);
    final tags = _parseTags(c['tags']);
    final address = c['address']?.toString() ?? '';
    final addressOk = address.isNotEmpty && address != '未填写地址';
    final recentAt =
        c['recentServiceAt']?.toString() ?? c['createdAt']?.toString();
    final totalSpent = (c['totalSpent'] as num?)?.toDouble() ?? 0;
    final totalOrders =
        (c['orderCount'] as int?) ?? (c['totalOrders'] as int?) ?? 0;
    final isEditing = _editingId == id;

    return GestureDetector(
      onTap: isEditing ? null : () => _openDetail(id),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
        decoration: BoxDecoration(
          color: DT.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: DT.border),
          boxShadow: DT.shadowTile,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // avatar
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                      color: const Color(0xFFFCE7EE), shape: BoxShape.circle),
                  child: phoneAsName
                      ? const Icon(CupertinoIcons.person_fill,
                          size: 22, color: Color(0xFFE86B8F))
                      : Text(name.isNotEmpty ? name.substring(0, 1) : '?',
                          style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFFE86B8F))),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 姓名 + 编辑
                      isEditing
                          ? _nameEditRow(id)
                          : _nameDisplayRow(c, phoneAsName),
                      const SizedBox(height: 4),
                      Text(
                        addressOk ? address : '暂无地址',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 12,
                            color:
                                addressOk ? DT.textSecondary : DT.textTertiary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            // 标签
            if (tags.isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: tags.map((t) {
                  final c = _getTagColor(t, _customTags);
                  return Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                        color: c.bg, borderRadius: BorderRadius.circular(999)),
                    child: Text(t,
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: c.text)),
                  );
                }).toList(),
              ),
            ],
            // 三宫格统计
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: const Color(0xFFFCF7F8),
                  borderRadius: BorderRadius.circular(14)),
              child: Row(
                children: [
                  Expanded(
                      child: _stat(
                          '最近服务', _fmtDateLabel(recentAt), DT.textPrimary)),
                  Expanded(
                      child: _stat('累计消费', '¥${totalSpent.toStringAsFixed(0)}',
                          DT.primary,
                          bold: true)),
                  Expanded(
                      child: _stat('服务次数', '$totalOrders 次', DT.textPrimary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _nameDisplayRow(Map<String, dynamic> c, bool phoneAsName) {
    final name = c['name']?.toString() ?? '';
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Flexible(
          child: Text(phoneAsName ? '未设置名称' : name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: phoneAsName ? DT.textMuted : DT.textPrimary)),
        ),
        GestureDetector(
          onTap: () {
            HapticFeedback.lightImpact();
            _startEdit(c);
          },
          behavior: HitTestBehavior.opaque,
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            child:
                Icon(CupertinoIcons.pencil, size: 14, color: DT.textTertiary),
          ),
        ),
        const Spacer(),
        const Icon(CupertinoIcons.chevron_right,
            size: 14, color: DT.textQuaternary),
      ],
    );
  }

  Widget _nameEditRow(int id) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _nameCtl,
            focusNode: _nameFocus,
            style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: DT.textPrimary),
            decoration: InputDecoration(
              isDense: true,
              hintText: '请输入客户名称',
              hintStyle: const TextStyle(color: DT.textTertiary, fontSize: 14),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              filled: true,
              fillColor: DT.surfaceAlt,
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none),
            ),
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _saveName(id),
          ),
        ),
        const SizedBox(width: 6),
        TextButton(
          onPressed: () => _saveName(id),
          style: TextButton.styleFrom(
            foregroundColor: Colors.white,
            backgroundColor: DT.primary,
            minimumSize: const Size(48, 32),
            padding: const EdgeInsets.symmetric(horizontal: 10),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          child: const Text('保存', style: TextStyle(fontSize: 12)),
        ),
        TextButton(
          onPressed: () => setState(() => _editingId = null),
          child: const Text('取消',
              style: TextStyle(fontSize: 12, color: DT.textSecondary)),
        ),
      ],
    );
  }

  Widget _stat(String label, String value, Color valueColor,
      {bool bold = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 11, color: DT.textTertiary)),
        const SizedBox(height: 4),
        Text(value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
                fontSize: 12,
                fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                color: valueColor)),
      ],
    );
  }

  String _fmtDateLabel(String? iso) {
    if (iso == null || iso.isEmpty) return '暂无记录';
    final d = DateTime.tryParse(iso);
    if (d == null) return '暂无记录';
    final t = d.toLocal();
    final now = DateTime.now();
    final diff = DateTime(now.year, now.month, now.day)
        .difference(DateTime(t.year, t.month, t.day))
        .inDays;
    if (diff == 0) return '今天';
    if (diff == 1) return '昨天';
    if (diff < 7) return '$diff 天前';
    if (t.year == now.year) return '${t.month}月${t.day}日';
    return '${t.year}/${t.month}/${t.day}';
  }
}
