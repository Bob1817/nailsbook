import 'dart:convert';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/maps/map_service.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/glass_container.dart';
import '../../../core/widgets/nb_shared_components.dart';
import '../../../core/widgets/nb_toast.dart';
import '../auth/technician_auth_service.dart';
import '../orders/technician_create_booking_sheet.dart';
import '../orders/technician_order_detail_screen.dart';
import '../orders/technician_orders_screen.dart';
import 'technician_customer_service.dart';

class TechnicianCustomerDetailScreen extends StatefulWidget {
  final int customerId;

  const TechnicianCustomerDetailScreen({super.key, required this.customerId});

  @override
  State<TechnicianCustomerDetailScreen> createState() =>
      _TechnicianCustomerDetailScreenState();
}

const _tagFallbackColors = <String, ({Color bg, Color text})>{
  '常客': (bg: Color(0xFFFFE9F0), text: Color(0xFFE86B8F)),
  '新客': (bg: Color(0xFFEBF4FF), text: Color(0xFF3B82F6)),
  '高频': (bg: Color(0xFFFFF1E5), text: Color(0xFFC9792A)),
  '简约': (bg: Color(0xFFEEF9F1), text: Color(0xFF31B46C)),
  '裸色系': (bg: Color(0xFFFFF8E6), text: Color(0xFFC9860A)),
};
const _tagDefaultColor = (bg: Color(0xFFF2F0F3), text: Color(0xFF6D6570));

