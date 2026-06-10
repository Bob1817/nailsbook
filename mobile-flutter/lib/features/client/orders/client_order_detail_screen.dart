import 'dart:ui';
import 'package:flutter/material.dart';
import '../../shared/chat/chat_screen.dart';
import '../../shared/chat/chat_service.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/glass_container.dart';
import '../addresses/client_address_models.dart';
import '../addresses/client_address_service.dart';
import 'client_order_models.dart';
import 'client_order_service.dart';
import '../../../core/widgets/nb_toast.dart';

const _statusLabels = {
  'pending_quote': '待报价',
  'pending_agree': '待确认',
  'pending_confirm': '待确认',
  'pending_home': '待上门',
  'pending_shop': '待到店',
  'in_progress': '进行中',
  'completed': '已完成',
  'cancelled': '已取消',
};

final _statusColors = {
  'pending_quote': (DT.warningBg, DT.warningText),
  'pending_agree': (DT.infoBg, DT.infoText),
  'pending_confirm': (DT.infoSoft, DT.infoText),
  'pending_home': (DT.successBg, DT.successText),
  'pending_shop': (DT.successBg, DT.successText),
  'in_progress': (DT.warningBg, DT.warningText),
  'completed': (DT.surfaceAlt, DT.textSecondary),
  'cancelled': (DT.errorBg, DT.errorText),
};

String _clientWaitingLabel(String status) {
  switch (status) {
    case 'pending_quote':
      return '等待美甲师报价';
    case 'pending_confirm':
      return '等待美甲师确认';
    case 'pending_home':
      return '等待上门服务';
    case 'pending_shop':
      return '等待到店服务';
    case 'in_progress':
      return '服务进行中';
    default:
      return '处理中';
  }
}

const _timeSlots = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
];

class ClientOrderDetailScreen extends StatefulWidget {
  final int orderId;
  const ClientOrderDetailScreen({super.key, required this.orderId});

  @override
  State<ClientOrderDetailScreen> createState() =>
      _ClientOrderDetailScreenState();
}

class _ClientOrderDetailScreenState extends State<ClientOrderDetailScreen> {
  ClientOrder? _order;
  bool _loading = true;
  bool _actionLoading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>();
      final order = await ClientOrderService(api).detail(widget.orderId);
      if (mounted)
        setState(() {
          _order = order;
          _loading = false;
        });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Actions ──

