import 'dart:ui' show FontFeature;

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import '../../../core/widgets/glass_container.dart';
import '../../../core/widgets/nb_shared_components.dart';
import 'technician_order_service.dart';
import '../../../core/widgets/nb_toast.dart';
import '../../shared/chat/chat_screen.dart';
import '../../shared/chat/chat_service.dart';

class TechnicianOrderDetailScreen extends StatefulWidget {
  final int orderId;
  const TechnicianOrderDetailScreen({super.key, required this.orderId});

  @override
  State<TechnicianOrderDetailScreen> createState() =>
      _TechnicianOrderDetailScreenState();
}

class _TechnicianOrderDetailScreenState
    extends State<TechnicianOrderDetailScreen> {
  Map<String, dynamic>? _order;
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
      api.setRole('technician');
      final order = await TechnicianOrderService(api).detail(widget.orderId);
      if (mounted) {
        setState(() {
          _order = order;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Service type helpers ──

  String _serviceTypeLabel(String? st) {
    if (st == 'home') return '上门美甲';
    if (st == 'shop') return '到店美甲';
    return st ?? '—';
  }

  String _formatClock(String? iso) {
    if (iso == null) return '--:--';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '--:--';
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  String _formatDateLabel(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '';
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final date = DateTime(dt.year, dt.month, dt.day);
    if (date == today) return '今天';
    if (date == today.add(const Duration(days: 1))) return '明天';
    if (date == today.subtract(const Duration(days: 1))) return '昨天';
    return '${dt.month}/${dt.day}';
  }

  String _formatTimeRange(String? start, String? end) {
    return '${_formatClock(start)} - ${_formatClock(end)}';
  }

  int _getDuration(String? start, String? end) {
    final s = DateTime.tryParse(start ?? '');
    final e = DateTime.tryParse(end ?? '');
    if (s == null || e == null) return 0;
    return e.difference(s).inMinutes;
  }

  String _formatMoney(num? amount) {
    if (amount == null || amount == 0) return '¥0';
    return '¥${amount.toInt()}';
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: DT.bgWarm,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : _order == null
              ? _buildError()
              : Stack(
                  children: [
                    // Scrollable content (extends behind header for glass blur)
                    Column(
                      children: [
                        Expanded(child: _buildContent(topPad)),
                        _buildBottomBar(bottomPad),
                      ],
                    ),
                    // Floating header with liquid glass
                    Positioned(
                      left: 0,
                      right: 0,
                      top: 0,
                      child: _buildHeader(topPad),
                    ),
                  ],
                ),
    );
  }

  // ── Header ──

  Widget _buildHeader(double topPad) {
    final o = _order!;
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 32, sigmaY: 32),
        child: Container(
          decoration: BoxDecoration(
            color: DT.surface.withValues(alpha: 0.72),
            border: Border(
              bottom: BorderSide(
                  color: Colors.black.withValues(alpha: 0.06), width: 0.5),
            ),
          ),
          padding: EdgeInsets.fromLTRB(DT.xl, topPad + DT.sm, DT.xl, DT.md),
          child: Row(
            children: [
              GestureDetector(
                onTap: () {
                  HapticFeedback.lightImpact();
                  context.pop();
                },
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: DT.surface.withValues(alpha: 0.45),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(CupertinoIcons.back,
                      size: 18, color: DT.textPrimary),
                ),
              ),
              const SizedBox(width: DT.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('预约详情', style: DT.titleMedium),
                    if (o['orderNo'] != null)
                      Text(o['orderNo'].toString(), style: DT.captionLarge),
                  ],
                ),
              ),
              GestureDetector(
                onTap: _showEditSheet,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: DT.lg, vertical: DT.sm),
                  decoration: BoxDecoration(
                    color: DT.primary,
                    borderRadius: BorderRadius.circular(DT.rLg),
                    boxShadow: DT.shadowPrimary,
                  ),
                  child: Text('编辑',
                      style: DT.bodySmall.copyWith(
                          color: Colors.white, fontWeight: FontWeight.w500)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Content ──

  Widget _buildContent(double topPad) {
    final o = _order!;
    final status = o['status']?.toString() ?? '';
    final serviceType = o['serviceType']?.toString() ?? '';
    final customerName = _customerName(o);
    final customerPhone = _customerPhone(o);
    final customerAvatar = _customerAvatarUrl(o);
    final serviceTitle = _serviceTitle(o);
    final serviceImages = _serviceImages(o);
    final address = o['address']?.toString() ?? '';
    final note = o['note']?.toString() ?? '';
    final customDescription = o['customDescription']?.toString() ?? '';
    final price = o['price'] as num?;
    final depositAmount = o['depositAmount'] as num?;
    final depositPaid = o['depositPaid'] as bool? ?? false;

    // Measure header height for top padding
    final headerH =
        topPad + DT.sm + 44 + DT.md; // topPad + spacing + button + bottom

    return RefreshIndicator(
      color: DT.primary,
      onRefresh: _load,
      child: ListView(
        padding: EdgeInsets.fromLTRB(DT.xl, headerH + DT.md, DT.xl, DT.xxl),
        children: [
          // Customer info
          _glassCard(
            title: '客户信息',
            child: Row(
              children: [
                if (customerAvatar != null && customerAvatar.isNotEmpty)
                  ClipOval(
                    child: CachedNetworkImage(
                      imageUrl: customerAvatar,
                      width: 48,
                      height: 48,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(
                          width: 48, height: 48, color: DT.primarySoft),
                      errorWidget: (_, __, ___) =>
                          _avatarFallback(customerName),
                    ),
                  )
                else
                  _avatarFallback(customerName),
                const SizedBox(width: DT.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(customerName, style: DT.titleSmall),
                      if (customerPhone.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(customerPhone,
                            style:
                                DT.bodySmall.copyWith(color: DT.textSecondary)),
                      ],
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () => _openChat(o, customerName),
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: DT.primarySoft,
                      shape: BoxShape.circle,
                      border: Border.all(color: DT.avatarBorder),
                    ),
                    child: const Icon(CupertinoIcons.chat_bubble,
                        size: 18, color: DT.primary),
                  ),
                ),
                const SizedBox(width: DT.sm),
                GestureDetector(
                  onTap: () => _callCustomer(customerPhone),
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: DT.primarySoft,
                      shape: BoxShape.circle,
                      border: Border.all(color: DT.avatarBorder),
                    ),
                    child: const Icon(CupertinoIcons.phone,
                        size: 18, color: DT.primary),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: DT.md),

          // Service info (with status + service type integrated)
          _glassCard(
            title: '服务信息',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _statusDetailRow('预约状态', status),
                _detailRow('服务类型', _serviceTypeLabel(serviceType)),
                _detailRow('预约时间',
                    '${_formatDateLabel(o['startTime'])} ${_formatTimeRange(o['startTime'], o['endTime'])}'),
                _detailRow(
                    '服务时长', '${_getDuration(o['startTime'], o['endTime'])} 分钟'),
                _detailRow(
                    serviceType == 'shop' ? '服务店铺' : '服务地址',
                    serviceType == 'shop'
                        ? (o['shopName']?.toString() ?? '到店服务')
                        : address),
                if (note.isNotEmpty) ...[
                  const SizedBox(height: DT.sm),
                  Container(
                    padding: const EdgeInsets.all(DT.md),
                    decoration: BoxDecoration(
                      color: DT.fillGrey,
                      borderRadius: BorderRadius.circular(DT.rMd),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(CupertinoIcons.pencil,
                            size: 14, color: DT.textMuted),
                        const SizedBox(width: DT.xs),
                        Expanded(
                          child: Text(note,
                              style: DT.bodySmall
                                  .copyWith(color: DT.textSecondary)),
                        ),
                      ],
                    ),
                  ),
                ],
                _serviceContentRow(
                  title: serviceTitle,
                  images: serviceImages,
                  description: customDescription,
                ),
              ],
            ),
          ),
          const SizedBox(height: DT.md),

          // Price detail
          _glassCard(
            title: '价格明细',
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('预约金额',
                        style: DT.bodySmall.copyWith(color: DT.textSecondary)),
                    Text(_formatMoney(price),
                        style: DT.titleMedium.copyWith(
                            color: DT.primary,
                            fontFeatures: const [
                              FontFeature.tabularFigures()
                            ])),
                  ],
                ),
                if (depositAmount != null && depositAmount > 0) ...[
                  const SizedBox(height: DT.sm),
                  Container(height: 0.5, color: DT.divider),
                  const SizedBox(height: DT.sm),
                  Row(
                    children: [
                      Icon(
                          depositPaid
                              ? CupertinoIcons.check_mark_circled_solid
                              : CupertinoIcons.clock,
                          size: 14,
                          color: depositPaid ? DT.successText : DT.warningText),
                      const SizedBox(width: DT.xs),
                      Text(depositPaid ? '定金已确认' : '待确认定金',
                          style: DT.captionLarge.copyWith(
                              color: depositPaid
                                  ? DT.successText
                                  : DT.warningText)),
                      const Spacer(),
                      Text(_formatMoney(depositAmount),
                          style: DT.bodySmall.copyWith(
                              color:
                                  depositPaid ? DT.successText : DT.warningText,
                              fontFeatures: const [
                                FontFeature.tabularFigures()
                              ])),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _avatarFallback(String name) {
    return Container(
      width: 48,
      height: 48,
      decoration: const BoxDecoration(
        color: DT.primarySoft,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(name.characters.first.toUpperCase(),
          style: DT.titleSmall.copyWith(fontSize: 18, color: DT.primary)),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 72,
            child: Text(label,
                style: DT.captionLarge.copyWith(color: DT.textMuted)),
          ),
          Expanded(
            child: Text(value.isEmpty ? '—' : value,
                style: DT.bodySmall.copyWith(
                    color: DT.textPrimary, fontWeight: FontWeight.w500),
                textAlign: TextAlign.right),
          ),
        ],
      ),
    );
  }

  Widget _statusDetailRow(String label, String status) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 72,
            child: Text(label,
                style: DT.captionLarge.copyWith(color: DT.textMuted)),
          ),
          Expanded(
            child: Align(
              alignment: Alignment.centerRight,
              child: OrderStatusBadge(status: status, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _serviceContentRow({
    required String title,
    required List<String> images,
    required String description,
  }) {
    return Padding(
      padding: const EdgeInsets.only(top: DT.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 72,
            child: Text('服务内容',
                style: DT.captionLarge.copyWith(color: DT.textMuted)),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  title.isEmpty ? '-' : title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.right,
                  style: DT.bodySmall.copyWith(
                    color: DT.textPrimary,
                    fontWeight: FontWeight.w600,
                    height: 1.35,
                  ),
                ),
                if (description.isNotEmpty) ...[
                  const SizedBox(height: DT.xs),
                  Text(
                    description,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.right,
                    style: DT.captionLarge.copyWith(
                      color: DT.textSecondary,
                      height: 1.45,
                    ),
                  ),
                ],
                if (images.isNotEmpty) ...[
                  const SizedBox(height: DT.sm),
                  Wrap(
                    alignment: WrapAlignment.end,
                    spacing: DT.sm,
                    runSpacing: DT.sm,
                    children: images.asMap().entries.map((entry) {
                      return GestureDetector(
                        onTap: () => _openImageViewer(images, entry.key),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(DT.rMd),
                          child: CachedNetworkImage(
                            imageUrl: entry.value,
                            width: 76,
                            height: 76,
                            fit: BoxFit.cover,
                            placeholder: (_, __) => Container(
                              width: 76,
                              height: 76,
                              color: DT.fillGreyLight,
                            ),
                            errorWidget: (_, __, ___) => Container(
                              width: 76,
                              height: 76,
                              color: DT.fillGreyLight,
                              child: const Icon(CupertinoIcons.photo,
                                  size: 18, color: DT.iconGrey),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Glass Card ──

  Widget _glassCard({String? title, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(DT.lg),
      decoration: BoxDecoration(
        color: DT.surface.withValues(alpha: 0.88),
        borderRadius: BorderRadius.circular(DT.radius16),
        boxShadow: DT.shadowSm,
        border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null) ...[
            Text(title, style: DT.titleSmall),
            const SizedBox(height: DT.sm),
          ],
          child,
        ],
      ),
    );
  }

  // ── Bottom Bar ──

  Widget _buildBottomBar(double bottomPad) {
    final o = _order!;
    final status = o['status']?.toString() ?? '';
    final depositAmount = o['depositAmount'] as num?;
    final depositPaid = o['depositPaid'] as bool? ?? false;
    final customerName = o['customerName']?.toString() ?? '客户';

    final buttons = <_ActionButton>[];

    if (status == 'pending_quote') {
      buttons.add(_ActionButton('提交报价', DT.cream, true, () => _showQuoteSheet(),
          textColor: DT.onCream));
    }
    if (status == 'pending_confirm') {
      buttons.add(_ActionButton(
          '确认预约', DT.cream, true, () => _changeStatus('pending_confirm'),
          textColor: DT.onCream));
    }
    if (status == 'pending_home' || status == 'pending_shop') {
      final label = status == 'pending_home' ? '待上门' : '待到店';
      final needsDeposit =
          depositAmount != null && depositAmount > 0 && !depositPaid;
      buttons.add(_ActionButton(
          needsDeposit ? '等待定金' : label, DT.surface, false, null,
          textColor: DT.textMuted));
    }
    if (status == 'in_progress') {
      buttons.add(_ActionButton(
          '确认完成', DT.cream, true, () => _changeStatus('completed'),
          textColor: DT.onCream));
    }

    buttons.add(_ActionButton('发给客户', DT.primarySoft, false, () {
      HapticFeedback.lightImpact();
      NbToast.show(context, '已发送给 $customerName');
    }, textColor: DT.primary));

    if (status != 'completed' && status != 'cancelled') {
      buttons.add(_ActionButton(
          '取消预约', DT.surface, false, () => _changeStatus('cancelled'),
          textColor: DT.error, border: Border.all(color: DT.errorBorder)));
    }

    if (buttons.isEmpty) return const SizedBox.shrink();

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 28, sigmaY: 28),
        child: Container(
          decoration: BoxDecoration(color: DT.surface.withValues(alpha: 0.78)),
          padding: EdgeInsets.fromLTRB(DT.xl, DT.sm, DT.xl, bottomPad + DT.sm),
          child: Row(
            children: buttons
                .map((b) => Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: _buildActionButton(b),
                      ),
                    ))
                .toList(),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton(_ActionButton btn) {
    return GestureDetector(
      onTap: _actionLoading || btn.onTap == null
          ? null
          : () {
              HapticFeedback.mediumImpact();
              btn.onTap?.call();
            },
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: btn.bgColor,
          borderRadius: BorderRadius.circular(DT.rFull),
          border: btn.border,
        ),
        alignment: Alignment.center,
        child: _actionLoading && btn.onTap != null
            ? SizedBox(
                width: DT.xl,
                height: DT.xl,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: btn.textColor ?? Colors.white))
            : Text(btn.label,
                style: DT.bodySmall.copyWith(
                    color: btn.textColor ??
                        (btn.primary ? DT.onCream : DT.textPrimary),
                    fontWeight: FontWeight.w600)),
      ),
    );
  }

  // ── Error ──

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('加载失败', style: DT.bodySmall),
          const SizedBox(height: DT.lg),
          GestureDetector(
            onTap: () {
              setState(() => _loading = true);
              _load();
            },
            child: Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: DT.xxl, vertical: DT.sm),
              decoration: BoxDecoration(
                  color: DT.primary,
                  borderRadius: BorderRadius.circular(DT.rFull)),
              child: Text('重试',
                  style: DT.bodyMedium.copyWith(
                      fontWeight: FontWeight.w600, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  // ── Customer / Service helpers ──

  String _customerName(Map<String, dynamic> order) {
    final client = order['client'] as Map<String, dynamic>?;
    final customer = order['customer'] as Map<String, dynamic>?;
    final clientUser = order['clientUser'] as Map<String, dynamic>?;
    final customerClient = customer?['client'] as Map<String, dynamic>?;
    final customerClientUser = customer?['clientUser'] as Map<String, dynamic>?;
    return _nameStr(order['customerName']) ??
        _nameStr(order['clientName']) ??
        _nameStr(clientUser?['nickname']) ??
        _nameStr(clientUser?['name']) ??
        _nameStr(client?['nickname']) ??
        _nameStr(client?['name']) ??
        _nameStr(customer?['name']) ??
        _nameStr(customer?['nickname']) ??
        _nameStr(customerClient?['nickname']) ??
        _nameStr(customerClient?['name']) ??
        _nameStr(customerClientUser?['nickname']) ??
        _nameStr(customerClientUser?['name']) ??
        '客户';
  }

  String _customerPhone(Map<String, dynamic> order) {
    final client = order['client'] as Map<String, dynamic>?;
    final customer = order['customer'] as Map<String, dynamic>?;
    final clientUser = order['clientUser'] as Map<String, dynamic>?;
    final customerClientUser = customer?['clientUser'] as Map<String, dynamic>?;
    return _str(order['customerPhone']) ??
        _str(order['clientPhone']) ??
        _str(clientUser?['phone']) ??
        _str(client?['phone']) ??
        _str(customer?['phone']) ??
        _str(customerClientUser?['phone']) ??
        '';
  }

  String? _customerAvatarUrl(Map<String, dynamic> order) {
    final client = order['client'] as Map<String, dynamic>?;
    final customer = order['customer'] as Map<String, dynamic>?;
    final clientUser = order['clientUser'] as Map<String, dynamic>?;
    final customerClient = customer?['client'] as Map<String, dynamic>?;
    final customerClientUser = customer?['clientUser'] as Map<String, dynamic>?;
    return _str(order['avatarUrl']) ??
        _str(order['customerAvatar']) ??
        _str(order['clientAvatar']) ??
        _str(clientUser?['avatarUrl']) ??
        _str(client?['avatarUrl']) ??
        _str(client?['avatar']) ??
        _str(customer?['avatarUrl']) ??
        _str(customer?['customerAvatar']) ??
        _str(customerClient?['avatarUrl']) ??
        _str(customerClientUser?['avatarUrl']);
  }

  int? _clientUserId(Map<String, dynamic> order) {
    final client = order['client'] as Map<String, dynamic>?;
    final customer = order['customer'] as Map<String, dynamic>?;
    final clientUser = order['clientUser'] as Map<String, dynamic>?;
    final customerClientUser = customer?['clientUser'] as Map<String, dynamic>?;
    return _int(order['clientUserId']) ??
        _int(clientUser?['id']) ??
        _int(client?['id']) ??
        _int(customer?['clientUserId']) ??
        _int(customerClientUser?['id']);
  }

  String _serviceTitle(Map<String, dynamic> order) {
    final work = order['work'] as Map<String, dynamic>?;
    final design = order['design'] as Map<String, dynamic>?;
    return _str(order['customTitle']) ??
        _str(work?['title']) ??
        _str(order['workTitle']) ??
        _str(design?['title']) ??
        _str(order['designTitle']) ??
        _str(order['serviceName']) ??
        '-';
  }

  List<String> _serviceImages(Map<String, dynamic> order) {
    final work = order['work'] as Map<String, dynamic>?;
    final design = order['design'] as Map<String, dynamic>?;
    return [
      ..._stringList(order['customImages']),
      ..._stringList(order['imageUrls']),
      ..._stringList(work?['imageUrls']),
      ..._stringList(design?['imageUrls']),
      if (_str(order['coverUrl']) != null) _str(order['coverUrl'])!,
      if (_str(order['workCoverUrl']) != null) _str(order['workCoverUrl'])!,
      if (_str(work?['coverUrl']) != null) _str(work?['coverUrl'])!,
    ];
  }

  List<String> _stringList(dynamic value) {
    if (value is List) {
      return value.map((e) => _str(e)).whereType<String>().toList();
    }
    final single = _str(value);
    return single == null ? const [] : [single];
  }

  int? _int(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }

  String? _str(dynamic value) {
    final s = value?.toString().trim();
    if (s == null || s.isEmpty || s == 'null') return null;
    return s;
  }

  String? _nameStr(dynamic value) {
    final s = _str(value);
    if (s == null || s == '客户') return null;
    return s;
  }

  Future<void> _openChat(Map<String, dynamic> order, String name) async {
    final clientUserId = _clientUserId(order);
    if (clientUserId == null) {
      NbToast.error(context, '该客户尚未注册客户端，暂不支持在线消息');
      return;
    }
    HapticFeedback.lightImpact();
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
          title: name,
          otherPartyId: clientUserId,
          clientId: clientUserId,
        ),
      ),
    );
  }

  void _callCustomer(String phone) {
    HapticFeedback.lightImpact();
    if (phone.trim().isEmpty) {
      NbToast.error(context, '当前客户暂无联系电话');
      return;
    }
    NbToast.show(context, '联系客户: $phone');
  }

  void _openImageViewer(List<String> images, int index) {
    Navigator.push(
      context,
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.black,
        pageBuilder: (_, __, ___) =>
            _FullscreenImages(images: images, initialIndex: index),
      ),
    );
  }

  // ── Actions ──

  Future<void> _changeStatus(String nextStatus) async {
    setState(() => _actionLoading = true);
    try {
      final api = context.read<ApiClient>();
      api.setRole('technician');
      final service = TechnicianOrderService(api);
      final id = _order!['id'] as int;

      switch (nextStatus) {
        case 'cancelled':
          await service.cancel(id);
          break;
        case 'pending_confirm':
          await service.confirm(id);
          break;
        case 'pending_home':
        case 'pending_shop':
          await service.confirm(id,
              depositConfirmed: _order!['depositPaid'] == true);
          break;
        case 'completed':
          await service.complete(id);
          break;
      }

      await _load();
      if (mounted) {
        NbToast.show(context, nextStatus == 'cancelled' ? '预约已取消' : '状态已更新');
      }
    } catch (_) {
      if (mounted) {
        NbToast.show(context, '操作失败，请重试');
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  void _showQuoteSheet() {
    final priceCtl = TextEditingController(
        text: (_order!['price'] as num?)?.toInt().toString() ?? '');
    final dateCtl = TextEditingController(
        text: DateTime.tryParse(_order!['startTime']?.toString() ?? '')
                ?.toString()
                .substring(0, 10) ??
            '');
    final timeCtl = TextEditingController(
        text: DateTime.tryParse(_order!['startTime']?.toString() ?? '') != null
            ? '${DateTime.parse(_order!['startTime']).hour.toString().padLeft(2, '0')}:${DateTime.parse(_order!['startTime']).minute.toString().padLeft(2, '0')}'
            : '14:00');
    final durationCtl = TextEditingController(
        text: _getDuration(_order!['startTime']?.toString(),
                _order!['endTime']?.toString())
            .toString());
    final depositCtl = TextEditingController(
        text: (_order!['depositAmount'] as num?)?.toInt().toString() ?? '0');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          decoration: BoxDecoration(
            color: DT.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(DT.rCard)),
          ),
          padding: const EdgeInsets.all(DT.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('提交报价', style: DT.titleMedium),
              const SizedBox(height: DT.lg),
              _quoteInput('预约日期', dateCtl, TextInputType.datetime),
              const SizedBox(height: DT.md),
              _quoteInput('开始时间', timeCtl, TextInputType.datetime),
              const SizedBox(height: DT.md),
              _quoteInput('预估时长（分钟）', durationCtl, TextInputType.number),
              const SizedBox(height: DT.md),
              _quoteInput('费用（元）', priceCtl, TextInputType.number),
              const SizedBox(height: DT.md),
              _quoteInput('定金（元，可选）', depositCtl, TextInputType.number),
              const SizedBox(height: DT.xl),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    setState(() => _actionLoading = true);
                    try {
                      final api = context.read<ApiClient>();
                      api.setRole('technician');
                      await TechnicianOrderService(api)
                          .review(_order!['id'] as int, {
                        'serviceDate': dateCtl.text,
                        'startTime': timeCtl.text,
                        'durationMinutes': int.tryParse(durationCtl.text) ?? 90,
                        'price': double.tryParse(priceCtl.text) ?? 0,
                        'depositAmount': double.tryParse(depositCtl.text) ?? 0,
                      });
                      await _load();
                      if (mounted) {
                        NbToast.show(context, '报价已发送，等待客户确认');
                      }
                    } catch (_) {
                      if (mounted) {
                        NbToast.show(context, '报价失败，请重试');
                      }
                    } finally {
                      if (mounted) setState(() => _actionLoading = false);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: DT.cream,
                    foregroundColor: DT.onCream,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(DT.rMd)),
                    elevation: 0,
                  ),
                  child: Text('发送报价',
                      style: DT.titleMedium.copyWith(color: DT.onCream)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _quoteInput(
      String label, TextEditingController ctl, TextInputType type) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: DT.textSecondary)),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            // 比 sheet 背景(DT.surface)更深，并加描边，确保深色下输入框可见
            color: DT.bg,
            borderRadius: BorderRadius.circular(DT.rMd),
            border: Border.all(color: DT.border),
          ),
          child: TextField(
            controller: ctl,
            keyboardType: type,
            style: DT.titleSmall.copyWith(color: DT.textPrimary),
            cursorColor: DT.primary,
            decoration: const InputDecoration(
              border: InputBorder.none,
              contentPadding:
                  EdgeInsets.symmetric(horizontal: DT.lg, vertical: DT.md),
            ),
          ),
        ),
      ],
    );
  }

  void _showEditSheet() {
    final o = _order!;
    final serviceNameCtl =
        TextEditingController(text: o['serviceName']?.toString() ?? '');
    final addressCtl =
        TextEditingController(text: o['address']?.toString() ?? '');
    final noteCtl = TextEditingController(text: o['note']?.toString() ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          decoration: BoxDecoration(
            color: DT.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(DT.rCard)),
          ),
          padding: const EdgeInsets.all(DT.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('编辑预约', style: DT.titleMedium),
              const SizedBox(height: DT.lg),
              _quoteInput('服务内容', serviceNameCtl, TextInputType.text),
              const SizedBox(height: DT.md),
              _quoteInput('服务地址', addressCtl, TextInputType.text),
              const SizedBox(height: DT.md),
              _quoteInput('备注', noteCtl, TextInputType.multiline),
              const SizedBox(height: DT.xl),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: DT.cream,
                    foregroundColor: DT.onCream,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(DT.rMd)),
                    elevation: 0,
                  ),
                  child: Text('保存',
                      style: DT.titleMedium.copyWith(color: DT.onCream)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionButton {
  final String label;
  final Color bgColor;
  final bool primary;
  final VoidCallback? onTap;
  final Color? textColor;
  final BoxBorder? border;
  _ActionButton(this.label, this.bgColor, this.primary, this.onTap,
      {this.textColor, this.border});
}

class _FullscreenImages extends StatefulWidget {
  final List<String> images;
  final int initialIndex;

  const _FullscreenImages({required this.images, required this.initialIndex});

  @override
  State<_FullscreenImages> createState() => _FullscreenImagesState();
}

class _FullscreenImagesState extends State<_FullscreenImages> {
  late final PageController _controller =
      PageController(initialPage: widget.initialIndex);
  late int _index = widget.initialIndex;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          PageView.builder(
            controller: _controller,
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
                    errorWidget: (_, __, ___) => const Icon(
                      CupertinoIcons.photo,
                      color: Colors.white24,
                      size: 48,
                    ),
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: DT.lg,
            top: topPad + DT.sm,
            child: GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  shape: BoxShape.circle,
                ),
                child: const Icon(CupertinoIcons.xmark,
                    color: Colors.white, size: 20),
              ),
            ),
          ),
          if (widget.images.length > 1)
            Positioned(
              left: 0,
              right: 0,
              bottom: bottomPad + DT.xl,
              child: Center(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(DT.rFull),
                  ),
                  child: Text(
                    '${_index + 1} / ${widget.images.length}',
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
