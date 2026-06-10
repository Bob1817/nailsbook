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
import '../../shared/chat/chat_screen.dart';
import '../../shared/chat/chat_service.dart';
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

// 标签兜底色板：与 webapp CustomerDetailPage 的 TAG_FALLBACK_COLORS 一致。
const _tagFallbackColors = <String, ({Color bg, Color text})>{
  '常客': (bg: Color(0xFFFFE9F0), text: Color(0xFFFF5E93)),
  '新客': (bg: Color(0xFFEBF4FF), text: Color(0xFF3B82F6)),
  '高频': (bg: Color(0xFFFFF1E5), text: Color(0xFFC9792A)),
  '简约': (bg: Color(0xFFEEF9F1), text: Color(0xFF31B46C)),
  '裸色系': (bg: Color(0xFFFFF8E6), text: Color(0xFFC9860A)),
};
const _tagDefaultColor = (bg: Color(0xFFF2F0F3), text: Color(0xFF6D6570));
// 客户头像配色（webapp 详情页风格）
const _avatarBg = Color(0xFFFDECEF);
const _avatarText = Color(0xFFE86B8F);

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
    final headerHeight = topPad + 60;
    // 底部操作栏固定高度（48 按钮 + 上 12 + 下 16）
    const bottomBarHeight = 48.0 + 12 + 16;

    return Scaffold(
      backgroundColor: DT.bg,
      // 列表滚动可穿过顶部/底部玻璃层，形成液态玻璃透视
      body: Stack(
        children: [
          if (_loading)
            const Center(child: CircularProgressIndicator(color: DT.primary))
          else if (_customer == null)
            const Center(child: Text('未找到该客户', style: DT.bodySmall))
          else
            RefreshIndicator(
              color: DT.primary,
              onRefresh: _loadCustomer,
              child: ListView(
                padding: EdgeInsets.fromLTRB(
                    20, headerHeight + 8, 20, bottomBarHeight + 20),
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
          // 顶部液态玻璃 header（透出后方滚动内容）
          Positioned(
              left: 0, right: 0, top: 0, child: _header(topPad)),
          // 底部液态玻璃操作栏
          if (_customer != null)
            Positioned(
                left: 0, right: 0, bottom: 0,
                child: _bottomBar(bottomPad)),
        ],
      ),
    );
  }

  Widget _header(double topPad) {
    return GlassContainer(
      blur: DT.glassBlurHeavy,
      opacity: 0.5,
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
          // 右上角编辑：打开标签编辑弹窗
          if (!_loading && _customer != null)
            _roundIconButton(CupertinoIcons.pencil,
                () => _showTagEditor(_tags(_customer!['tags']))),
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
              color: _avatarBg,
              shape: BoxShape.circle,
            ),
            child: Text(
              _name.characters.first.toUpperCase(),
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: _avatarText,
              ),
            ),
          ),
          const SizedBox(width: 14),
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
                    style: DT.bodySmall.copyWith(color: DT.textSecondary)),
                if (tags.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  // 标签胶囊（编辑入口在右上角导航按钮）
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
                  // 服务方式 · 日期（订单编号为次要信息，不在此展示）
                  Text(
                      [
                        _serviceTypeLabel(_str(item['serviceType'])),
                        _dateLabel(_str(item['date'] ??
                            item['startTime'] ??
                            item['createdAt'])),
                      ].where((s) => s.isNotEmpty).join(' · '),
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
    // 玻璃操作区铺满到屏幕底部；按钮距屏幕底部固定 16（与主导航 dock 一致）
    return GlassContainer(
      blur: DT.glassBlurHeavy,
      opacity: 0.5,
      borderRadius: 0,
      showBorder: false,
      boxShadow: const [
        BoxShadow(
          color: Color(0x10000000),
          blurRadius: 24,
          offset: Offset(0, -8),
        ),
      ],
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
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
              '电话联系',
              onTap: _callCustomer,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _actionButton(
              '发送消息',
              muted: true,
              onTap: _openChat,
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

  /// 通用「label : value (+ 右侧动作)」单元。
  /// 地址/备注左对齐展示；动作（如「导航」）放在右侧并垂直居中，避免被挤压。
  Widget _infoRow(String label, String value,
      {Widget? action, bool danger = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(fontSize: 12, color: DT.textTertiary)),
                const SizedBox(height: 4),
                Text(
                  value,
                  textAlign: TextAlign.left,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: danger ? DT.error : DT.textPrimary,
                  ),
                ),
              ],
            ),
          ),
          if (action != null) ...[
            const SizedBox(width: 12),
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
        // 柔玻璃面：去掉硬边框，仅以阴影分层
        color: Colors.white.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 18,
              offset: const Offset(0, 6)),
        ],
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

            // 不用 SafeArea：弹窗底部不留空白间隔，内容直接贴底（键盘弹起时跟随 viewInsets）
            return Container(
                padding: EdgeInsets.fromLTRB(
                  20,
                  8,
                  20,
                  MediaQuery.of(ctx).viewInsets.bottom + 16,
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

  /// 发送消息：有会话直接进入对话页，没有则以 clientUserId 发起新会话。
  Future<void> _openChat() async {
    final clientUserId = _int(_customer?['clientUserId']) ??
        _int((_customer?['clientUser'] as Map<String, dynamic>?)?['id']);
    if (clientUserId == null) {
      NbToast.error(context, '该客户尚未注册客户端，暂不支持在线消息');
      return;
    }
    final api = context.read<ApiClient>();
    int? convId;
    try {
      final convs = await ChatService(api).conversations();
      for (final conv in convs) {
        if ((conv['client'] as Map<String, dynamic>?)?['id'] == clientUserId) {
          convId = conv['id'] as int?;
          break;
        }
      }
    } catch (_) {}
    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatScreen(
          conversationId: convId,
          title: _name,
          otherPartyId: clientUserId,
          clientId: clientUserId,
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

  /// 历史记录标题：美甲主题 / 服务名（订单编号属次要信息，不作为标题展示）。
  String _historyLabel(Map<String, dynamic> item) {
    final label = _str(item['label']);
    // _history 映射时 label 可能落到 orderNo，此处过滤掉纯编号
    if (label.isNotEmpty && !RegExp(r'^[A-Z0-9\-_]{8,}$').hasMatch(label)) {
      return label;
    }
    return _str(
      item['customTitle'] ?? item['serviceName'],
      fallback: '预约服务',
    );
  }

  String _serviceTypeLabel(String s) {
    if (s == 'home' || s == '上门美甲') return '上门美甲';
    if (s == 'shop' || s == '到店美甲') return '到店美甲';
    return s;
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