  Future<void> _agree() async {
    setState(() => _actionLoading = true);
    try {
      final api = context.read<ApiClient>();
      final updated = await ClientOrderService(api).agree(widget.orderId);
      if (mounted) setState(() => _order = updated);
    } catch (e) {
      if (mounted) _showError('同意报价失败');
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _reject(String reason) async {
    setState(() => _actionLoading = true);
    try {
      final api = context.read<ApiClient>();
      final updated = await ClientOrderService(api)
          .rejectQuote(widget.orderId, reason.isEmpty ? '价格不合适' : reason);
      if (mounted) setState(() => _order = updated);
    } catch (e) {
      if (mounted) _showError('拒绝报价失败');
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _cancel() async {
    setState(() => _actionLoading = true);
    try {
      final api = context.read<ApiClient>();
      final updated = await ClientOrderService(api)
          .updateStatus(widget.orderId, 'cancelled');
      if (mounted) setState(() => _order = updated);
    } catch (e) {
      if (mounted) _showError('取消预约失败');
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _markDepositPaid() async {
    setState(() => _actionLoading = true);
    try {
      final api = context.read<ApiClient>();
      final updated =
          await ClientOrderService(api).markDepositPaid(widget.orderId);
      if (mounted) setState(() => _order = updated);
    } catch (e) {
      if (mounted) _showError('确认定金失败');
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  void _showError(String msg) {
    NbToast.show(context, msg);
  }

  // ── Build ──

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: DT.bg,
      body: Container(
        decoration: const BoxDecoration(
          gradient: DT.profilePageGradient,
        ),
        child: _loading
            ? _buildSkeleton(topPad)
            : _order == null
                ? _buildError(topPad)
                : _buildContent(topPad, bottomPad),
      ),
    );
  }

  Widget _buildContent(double topPad, double bottomPad) {
    final o = _order!;
    final isCancellable = [
      'pending_quote',
      'pending_agree',
      'pending_confirm',
      'pending_home',
      'pending_shop'
    ].contains(o.status);
    final isClientTurn = o.status == 'pending_agree';
    final canMarkDeposit = o.status == 'pending_confirm' &&
        (o.depositAmount ?? 0) > 0 &&
        !o.isDepositPaid;
    final isTerminal = o.status == 'completed' || o.status == 'cancelled';

    return Stack(
      children: [
        RefreshIndicator(
          color: DT.primary,
          onRefresh: _load,
          child: ListView(
            padding: EdgeInsets.fromLTRB(DT.lg, topPad + 60, DT.lg,
                isTerminal ? bottomPad + DT.space24 : 160 + bottomPad),
            children: [
              _buildTechAddressCard(o),
              const SizedBox(height: DT.space16),
              _buildStatusCard(o),
              const SizedBox(height: DT.space16),
              _buildServiceInfo(o),
              const SizedBox(height: DT.space24),
            ],
          ),
        ),
        // 固定顶部返回栏（随时可关闭）
        Positioned(left: 0, right: 0, top: 0, child: _pinnedHeader(topPad)),
        if (!isTerminal)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _buildBottomBar(
                o, isClientTurn, isCancellable, canMarkDeposit, bottomPad),
          ),
      ],
    );
  }

  // ── Pinned Header ──

  Widget _pinnedHeader(double topPad) {
    return GlassContainer(
      blur: DT.glassBlurHeavy,
      opacity: 0.64,
      borderRadius: 0,
      showBorder: false,
      padding: EdgeInsets.fromLTRB(DT.lg, topPad + 8, DT.lg, 10),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: DT.surface.withOpacity(0.9),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.black.withOpacity(0.05)),
              ),
              child: Icon(Icons.arrow_back_ios_new_rounded,
                  size: 18, color: DT.textSecondary),
            ),
          ),
          const SizedBox(width: 12),
          Text('预约详情', style: DT.titleLarge),
        ],
      ),
    );
  }

  // ── Merged Technician + Address Card ──

  Widget _buildTechAddressCard(ClientOrder o) {
    final tech = o.technician;
    final techId = tech?['id'] as int?;
    final techName = tech?['name']?.toString() ?? '美甲师';
    final techPhone = tech?['phone']?.toString() ?? '';
    final techAvatar = tech?['avatarUrl']?.toString();

    return _glassCard(
      title: '服务美甲师',
      subtitle: '专属美甲师与本次服务地址',
      children: [
        Row(
          children: [
            CircleAvatar(
              radius: 26,
              backgroundColor: DT.primarySoft,
              backgroundImage: (techAvatar != null && techAvatar.isNotEmpty)
                  ? NetworkImage(techAvatar)
                  : null,
              child: (techAvatar == null || techAvatar.isEmpty)
                  ? Text(techName.substring(0, 1),
                      style: const TextStyle(
                          color: DT.primary,
                          fontSize: 18,
                          fontWeight: FontWeight.w600))
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
                  if (techPhone.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(techPhone,
                        style:
                            const TextStyle(fontSize: 13, color: DT.textMuted)),
                  ],
                ],
              ),
            ),
            if (techId != null)
              GestureDetector(
                onTap: () => _openDirectChat(techId, techName),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                      color: DT.primarySoft,
                      borderRadius: BorderRadius.circular(999)),
                  child: const Text('发消息',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: DT.primary)),
                ),
              ),
          ],
        ),
        const SizedBox(height: 14),
        const Divider(height: 1, color: DT.divider),
        const SizedBox(height: 14),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                  color: DT.primarySoft,
                  borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.location_on_outlined,
                  size: 20, color: DT.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(o.serviceType == '到店美甲' ? '到店地址' : '上门地址',
                      style:
                          const TextStyle(fontSize: 12, color: DT.textMuted)),
                  const SizedBox(height: 3),
                  Text(o.address ?? '地址待确认',
                      style: const TextStyle(
                          fontSize: 14, height: 1.5, color: DT.textPrimary)),
                  if (o.clientAddress != null &&
                      o.clientAddress!['doorInfo'] != null) ...[
                    const SizedBox(height: 4),
                    Text(o.clientAddress!['doorInfo'].toString(),
                        style:
                            const TextStyle(fontSize: 12, color: DT.textMuted)),
                  ],
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _openDirectChat(int techId, String techName) async {
    final api = context.read<ApiClient>();
    int? convId;
    try {
      final convs = await ChatService(api).conversations();
      for (final c in convs) {
        if ((c['technician'] as Map<String, dynamic>?)?['id'] == techId) {
          convId = c['id'] as int?;
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
              title: techName,
              otherPartyId: techId,
              techId: techId),
        ));
  }

  // ── Status Card ──

  Widget _buildStatusCard(ClientOrder o) {
    final colors = _statusColors[o.status] ??
        (const Color(0xFF2A241E), const Color(0xFF4B5563));
    final hasDeposit = (o.depositAmount ?? 0) > 0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: DT.surface.withOpacity(0.62),
        borderRadius: BorderRadius.circular(32),
        boxShadow: DT.shadowMd,
        border: Border.all(color: Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Expanded(
                child: Text('当前预约状态',
                    style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: DT.textPrimary)),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                    color: colors.$1, borderRadius: BorderRadius.circular(999)),
                child: Text(_statusLabels[o.status] ?? o.status,
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: colors.$2)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Quote price in gradient box
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF3A2F23), Color(0xFF211C17)],
              ),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  o.quotePrice != null && o.quotePrice! > 0
                      ? '¥${o.quotePrice!.toStringAsFixed(0)}'
                      : '待报价',
                  style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.8,
                      color: DT.textPrimary),
                ),
                const SizedBox(height: 4),
                Text(
                  o.quotePrice != null && o.quotePrice! > 0
                      ? '当前报价金额'
                      : '美甲师确认后会展示服务报价',
                  style: TextStyle(fontSize: 13, color: DT.textMuted),
                ),
                if (o.quoteRemark != null && o.quoteRemark!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(o.quoteRemark!,
                      style: TextStyle(fontSize: 13, color: DT.textMuted)),
                ],
                // Deposit info
                if (hasDeposit) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                          colors: [Color(0xFFFFFBEB), Color(0xFFFFF7ED)]),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(children: [
                                Text('定金（线下支付）',
                                    style: TextStyle(
                                        fontSize: 12,
                                        color: const Color(0xFFD97706))),
                                const Spacer(),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: o.isDepositPaid
                                        ? const Color(0xFFD1FAE5)
                                        : const Color(0xFFFEF3C7),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    o.isDepositPaid ? '已确认' : '待支付',
                                    style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                        color: o.isDepositPaid
                                            ? const Color(0xFF059669)
                                            : const Color(0xFFD97706)),
                                  ),
                                ),
                              ]),
                              const SizedBox(height: 4),
                              Text('¥${o.depositAmount!.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFFB45309))),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                // Order number
                const SizedBox(height: 12),
                Row(children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: DT.surface.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: Colors.black.withOpacity(0.05)),
                    ),
                    child: const Text('预约编号',
                        style: TextStyle(fontSize: 11, color: DT.textMuted)),
                  ),
                  const SizedBox(width: 8),
                  Text(o.orderNo,
                      style: TextStyle(fontSize: 12, color: DT.textMuted)),
                ]),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Service Info ──

  Widget _buildServiceInfo(ClientOrder o) {
    final st = o.startTime != null ? DateTime.tryParse(o.startTime!) : null;
    final et = o.endTime != null ? DateTime.tryParse(o.endTime!) : null;

    return _glassCard(
      title: '服务信息',
      subtitle: '查看预约服务类型、时间和备注说明',
      children: [
        _infoRow('服务类型', o.serviceType ?? '美甲服务'),
        if (st != null)
          _infoRow(
              '预约时间',
              '${st.year}-${st.month.toString().padLeft(2, '0')}-${st.day.toString().padLeft(2, '0')} '
                  '${st.hour.toString().padLeft(2, '0')}:${st.minute.toString().padLeft(2, '0')}'),
        if (st != null && et != null)
          _infoRow(
              '时长',
              '${st.hour.toString().padLeft(2, '0')}:${st.minute.toString().padLeft(2, '0')} - '
                  '${et.hour.toString().padLeft(2, '0')}:${et.minute.toString().padLeft(2, '0')}'),
        if (o.customTitle != null && o.customTitle!.isNotEmpty)
          _infoBlock('需求名称', o.customTitle!),
        if (o.customDescription != null && o.customDescription!.isNotEmpty)
          _infoBlock('需求描述', o.customDescription!),
        if (o.customImages != null && o.customImages!.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text('参考图', style: TextStyle(fontSize: 13, color: DT.textMuted)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: o.customImages!
                .map((url) => ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: Image.network(
                        url,
                        width: 80,
                        height: 80,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(14)),
                          child: const Icon(Icons.image_not_supported_outlined,
                              color: Color(0xFFCBD5E1)),
                        ),
                      ),
                    ))
                .toList(),
          ),
        ],
        if (o.remark != null && o.remark!.isNotEmpty)
          _infoBlock('备注', o.remark!),
      ],
    );
  }

  // ── Bottom Bar ──

  Widget _buildBottomBar(ClientOrder o, bool isClientTurn, bool isCancellable,
      bool canMarkDeposit, double bottomPad) {
    return GlassBottomSurface(
      padding: EdgeInsets.fromLTRB(20, 12, 20, bottomPad + 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isClientTurn)
            // 客户待确认：拒绝 / 同意 / 更多(取消、修改) —— 超过 3 个用「更多」收纳
            Row(
              children: [
                Expanded(
                    child: _bottomAction('拒绝报价',
                        onTap: () => _showRejectDialog(),
                        filled: false,
                        isOrange: true)),
                const SizedBox(width: 8),
                Expanded(
                    child: _bottomAction('同意',
                        onTap: () => _showAgreeDialog(),
                        filled: true,
                        loading: _actionLoading)),
                const SizedBox(width: 8),
                Expanded(
                    child: _bottomAction('更多',
                        onTap: () => _showMoreActions([
                              ('修改预约', _showEditDialog, false),
                              ('取消预约', _showCancelDialog, true),
                            ]),
                        filled: false)),
              ],
            )
          else if (canMarkDeposit)
            Row(
              children: [
                Expanded(
                    child: _bottomAction('已付定金',
                        onTap: () => _showDepositDialog(),
                        filled: true,
                        isAmber: true,
                        loading: _actionLoading)),
                if (isCancellable) ...[
                  const SizedBox(width: 12),
                  Expanded(
                      child: _bottomAction('取消预约',
                          onTap: () => _showCancelDialog(),
                          filled: false,
                          isRed: true)),
                ],
              ],
            )
          else
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(_clientWaitingLabel(o.status),
                        style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF94A3B8))),
                  ),
                ),
                if (isCancellable) ...[
                  const SizedBox(width: 12),
                  Expanded(
                      child: _bottomAction('取消预约',
                          onTap: () => _showCancelDialog(),
                          filled: false,
                          isRed: true)),
                ],
              ],
            ),
        ],
      ),
    );
  }

  Widget _bottomAction(String label,
      {required VoidCallback onTap,
      bool filled = false,
      bool isRed = false,
      bool isOrange = false,
      bool isAmber = false,
      bool loading = false}) {
    return SizedBox(
      height: 48,
      child: filled
          ? DecoratedBox(
              decoration: BoxDecoration(
                gradient: isAmber
                    ? const LinearGradient(
                        colors: [Color(0xFFFBBF24), Color(0xFFF97316)])
                    : DT.bookingGradient,
                borderRadius: BorderRadius.circular(999),
                boxShadow: isAmber
                    ? [
                        BoxShadow(
                            color: const Color(0xFFFBBF24).withOpacity(0.3),
                            blurRadius: 12,
                            offset: const Offset(0, 4))
                      ]
                    : DT.shadowPrimary,
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: loading ? null : onTap,
                  borderRadius: BorderRadius.circular(999),
                  child: Center(
                    child: loading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : Text(label,
                            style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Colors.white)),
                  ),
                ),
              ),
            )
          : OutlinedButton(
              onPressed: loading ? null : onTap,
              style: OutlinedButton.styleFrom(
                foregroundColor: isRed
                    ? const Color(0xFFEF4444)
                    : isOrange
                        ? const Color(0xFFF97316)
                        : const Color(0xFF475569),
                side: BorderSide(
                    color: isRed
                        ? const Color(0xFFEF4444).withOpacity(0.3)
                        : isOrange
                            ? const Color(0xFFF97316).withOpacity(0.3)
                            : const Color(0xFFE2E8F0)),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999)),
                backgroundColor: isRed
                    ? const Color(0xFFFEF2F2)
                    : isOrange
                        ? const Color(0xFFFFF7ED)
                        : Colors.white,
              ),
              child: Text(label,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w500)),
            ),
    );
  }

  /// 「更多」操作弹层：收纳超过 3 个的次要操作。
  void _showMoreActions(List<(String, VoidCallback, bool)> actions) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _glassSheet(
        radius: 24,
        padding: EdgeInsets.fromLTRB(
            16, 12, 16, MediaQuery.of(ctx).padding.bottom + 16),
        child: Material(
          type: MaterialType.transparency,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                      color: DT.border,
                      borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 12),
              ...actions.map((a) => ListTile(
                    title: Center(
                      child: Text(a.$1,
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: a.$3 ? DT.error : DT.textPrimary)),
                    ),
                    onTap: () {
                      Navigator.pop(ctx);
                      a.$2();
                    },
                  )),
              const SizedBox(height: 4),
              ListTile(
                title: const Center(
                    child: Text('取消',
                        style: TextStyle(fontSize: 16, color: DT.textMuted))),
                onTap: () => Navigator.pop(ctx),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Glass Sheet Helper ──

  /// 毛玻璃底部弹层外壳：模糊背景 + 半透明白底 + 顶部圆角。
  Widget _glassSheet(
      {required EdgeInsetsGeometry padding,
      double radius = 32,
      required Widget child}) {
    return ClipRRect(
      borderRadius: BorderRadius.vertical(top: Radius.circular(radius)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: DT.surface.withOpacity(0.78),
            borderRadius: BorderRadius.vertical(top: Radius.circular(radius)),
            border: Border(
                top: BorderSide(
                    color: Colors.white.withOpacity(0.6), width: 0.5)),
          ),
          child: child,
        ),
      ),
    );
  }

  // ── Glass Card Helper ──

  Widget _glassCard(
      {required String title,
      required String subtitle,
      required List<Widget> children,
      Widget? trailing}) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: DT.surface.withOpacity(0.62),
        borderRadius: BorderRadius.circular(28),
        boxShadow: DT.shadowMd,
        border: Border.all(color: Colors.black.withOpacity(0.05)),
      ),
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
                    Text(title,
                        style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                            color: DT.textPrimary)),
                    const SizedBox(height: 4),
                    Text(subtitle,
                        style: TextStyle(fontSize: 13, color: DT.textMuted)),
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

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF211C17).withOpacity(0.8),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontSize: 13, color: DT.textMuted)),
            Flexible(
              child: Text(value,
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: DT.textPrimary),
                  textAlign: TextAlign.right),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoBlock(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF211C17).withOpacity(0.8),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontSize: 13, color: DT.textMuted)),
            const SizedBox(height: 4),
            Text(value,
                style: const TextStyle(
                    fontSize: 13, height: 1.5, color: DT.textPrimary)),
          ],
        ),
      ),
    );
  }

  // ── Dialogs ──

  void _showAgreeDialog() {
    final o = _order!;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _glassSheet(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text('确认同意美甲师报价？',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: DT.textPrimary)),
                ),
                GestureDetector(
                  onTap: () => Navigator.pop(ctx),
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9), shape: BoxShape.circle),
                    child: const Icon(Icons.close_rounded,
                        size: 18, color: Color(0xFF64748B)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('同意后将进入到美甲师确认环节。请确保你已知悉报价金额。',
                style: TextStyle(fontSize: 13, color: DT.textMuted)),
            const SizedBox(height: 16),
            // Details
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [Color(0xFF3A2F23), Color(0xFF211C17)]),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                children: [
                  _detailRow('服务', o.serviceType ?? '美甲服务'),
                  if (o.quotePrice != null)
                    _detailRow('报价', '¥${o.quotePrice!.toStringAsFixed(0)}'),
                  if (o.startTime != null)
                    _detailRow('日期', o.startTime!.substring(0, 10)),
                  _detailRow('地址', o.address ?? '—'),
                ],
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _actionLoading
                    ? null
                    : () {
                        Navigator.pop(ctx);
                        _agree();
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: DT.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(999)),
                  elevation: 0,
                ),
                child: _actionLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Text('确认同意',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
              ),
            ),
            SizedBox(height: MediaQuery.of(ctx).padding.bottom + 20),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: DT.textMuted)),
          Text(value,
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: DT.textPrimary)),
        ],
      ),
    );
  }

  void _showRejectDialog() {
    final reasonCtl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: _glassSheet(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
          child: StatefulBuilder(
            builder: (ctx, setSheetState) => Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('拒绝报价',
                              style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                  color: DT.textPrimary)),
                          const SizedBox(height: 4),
                          Text('告诉美甲师你为什么拒绝该报价',
                              style:
                                  TextStyle(fontSize: 13, color: DT.textMuted)),
                        ],
                      ),
                    ),
                    GestureDetector(
                      onTap: () => Navigator.pop(ctx),
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            shape: BoxShape.circle),
                        child: const Icon(Icons.close_rounded,
                            size: 18, color: Color(0xFF64748B)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF211C17).withOpacity(0.8),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: TextField(
                    controller: reasonCtl,
                    maxLines: 4,
                    style: const TextStyle(fontSize: 14, color: DT.textPrimary),
                    decoration: InputDecoration(
                      hintText: '请输入拒绝原因（选填）',
                      hintStyle: TextStyle(color: DT.textMuted),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.all(16),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 48,
                        child: OutlinedButton(
                          onPressed:
                              _actionLoading ? null : () => Navigator.pop(ctx),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF475569),
                            side: const BorderSide(color: Color(0xFFE2E8F0)),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(999)),
                            backgroundColor: const Color(0xFFF1F5F9),
                          ),
                          child: const Text('暂不拒绝',
                              style: TextStyle(fontWeight: FontWeight.w500)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: SizedBox(
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _actionLoading
                              ? null
                              : () {
                                  Navigator.pop(ctx);
                                  _reject(reasonCtl.text);
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFEF4444),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(999)),
                            elevation: 0,
                          ),
                          child: _actionLoading
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.white))
                              : const Text('确认拒绝',
                                  style:
                                      TextStyle(fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: MediaQuery.of(ctx).padding.bottom + 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showCancelDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _glassSheet(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('取消预约',
                          style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: DT.textPrimary)),
                      const SizedBox(height: 4),
                      Text('取消后预约将无法恢复，是否确认取消？',
                          style: TextStyle(fontSize: 13, color: DT.textMuted)),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () => Navigator.pop(ctx),
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9), shape: BoxShape.circle),
                    child: const Icon(Icons.close_rounded,
                        size: 18, color: Color(0xFF64748B)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: OutlinedButton(
                      onPressed:
                          _actionLoading ? null : () => Navigator.pop(ctx),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF475569),
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(999)),
                        backgroundColor: const Color(0xFFF1F5F9),
                      ),
                      child: const Text('暂不取消',
                          style: TextStyle(fontWeight: FontWeight.w500)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _actionLoading
                          ? null
                          : () {
                              Navigator.pop(ctx);
                              _cancel();
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEF4444),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(999)),
                        elevation: 0,
                      ),
                      child: _actionLoading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Text('确认取消',
                              style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: MediaQuery.of(ctx).padding.bottom + 20),
          ],
        ),
      ),
    );
  }

  void _showDepositDialog() {
    final o = _order!;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _glassSheet(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text('确认已支付定金',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: DT.textPrimary)),
                ),
                GestureDetector(
                  onTap: () => Navigator.pop(ctx),
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9), shape: BoxShape.circle),
                    child: const Icon(Icons.close_rounded,
                        size: 18, color: Color(0xFF64748B)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('请确认你已通过线下方式向美甲师支付了定金',
                style: TextStyle(fontSize: 13, color: DT.textMuted)),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [Color(0xFFFFFBEB), Color(0xFFFFF7ED)]),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('定金金额',
                      style: TextStyle(
                          fontSize: 12, color: const Color(0xFFD97706))),
                  const SizedBox(height: 4),
                  Text('¥${o.depositAmount!.toStringAsFixed(0)}',
                      style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFB45309))),
                  const SizedBox(height: 6),
                  Text('确认后将通知美甲师，美甲师确认收到后将接单',
                      style: TextStyle(
                          fontSize: 11,
                          color: const Color(0xFFD97706).withOpacity(0.7))),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF475569),
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(999)),
                      ),
                      child: const Text('取消'),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                            colors: [Color(0xFFFBBF24), Color(0xFFF97316)]),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: _actionLoading
                              ? null
                              : () {
                                  Navigator.pop(ctx);
                                  _markDepositPaid();
                                },
                          borderRadius: BorderRadius.circular(999),
                          child: Center(
                            child: _actionLoading
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2, color: Colors.white))
                                : const Text('确认已付',
                                    style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.white)),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: MediaQuery.of(ctx).padding.bottom + 20),
          ],
        ),
      ),
    );
  }

  void _showEditDialog() {
    String editDate = '';
    String editTime = '';
    int? editAddressId;
    List<ClientAddress> addresses = [];
    bool loadingAddresses = true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          // Load addresses on first build
          if (loadingAddresses) {
            final api = context.read<ApiClient>();
            ClientAddressService(api).list().then((addrs) {
              if (ctx.mounted)
                setSheetState(() {
                  addresses = addrs;
                  loadingAddresses = false;
                });
            }).catchError((_) {
              if (ctx.mounted) setSheetState(() => loadingAddresses = false);
            });
          }

          return ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
              child: Container(
                height: MediaQuery.of(ctx).size.height * 0.75,
                decoration: BoxDecoration(
                  color: DT.surface.withOpacity(0.82),
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(32)),
                  border: Border(
                      top: BorderSide(
                          color: Colors.white.withOpacity(0.6), width: 0.5)),
                ),
                child: Column(
                  children: [
                    // Header
                    Padding(
                      padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('修改预约',
                                    style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w600,
                                        color: DT.textPrimary)),
                                const SizedBox(height: 4),
                                Text('仅支持调整预约时间和服务地址',
                                    style: TextStyle(
                                        fontSize: 13, color: DT.textMuted)),
                              ],
                            ),
                          ),
                          GestureDetector(
                            onTap: () => Navigator.pop(ctx),
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  shape: BoxShape.circle),
                              child: const Icon(Icons.close_rounded,
                                  size: 18, color: Color(0xFF64748B)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Scrollable content
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        children: [
                          // Date picker
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFF211C17).withOpacity(0.8),
                              borderRadius: BorderRadius.circular(24),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('预约日期',
                                    style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                        color: Color(0xFF374151))),
                                const SizedBox(height: 12),
                                GestureDetector(
                                  onTap: () async {
                                    final picked = await showDatePicker(
                                      context: ctx,
                                      initialDate: DateTime.now(),
                                      firstDate: DateTime.now(),
                                      lastDate: DateTime.now()
                                          .add(const Duration(days: 90)),
                                    );
                                    if (picked != null) {
                                      setSheetState(() => editDate =
                                          '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}');
                                    }
                                  },
                                  child: Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 16, vertical: 14),
                                    decoration: BoxDecoration(
                                      color: DT.surface,
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                          color: editDate.isEmpty
                                              ? const Color(0xFFE2E8F0)
                                              : DT.primary.withOpacity(0.3)),
                                    ),
                                    child: Text(
                                        editDate.isEmpty ? '点击选择日期' : editDate,
                                        style: TextStyle(
                                            fontSize: 14,
                                            color: editDate.isEmpty
                                                ? DT.textMuted
                                                : DT.textPrimary)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          // Time slots
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFF211C17).withOpacity(0.8),
                              borderRadius: BorderRadius.circular(24),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('预约时间',
                                    style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                        color: Color(0xFF374151))),
                                const SizedBox(height: 12),
                                SizedBox(
                                  height: 180,
                                  child: GridView.builder(
                                    physics: const BouncingScrollPhysics(),
                                    gridDelegate:
                                        const SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: 4,
                                      mainAxisSpacing: 8,
                                      crossAxisSpacing: 8,
                                      childAspectRatio: 2.2,
                                    ),
                                    itemCount: _timeSlots.length,
                                    itemBuilder: (_, i) {
                                      final t = _timeSlots[i];
                                      final sel = editTime == t;
                                      return GestureDetector(
                                        onTap: () =>
                                            setSheetState(() => editTime = t),
                                        child: AnimatedContainer(
                                          duration:
                                              const Duration(milliseconds: 200),
                                          alignment: Alignment.center,
                                          decoration: BoxDecoration(
                                            gradient:
                                                sel ? DT.bookingGradient : null,
                                            color: sel ? null : Colors.white,
                                            borderRadius:
                                                BorderRadius.circular(16),
                                            boxShadow:
                                                sel ? DT.shadowPrimary : null,
                                          ),
                                          child: Text(t,
                                              style: TextStyle(
                                                fontSize: 13,
                                                fontWeight: sel
                                                    ? FontWeight.w600
                                                    : FontWeight.w500,
                                                color: sel
                                                    ? Colors.white
                                                    : const Color(0xFF64748B),
                                              )),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          // Address selection
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFF211C17).withOpacity(0.8),
                              borderRadius: BorderRadius.circular(24),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('服务地址',
                                    style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                        color: Color(0xFF374151))),
                                const SizedBox(height: 12),
                                if (loadingAddresses)
                                  const Center(
                                      child: Padding(
                                    padding: EdgeInsets.all(20),
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  ))
                                else if (addresses.isEmpty)
                                  Text('暂无地址',
                                      style: TextStyle(
                                          fontSize: 13, color: DT.textMuted))
                                else
                                  ...addresses.map((addr) {
                                    final selected = editAddressId == addr.id;
                                    return GestureDetector(
                                      onTap: () => setSheetState(
                                          () => editAddressId = addr.id),
                                      child: Container(
                                        margin:
                                            const EdgeInsets.only(bottom: 8),
                                        padding: const EdgeInsets.all(14),
                                        decoration: BoxDecoration(
                                          gradient: selected
                                              ? const LinearGradient(
                                                  begin: Alignment.topLeft,
                                                  end: Alignment.bottomRight,
                                                  colors: [
                                                      Color(0xFF3A2F23),
                                                      Color(0xFF211C17)
                                                    ])
                                              : null,
                                          color: selected ? null : Colors.white,
                                          borderRadius:
                                              BorderRadius.circular(18),
                                          border: Border.all(
                                              color: selected
                                                  ? DT.primary.withOpacity(0.25)
                                                  : Colors.black
                                                      .withOpacity(0.05)),
                                        ),
                                        child: Row(
                                          children: [
                                            Container(
                                              width: 20,
                                              height: 20,
                                              decoration: BoxDecoration(
                                                shape: BoxShape.circle,
                                                border: Border.all(
                                                    color: selected
                                                        ? DT.primary
                                                        : const Color(
                                                            0xFFCBD5E1),
                                                    width: 2),
                                                color: selected
                                                    ? DT.primary
                                                    : Colors.transparent,
                                              ),
                                              child: selected
                                                  ? const Icon(
                                                      Icons.check_rounded,
                                                      size: 12,
                                                      color: Colors.white)
                                                  : null,
                                            ),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  Row(children: [
                                                    Text(
                                                        addr.contactName ??
                                                            '未命名',
                                                        style: const TextStyle(
                                                            fontSize: 14,
                                                            fontWeight:
                                                                FontWeight.w500,
                                                            color: DT
                                                                .textPrimary)),
                                                    if (addr.contactPhone !=
                                                        null) ...[
                                                      const SizedBox(width: 8),
                                                      Text(addr.contactPhone!,
                                                          style: TextStyle(
                                                              fontSize: 13,
                                                              color: DT
                                                                  .textMuted)),
                                                    ],
                                                  ]),
                                                  const SizedBox(height: 4),
                                                  Text(addr.fullAddress,
                                                      style: TextStyle(
                                                          fontSize: 13,
                                                          color:
                                                              DT.textSecondary,
                                                          height: 1.4)),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  }),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Save button
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                          24, 12, 24, MediaQuery.of(ctx).padding.bottom + 20),
                      child: SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _actionLoading
                              ? null
                              : () {
                                  if (editDate.isEmpty ||
                                      editTime.isEmpty ||
                                      editAddressId == null) {
                                    NbToast.show(ctx, '请先选择预约时间和服务地址');
                                    return;
                                  }
                                  Navigator.pop(ctx);
                                  // TODO: call update API
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: DT.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(999)),
                            elevation: 0,
                          ),
                          child: _actionLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.white))
                              : const Text('保存修改',
                                  style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // ── Skeleton & Error ──

  Widget _buildSkeleton(double topPad) {
    return ListView(
      padding: EdgeInsets.fromLTRB(20, topPad + 8, 20, 24),
      children: [
        Row(children: [
          Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                  color: const Color(0xFFE8E8E8), shape: BoxShape.circle)),
          const SizedBox(width: 14),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
                width: 80,
                height: 10,
                decoration: BoxDecoration(
                    color: const Color(0xFFE8E8E8),
                    borderRadius: BorderRadius.circular(4))),
            const SizedBox(height: 6),
            Container(
                width: 60,
                height: 20,
                decoration: BoxDecoration(
                    color: const Color(0xFFE8E8E8),
                    borderRadius: BorderRadius.circular(4))),
          ]),
        ]),
        const SizedBox(height: 20),
        Container(
            height: 180,
            decoration: BoxDecoration(
                color: const Color(0xFFE8E8E8),
                borderRadius: BorderRadius.circular(32))),
        const SizedBox(height: 16),
        Container(
            height: 140,
            decoration: BoxDecoration(
                color: const Color(0xFFE8E8E8),
                borderRadius: BorderRadius.circular(28))),
        const SizedBox(height: 16),
        Container(
            height: 80,
            decoration: BoxDecoration(
                color: const Color(0xFFE8E8E8),
                borderRadius: BorderRadius.circular(28))),
        const SizedBox(height: 16),
        Container(
            height: 100,
            decoration: BoxDecoration(
                color: const Color(0xFFE8E8E8),
                borderRadius: BorderRadius.circular(28))),
      ],
    );
  }

  Widget _buildError(double topPad) {
    return ListView(
      padding: EdgeInsets.fromLTRB(20, topPad + 8, 20, 24),
      children: [
        Row(children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: DT.surface.withOpacity(0.8),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withOpacity(0.08),
                      blurRadius: 24,
                      offset: const Offset(0, 10))
                ],
              ),
              child: const Icon(Icons.arrow_back_ios_new_rounded,
                  size: 18, color: Color(0xFF64748B)),
            ),
          ),
        ]),
        const SizedBox(height: 80),
        Center(
          child: Column(children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                  color: Color(0xFFF1F5F9), shape: BoxShape.circle),
              child: const Icon(Icons.error_outline_rounded,
                  size: 32, color: Color(0xFFCBD5E1)),
            ),
            const SizedBox(height: 16),
            const Text('预约不存在',
                style: TextStyle(fontSize: 16, color: DT.textMuted)),
            const SizedBox(height: 16),
            GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                decoration: BoxDecoration(
                    color: DT.primary,
                    borderRadius: BorderRadius.circular(999)),
                child: const Text('返回列表',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.white)),
              ),
            ),
          ]),
        ),
      ],
    );
  }
}
