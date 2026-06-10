import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import 'client_order_models.dart';
import 'client_order_service.dart';
import 'client_create_order_screen.dart';
import 'client_order_detail_screen.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

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
    return Scaffold(
      backgroundColor: DT.bg,
      appBar: GlassAppBar(title: const Text('我的预约')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : Column(
              children: [
                // 固定在顶部的「发起预约」入口
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: _startBookingCta(),
                ),
                Expanded(
                  child: RefreshIndicator(
                    color: DT.primary,
                    onRefresh: _loadOrders,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                      children: [
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('预约记录', style: DT.titleLarge),
                            SizedBox(height: 2),
                            Text('查看你所有预约的进度',
                                style: TextStyle(
                                    fontSize: 12, color: DT.textMuted)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        if (_orders.isEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 40),
                            child: Center(
                                child: Text('暂无预约',
                                    style: TextStyle(
                                        fontSize: 14, color: DT.textMuted))),
                          )
                        else
                          ..._orders.expand((o) =>
                              [_orderCard(o), const SizedBox(height: 10)]),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _startBookingCta() {
    return GestureDetector(
      onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => const ClientCreateOrderScreen()))
          .then((_) => _loadOrders()),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: DT.primaryGradient,
          borderRadius: BorderRadius.circular(DT.rCard),
          boxShadow: DT.shadowButtonLg,
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.22),
                  borderRadius: BorderRadius.circular(16)),
              child:
                  const Icon(Icons.add_rounded, color: Colors.white, size: 28),
            ),
            const SizedBox(width: 16),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('发起预约',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Colors.white)),
                  SizedBox(height: 4),
                  Text('预约你的下一次美甲 ～',
                      style: TextStyle(fontSize: 13, color: Colors.white70)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded,
                color: Colors.white, size: 22),
          ],
        ),
      ),
    );
  }

  /// 预约卡片（对齐 webapp OrderList.tsx）：预 徽章 + 日期块 + 标题 + 时间/地址 + 报价/提示。
  Widget _orderCard(ClientOrder order) {
    final colors = _statusColors(order.status);
    final title = (order.customTitle?.isNotEmpty == true)
        ? order.customTitle!
        : (order.serviceType?.isNotEmpty == true ? order.serviceType! : '美甲服务');
    final start = DateTime.tryParse(order.startTime ?? '');
    return GestureDetector(
      onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => ClientOrderDetailScreen(orderId: order.id)))
          .then((_) => _loadOrders()),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: DT.surface,
            borderRadius: BorderRadius.circular(DT.rCard),
            border: Border.all(color: DT.border)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.fromLTRB(4, 4, 10, 4),
                  decoration: BoxDecoration(
                      color: DT.primarySoft,
                      borderRadius: BorderRadius.circular(999)),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Container(
                      width: 30,
                      height: 30,
                      alignment: Alignment.center,
                      decoration: const BoxDecoration(
                          color: Colors.white, shape: BoxShape.circle),
                      child: const Text('预',
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: DT.primary)),
                    ),
                    const SizedBox(width: 6),
                    const Text('预约',
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: DT.primary)),
                  ]),
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
                      color: DT.primarySoft,
                      borderRadius: BorderRadius.circular(16)),
                  child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(start != null ? '${start.month}月' : '--',
                            style: const TextStyle(
                                fontSize: 11, color: DT.primary)),
                        Text(start != null ? '${start.day}' : '--',
                            style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w700,
                                height: 1.1,
                                color: DT.primary)),
                      ]),
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
                              color: DT.textPrimary)),
                      const SizedBox(height: 6),
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
                              color: DT.primarySoft,
                              borderRadius: BorderRadius.circular(999)),
                          child: Text(
                              '报价 ¥${order.quotePrice!.toStringAsFixed(0)}',
                              style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: DT.primary)),
                        )
                      else
                        Text(_hint(order.status),
                            style: const TextStyle(
                                fontSize: 12, color: DT.textMuted)),
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
      Icon(icon, size: 14, color: DT.textTertiary),
      const SizedBox(width: 6),
      Expanded(
          child: Text(text,
              maxLines: maxLines,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: DT.textSecondary))),
    ]);
  }

  String _hm(String? iso) {
    final d = DateTime.tryParse(iso ?? '');
    if (d == null) return '--';
    return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
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
        return (DT.surfaceAlt, DT.textSecondary);
    }
  }
}
