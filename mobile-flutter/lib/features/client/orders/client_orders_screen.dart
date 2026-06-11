import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/api/api_client.dart';
import 'client_order_models.dart';
import 'client_order_service.dart';
import 'client_create_order_screen.dart';
import 'client_order_detail_screen.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';
import '../../../core/widgets/client_glass_header.dart';

class ClientOrdersScreen extends StatefulWidget {
  const ClientOrdersScreen({super.key});

  @override
  State<ClientOrdersScreen> createState() => _ClientOrdersScreenState();
}

class _ClientOrdersScreenState extends State<ClientOrdersScreen> {
  List<ClientOrder> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    try {
      final apiClient = context.read<ApiClient>();
      final service = ClientOrderService(apiClient);
      final orders = await service.list();
      if (mounted)
        setState(() {
          _orders = orders;
          _loading = false;
        });
    } catch (_) {
      if (mounted)
        setState(() {
          _loading = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final headerH = ClientGlassHeader.estimateHeight(context);
    return Scaffold(
      backgroundColor: ET.bg,
      body: Stack(
        children: [
          Positioned.fill(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: ET.accent))
                : RefreshIndicator(
                    color: ET.accent,
                    backgroundColor: ET.surface,
                    onRefresh: _loadOrders,
                    child: ListView(
                      padding: EdgeInsets.fromLTRB(16, headerH + 8, 16, 100),
                      children: [
                        if (_orders.isEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 60),
                            child: Center(
                                child: Text('暂无预约',
                                    style: TextStyle(
                                        fontSize: 14, color: ET.inkMuted))),
                          )
                        else
                          ..._orders.expand((o) =>
                              [_orderCard(o), const SizedBox(height: 10)]),
                      ],
                    ),
                  ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: ClientGlassHeader(
              title: '预约',
              actions: [_bookingCapsule()],
            ),
          ),
        ],
      ),
    );
  }