class _TechnicianCustomerDetailScreenState
    extends State<TechnicianCustomerDetailScreen> {
  Map<String, dynamic>? _customer;
  List<dynamic> _customTags = [];
  bool _loading = true;
  bool _savingTags = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
    _loadCustomer();
  }

  Future<void> _loadProfile() async {
    try {
      final profile =
          await TechnicianAuthService(context.read<ApiClient>()).getProfile();
      if (mounted) {
        setState(() => _customTags = profile.customTags ?? const []);
      }
    } catch (_) {}
  }

  Future<void> _loadCustomer() async {
    try {
      final apiClient = context.read<ApiClient>();
      final service = TechnicianCustomerService(apiClient);
      final data = await service.detail(widget.customerId);
      if (mounted) {
        setState(() {
          _customer = data;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String get _name {
    final c = _customer;
    if (c == null) return '客户';
    final raw = c['name']?.toString() ?? c['nickname']?.toString();
    return raw?.trim().isNotEmpty == true ? raw!.trim() : '客户';
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: DT.bg,
      body: Column(
        children: [
          _header(topPad),
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: DT.primary))
                : _customer == null
                    ? const Center(child: Text('未找到该客户', style: DT.bodySmall))
                    : RefreshIndicator(
                        color: DT.primary,
                        onRefresh: _loadCustomer,
                        child: ListView(
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 116),
                          children: [
                            _profileCard(),
                            const SizedBox(height: 16),
                            _infoCard(),
                            const SizedBox(height: 16),
                            _preferenceCard(),
                            const SizedBox(height: 16),
                            _historyCard(),
                          ],
                        ),
                      ),
          ),
          if (_customer != null) _bottomBar(bottomPad),
        ],
      ),
    );
  }

  Widget _header(double topPad) {
    return GlassContainer(
      blur: DT.glassBlurHeavy,
      opacity: 0.72,
      borderRadius: 0,
      showBorder: false,
      padding: EdgeInsets.fromLTRB(20, topPad + 8, 20, 12),
      child: Row(
        children: [
          _roundIconButton(
            CupertinoIcons.back,
            () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
            },
          ),
          const SizedBox(width: 12),
          const Expanded(child: Text('客户详情', style: DT.titleMedium)),
          if (!_loading && _customer != null)
            _roundIconButton(CupertinoIcons.phone, _callCustomer),
        ],
      ),
    );
  }

  Widget _roundIconButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: const BoxDecoration(
          color: DT.surface,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 19, color: DT.textPrimary),
      ),
    );
  }

  Widget _profileCard() {
    final c = _customer!;
    final phone = _str(c['phone'], fallback: '未填写');
    final tags = _tags(c['tags']);
    final totalSpent = _num(c['totalSpent'] ?? c['totalSpending']);
    final totalOrders =
        _int(c['totalOrders'] ?? c['orderCount'] ?? c['serviceCount']);
    final recentAt =
        _str(c['recentServiceAt'] ?? c['lastVisitDate'] ?? c['createdAt']);

    return _card(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 56,
            height: 56,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              color: DT.primarySoft,
              shape: BoxShape.circle,
            ),
            child: Text(
              _name.characters.first,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: DT.primary,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: DT.titleMedium),
                          const SizedBox(height: 3),
                          Text(phone,
                              style: DT.bodySmall
                                  .copyWith(color: DT.textSecondary)),
                        ],
                      ),
                    ),
                    GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => _showTagEditor(tags),
                      child: Container(
                        constraints: const BoxConstraints(minHeight: 44),
                        alignment: Alignment.center,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: DT.divider),
                          borderRadius: BorderRadius.circular(DT.rFull),
                        ),
                        child: Text(
                          tags.isEmpty ? '+ 添加标签' : '编辑',
                          style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: DT.textSecondary),
                        ),
                      ),
                    ),
                  ],
                ),
                if (tags.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: tags.map(_tagChip).toList(),
                  ),
                ],
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: DT.bgWarm,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                          child: _metric('累计消费', _money(totalSpent),
                              accent: true)),
                      Expanded(
                          child: _metric('服务次数',
                              totalOrders == null ? '--' : '$totalOrders 次')),
                      Expanded(
                          child: _metric(
                              '最近到店',
                              recentAt.isEmpty
                                  ? '暂无记录'
                                  : _dateLabel(recentAt))),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _metric(String label, String value, {bool accent = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 11, color: DT.textTertiary)),
        const SizedBox(height: 5),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: accent ? DT.primary : DT.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _infoCard() {
    final c = _customer!;
    return _sectionCard(
      title: '基础信息',
      subtitle: '客户资料与最近沟通备注',
      children: [
        _infoRow(
          '地址',
          _str(c['address'], fallback: '未填写地址'),
          action: _addressAction(),
        ),
        _infoRow('备注', _str(c['note'] ?? c['notes'], fallback: '暂无备注')),
      ],
    );
  }

  Widget? _addressAction() {
    final address = _str(_customer?['address']);
    if (address.isEmpty || address == '未填写地址') return null;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () async {
        HapticFeedback.lightImpact();
        final ok = await MapService.launchAddressNavigation(address);
        if (!ok && mounted) NbToast.error(context, '无法打开导航');
      },
      child: Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: DT.infoBg,
          borderRadius: BorderRadius.circular(DT.rFull),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(CupertinoIcons.location, size: 14, color: DT.infoText),
            SizedBox(width: 5),
            Text('导航',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: DT.infoText)),
          ],
        ),
      ),
    );
  }

  Widget _preferenceCard() {
    final c = _customer!;
    final tags = _tags(c['tags']);
    return _sectionCard(
      title: '偏好信息',
      subtitle: '风格、颜色与风险提醒',
      children: [
        _infoRow(
            '喜好款式',
            _str(c['preferenceStyle'],
                fallback: tags.isEmpty ? '暂无记录' : tags.first)),
        _infoRow(
            '颜色偏好',
            _str(c['preferenceColor'],
                fallback: tags.length > 1 ? tags[1] : '暂无记录')),
        _infoRow(
          '过敏信息',
          _str(c['allergyNote'], fallback: '暂无记录'),
          danger: true,
        ),
      ],
    );
  }

  Widget _historyCard() {
    final history = _history(_customer!);
    return _sectionCard(
      title: '历史记录',
      subtitle: '按时间查看服务、状态与金额',
      trailing: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: _viewAllOrders,
        child: Container(
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.symmetric(horizontal: 14),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: Border.all(color: DT.divider),
            borderRadius: BorderRadius.circular(DT.rFull),
          ),
          child: const Text('查看预约',
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: DT.textSecondary)),
        ),
      ),
      children: [
        if (history.isEmpty)
          Text('暂无历史服务记录', style: DT.bodySmall.copyWith(color: DT.textTertiary))
        else
          ...history.map(_historyTile),
      ],
    );
  }

  Widget _historyTile(Map<String, dynamic> item) {
    final id = item['id'] as int?;
    final status = _str(item['status']);
    final price = _num(item['price'] ?? item['quotePrice']);
    final depositPaid =
        item['depositPaid'] as bool? ?? item['isDepositPaid'] as bool? ?? false;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: id == null
          ? null
          : () {
              HapticFeedback.lightImpact();
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => TechnicianOrderDetailScreen(orderId: id)),
              );
            },
      child: Container(
        margin: const EdgeInsets.only(top: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: DT.bgWarm,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(_historyLabel(item),
                          style: DT.titleSmall.copyWith(fontSize: 14)),
                      if (status.isNotEmpty)
                        OrderStatusBadge(status: status, fontSize: 10),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Text(
                      _dateLabel(_str(item['date'] ??
                          item['startTime'] ??
                          item['createdAt'])),
                      style: const TextStyle(
                          fontSize: 12, color: DT.textTertiary)),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(_money(price),
                    style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: DT.primary)),
                const SizedBox(height: 5),
                Text(
                  depositPaid ? '定金已收' : '定金待收',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: depositPaid ? DT.successText : DT.warningText,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _bottomBar(double bottomPad) {
    return GlassBottomSurface(
      padding:
          EdgeInsets.fromLTRB(20, 12, 20, bottomPad > 0 ? bottomPad + 10 : 16),
      child: Row(
        children: [
          Expanded(
            child: _actionButton(
              '新建预约',
              filled: true,
              onTap: _createOrder,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _actionButton(
              '查看预约',
              onTap: _viewActiveOrders,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _actionButton(
              '历史预约',
              muted: true,
              onTap: _viewAllOrders,
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionButton(
    String label, {
    required VoidCallback onTap,
    bool filled = false,
    bool muted = false,
  }) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        height: 48,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: filled ? DT.primary : DT.surface,
          borderRadius: BorderRadius.circular(DT.rFull),
          border: filled
              ? null
              : Border.all(color: muted ? DT.divider : DT.primaryBorder),
        ),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color:
                filled ? Colors.white : (muted ? DT.textSecondary : DT.primary),
          ),
        ),
      ),
    );
  }

  Widget _sectionCard({
    required String title,
    required String subtitle,
    required List<Widget> children,
    Widget? trailing,
  }) {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: DT.titleMedium),
                    const SizedBox(height: 3),
                    Text(subtitle,
                        style: const TextStyle(
                            fontSize: 12, color: DT.textTertiary)),
                  ],
                ),
              ),
              if (trailing != null) trailing,
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value,
      {Widget? action, bool danger = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 72,
            child: Text(label,
                style: const TextStyle(fontSize: 14, color: DT.textSecondary)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 14,
                height: 1.45,
                color: danger ? DT.error : DT.textPrimary,
              ),
            ),
          ),
          if (action != null) ...[
            const SizedBox(width: 10),
            action,
          ],
        ],
      ),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: DT.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: DT.dividerWarm),
        boxShadow: DT.shadowSm,
      ),
      child: child,
    );
  }

  Widget _tagChip(String tag) {
    final tc = _tagColor(tag);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: tc.bg,
        borderRadius: BorderRadius.circular(DT.rFull),
      ),
      child: Text(
        tag,
        style: TextStyle(
            fontSize: 12, fontWeight: FontWeight.w600, color: tc.text),
      ),
    );
  }

  void _showTagEditor(List<String> currentTags) {
    final editingTags = [...currentTags];
    final tagCtl = TextEditingController();
    final allTags = <String>{
      ..._customTags
          .whereType<Map<String, dynamic>>()
          .map((t) => t['name']?.toString() ?? '')
          .where((t) => t.isNotEmpty),
      ...currentTags,
    }.toList();

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            void addTag(String value) {
              final tag = value.trim();
              if (tag.isEmpty || editingTags.contains(tag)) return;
              HapticFeedback.selectionClick();
              setSheetState(() => editingTags.add(tag));
              tagCtl.clear();
            }

            return SafeArea(
              top: false,
              child: Container(
                padding: EdgeInsets.fromLTRB(
                  20,
                  8,
                  20,
                  MediaQuery.of(ctx).viewInsets.bottom + 20,
                ),
                decoration: const BoxDecoration(
                  color: DT.surface,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                ),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Container(
                          width: 40,
                          height: 4,
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: DT.border,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                      Row(
                        children: [
                          const Expanded(
                              child: Text('编辑标签', style: DT.titleMedium)),
                          _roundSheetClose(ctx),
                        ],
                      ),
                      const SizedBox(height: 18),
                      const Text('当前标签（点击移除）',
                          style:
                              TextStyle(fontSize: 12, color: DT.textSecondary)),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: editingTags.isEmpty
                            ? [
                                const Text('暂无标签',
                                    style: TextStyle(
                                        fontSize: 12, color: DT.textMuted))
                              ]
                            : editingTags.map((tag) {
                                final tc = _tagColor(tag);
                                return GestureDetector(
                                  onTap: () {
                                    HapticFeedback.selectionClick();
                                    setSheetState(
                                        () => editingTags.remove(tag));
                                  },
                                  child: Container(
                                    constraints:
                                        const BoxConstraints(minHeight: 36),
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: tc.bg,
                                      borderRadius:
                                          BorderRadius.circular(DT.rFull),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(tag,
                                            style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w600,
                                                color: tc.text)),
                                        const SizedBox(width: 5),
                                        Icon(CupertinoIcons.xmark,
                                            size: 12, color: tc.text),
                                      ],
                                    ),
                                  ),
                                );
                              }).toList(),
                      ),
                      const SizedBox(height: 18),
                      const Text('可选标签（点击添加）',
                          style:
                              TextStyle(fontSize: 12, color: DT.textSecondary)),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: allTags
                                .where((t) => !editingTags.contains(t))
                                .isEmpty
                            ? [
                                const Text('所有标签已添加',
                                    style: TextStyle(
                                        fontSize: 12, color: DT.textMuted))
                              ]
                            : allTags
                                .where((t) => !editingTags.contains(t))
                                .map((tag) {
                                final tc = _tagColor(tag);
                                return GestureDetector(
                                  onTap: () => addTag(tag),
                                  child: Container(
                                    constraints:
                                        const BoxConstraints(minHeight: 36),
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: tc.bg,
                                      borderRadius:
                                          BorderRadius.circular(DT.rFull),
                                      border: Border.all(color: DT.divider),
                                    ),
                                    child: Text('+ $tag',
                                        style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: tc.text)),
                                  ),
                                );
                              }).toList(),
                      ),
                      const SizedBox(height: 18),
                      Row(
                        children: [
                          Expanded(
                            child: CupertinoTextField(
                              controller: tagCtl,
                              placeholder: '输入新标签名称',
                              maxLength: 10,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 13),
                              decoration: BoxDecoration(
                                border: Border.all(color: DT.border),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              onSubmitted: addTag,
                            ),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () => addTag(tagCtl.text),
                            child: Container(
                              height: 44,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 16),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: DT.primary,
                                borderRadius: BorderRadius.circular(DT.rFull),
                              ),
                              child: const Text('添加',
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.white)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _savingTags
                              ? null
                              : () async {
                                  final navigator = Navigator.of(ctx);
                                  await _saveTags(editingTags);
                                  if (mounted && navigator.canPop()) {
                                    navigator.pop();
                                  }
                                },
                          child: Text(_savingTags ? '保存中...' : '保存标签'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    ).whenComplete(tagCtl.dispose);
  }

  Widget _roundSheetClose(BuildContext ctx) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => Navigator.pop(ctx),
      child: Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration:
            const BoxDecoration(color: DT.surfaceAlt, shape: BoxShape.circle),
        child:
            const Icon(CupertinoIcons.xmark, size: 16, color: DT.textSecondary),
      ),
    );
  }

  Future<void> _saveTags(List<String> tags) async {
    if (_savingTags) return;
    setState(() => _savingTags = true);
    try {
      final apiClient = context.read<ApiClient>();
      await TechnicianCustomerService(apiClient)
          .updateTags(widget.customerId, tags.join(','));
      if (mounted) {
        setState(() {
          _customer = {
            ...?_customer,
            'tags': [...tags]
          };
          _savingTags = false;
        });
        NbToast.success(context, '标签已更新');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _savingTags = false);
        NbToast.error(context, '保存标签失败');
      }
    }
  }

  void _createOrder() {
    HapticFeedback.lightImpact();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => TechnicianCreateBookingSheet(
        customers: [_customer!],
        presetCustomerId: widget.customerId,
        onCreated: (_) => _loadCustomer(),
      ),
    );
  }

  void _viewActiveOrders() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => TechnicianOrdersScreen(
          initialCustomerId: widget.customerId,
          initialCustomerName: _name,
          initialActiveOnly: true,
        ),
      ),
    );
  }

  void _viewAllOrders() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => TechnicianOrdersScreen(
          initialCustomerId: widget.customerId,
          initialCustomerName: _name,
        ),
      ),
    );
  }

  Future<void> _callCustomer() async {
    final phone = _str(_customer?['phone']);
    if (phone.isEmpty || phone == '未填写') {
      NbToast.error(context, '当前客户暂无联系电话');
      return;
    }
    final ok = await MapService.launchPhoneCall(phone);
    if (!ok && mounted) NbToast.error(context, '无法拨打电话');
  }

  ({Color bg, Color text}) _tagColor(String tag) {
    for (final item in _customTags.whereType<Map<String, dynamic>>()) {
      if (item['name']?.toString() != tag) continue;
      final color = item['color']?.toString() ?? item['textColor']?.toString();
      if (color == null || color.isEmpty) break;
      final preset = <String, Color>{
        '#FF5E93': const Color(0xFFFFE9F0),
        '#C9792A': const Color(0xFFFFF1E5),
        '#31B46C': const Color(0xFFEEF9F1),
        '#3B82F6': const Color(0xFFEBF4FF),
        '#7C3AED': const Color(0xFFF5F0FF),
        '#C9860A': const Color(0xFFFFF8E6),
        '#6D6570': const Color(0xFFF2F0F3),
        '#E53E3E': const Color(0xFFFFE4E4),
      };
      return (bg: preset[color] ?? DT.surfaceAlt, text: _parseHex(color));
    }
    return _tagFallbackColors[tag] ?? _tagDefaultColor;
  }

  Color _parseHex(String value) {
    var hex = value.replaceAll('#', '');
    if (hex.length == 6) hex = 'FF$hex';
    return Color(int.parse(hex, radix: 16));
  }

  List<String> _tags(dynamic raw) {
    if (raw == null) return const [];
    if (raw is List) {
      return raw
          .map((e) => e.toString().trim())
          .where((e) => e.isNotEmpty)
          .toList();
    }
    final text = raw.toString().trim();
    if (text.isEmpty) return const [];
    try {
      final decoded = jsonDecode(text);
      if (decoded is List) {
        return decoded
            .map((e) => e.toString().trim())
            .where((e) => e.isNotEmpty)
            .toList();
      }
    } catch (_) {}
    return text
        .replaceAll('，', ',')
        .replaceAll(';', ',')
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
  }

  List<Map<String, dynamic>> _history(Map<String, dynamic> c) {
    final explicit = c['history'];
    if (explicit is List) {
      return explicit.whereType<Map<String, dynamic>>().toList();
    }
    final orders = c['orders'];
    if (orders is List) {
      return orders.whereType<Map<String, dynamic>>().map((order) {
        return {
          ...order,
          'label':
              order['customTitle'] ?? order['serviceName'] ?? order['orderNo'],
          'date': order['startTime'] ?? order['createdAt'],
          'price': order['price'] ?? order['quotePrice'],
          'depositPaid': order['depositPaid'] ?? order['isDepositPaid'],
        };
      }).toList();
    }
    return const [];
  }

  String _historyLabel(Map<String, dynamic> item) {
    return _str(
      item['label'] ??
          item['customTitle'] ??
          item['serviceName'] ??
          item['orderNo'],
      fallback: '预约服务',
    );
  }

  String _str(dynamic value, {String fallback = ''}) {
    final text = value?.toString().trim() ?? '';
    return text.isEmpty ? fallback : text;
  }

  int? _int(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }

  num? _num(dynamic value) {
    if (value is num) return value;
    return num.tryParse(value?.toString() ?? '');
  }

  String _money(num? amount) {
    if (amount == null) return '¥0';
    return '¥${amount.toStringAsFixed(0)}';
  }

  String _dateLabel(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso.isEmpty ? '暂无记录' : iso;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final date = DateTime(dt.year, dt.month, dt.day);
    if (date == today) return '今天';
    if (date == today.add(const Duration(days: 1))) return '明天';
    if (date == today.subtract(const Duration(days: 1))) return '昨天';
    return '${dt.year}.${dt.month.toString().padLeft(2, '0')}.${dt.day.toString().padLeft(2, '0')}';
  }
}