  Widget _bookingCapsule() {
    return GestureDetector(
      onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => const ClientCreateOrderScreen()))
          .then((_) => _loadOrders()),
      child: Container(
        height: 36,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
            color: ET.cream, borderRadius: BorderRadius.circular(999)),
        child: const Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.add_rounded, size: 16, color: ET.onCream),
          SizedBox(width: 2),
          Text('发起预约',
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: ET.onCream)),
        ]),
      ),
    );
  }

  /// 预约卡片（对齐 webapp OrderList.tsx）：服务类型 + 日期块 + 标题 + 美甲师/时间/地址 + 报价/提示。
  Widget _orderCard(ClientOrder order) {
    final colors = _statusColors(order.status);
    final serviceType = _serviceTypeLabel(order.serviceType);
    final title = (order.customTitle?.isNotEmpty == true)
        ? order.customTitle!
        : serviceType;
    final start = DateTime.tryParse(order.startTime ?? '');
    final tech = order.technician;
    final techName = tech?['name']?.toString() ?? '美甲师';
    final techAvatar = tech?['avatarUrl']?.toString();
    return GestureDetector(
      onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => ClientOrderDetailScreen(orderId: order.id)))
          .then((_) => _loadOrders()),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: ET.surface,
            borderRadius: BorderRadius.circular(DT.rCard),
            border: Border.all(color: ET.hairline)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                      color: ET.accentSoft,
                      borderRadius: BorderRadius.circular(999)),
                  child: Text(serviceType,
                      style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: ET.accentOnDark)),
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                      color: colors.$1,
                      borderRadius: BorderRadius.circular(999)),
                  child: Text(order.statusLabel,
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: colors.$2)),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                      color: ET.accentSoft,
                      borderRadius: BorderRadius.circular(16)),
                  child: Center(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Text(start != null ? '${start.month}月' : '--',
                            style: const TextStyle(
                                fontSize: 10,
                                height: 1.1,
                                color: ET.accentOnDark)),
                        Text(start != null ? '${start.day}' : '--',
                            style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w700,
                                height: 1.0,
                                color: ET.accentOnDark)),
                        Text(start != null ? _weekday(start) : '--',
                            style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                height: 1.1,
                                color: ET.accentOnDark)),
                      ]),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w600,
                              color: ET.ink)),
                      const SizedBox(height: 6),
                      _technicianRow(techName, techAvatar),
                      const SizedBox(height: 4),
                      _metaRow(Icons.access_time_rounded,
                          '${_hm(order.startTime)} - ${_hm(order.endTime)}'),
                      const SizedBox(height: 4),
                      _metaRow(
                          Icons.location_on_outlined,
                          (order.address?.isNotEmpty == true)
                              ? order.address!
                              : '地址待确认',
                          maxLines: 1),
                      const SizedBox(height: 10),
                      if (order.quotePrice != null && order.quotePrice! > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                              color: ET.accentSoft,
                              borderRadius: BorderRadius.circular(999)),
                          child: Text(
                              '报价 ¥${order.quotePrice!.toStringAsFixed(0)}',
                              style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: ET.accentOnDark)),
                        )
                      else
                        Text(_hint(order.status),
                            style: const TextStyle(
                                fontSize: 12, color: ET.inkMuted)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _metaRow(IconData icon, String text, {int maxLines = 1}) {
    return Row(children: [
      Icon(icon, size: 14, color: ET.inkMuted),
      const SizedBox(width: 6),
      Expanded(
          child: Text(text,
              maxLines: maxLines,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: ET.inkSecondary))),
    ]);
  }

  Widget _technicianRow(String name, String? avatar) {
    return Row(children: [
      ClipOval(
        child: avatar != null && avatar.isNotEmpty
            ? CachedNetworkImage(
                imageUrl: avatar,
                width: 18,
                height: 18,
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) => _technicianAvatarFallback(name),
              )
            : _technicianAvatarFallback(name),
      ),
      const SizedBox(width: 6),
      Expanded(
        child: Text(
          name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: ET.inkSecondary,
          ),
        ),
      ),
    ]);
  }

  Widget _technicianAvatarFallback(String name) {
    return Container(
      width: 18,
      height: 18,
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        color: ET.accentSoft,
        shape: BoxShape.circle,
      ),
      child: Text(
        name.isNotEmpty ? name.substring(0, 1) : '美',
        style: const TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.w700,
          color: ET.accentOnDark,
        ),
      ),
    );
  }

  String _hm(String? iso) {
    final d = DateTime.tryParse(iso ?? '');
    if (d == null) return '--';
    return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }

  String _weekday(DateTime date) {
    const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return labels[date.weekday - 1];
  }

  String _serviceTypeLabel(String? value) {
    final s = value?.trim() ?? '';
    return s.isEmpty ? '美甲服务' : s;
  }

  String _hint(String status) {
    switch (status) {
      case 'pending_quote':
        return '等待美甲师报价';
      case 'pending_confirm':
        return '等待美甲师确认';
      default:
        return '查看预约详情';
    }
  }

  (Color, Color) _statusColors(String status) {
    switch (status) {
      case 'pending_quote':
        return (DT.statusPendingQuoteBg, DT.statusPendingQuoteText);
      case 'pending_agree':
        return (DT.statusPendingAgreeBg, DT.statusPendingAgreeText);
      case 'pending_confirm':
        return (DT.statusPendingConfirmBg, DT.statusPendingConfirmText);
      case 'pending_home':
      case 'pending_shop':
      case 'in_progress':
        return (DT.statusInProgressBg, DT.statusInProgressText);
      case 'completed':
        return (DT.statusCompletedBg, DT.statusCompletedText);
      case 'cancelled':
        return (DT.statusCancelledBg, DT.statusCancelledText);
      default:
        return (ET.surface, ET.inkSecondary);
    }
  }
}
