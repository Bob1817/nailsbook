import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../customers/technician_customer_service.dart';
import 'technician_create_booking_sheet.dart';
import '../orders/technician_order_service.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

class TechnicianOrdersScreen extends StatefulWidget {
  /// 初始状态过滤（如 'pending_confirm'）。
  final String? initialStatusFilter;

  /// 初始客户过滤，用于从客户详情页查看该客户预约。
  final int? initialCustomerId;
  final String? initialCustomerName;
  final bool initialActiveOnly;

  /// true 时仅展示未付定金的进行中预约（用于「未支付定金」入口）。
  final bool initialUnpaidDepositOnly;
  const TechnicianOrdersScreen({
    super.key,
    this.initialStatusFilter,
    this.initialCustomerId,
    this.initialCustomerName,
    this.initialActiveOnly = false,
    this.initialUnpaidDepositOnly = false,
  });

  @override
  State<TechnicianOrdersScreen> createState() => _TechnicianOrdersScreenState();
}

class _TechnicianOrdersScreenState extends State<TechnicianOrdersScreen> {
  List<Map<String, dynamic>> _orders = [];
  List<Map<String, dynamic>> _customers = [];
  bool _loading = true;
  String? _statusFilter;
  late bool _unpaidDepositOnly = widget.initialUnpaidDepositOnly;

  static const _activeStatuses = {
    'pending_quote',
    'pending_agree',
    'pending_confirm',
    'pending_home',
    'pending_shop',
    'in_progress'
  };

  @override
  void initState() {
    super.initState();
    _statusFilter = widget.initialStatusFilter;
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    try {
      final apiClient = context.read<ApiClient>();
      final service = TechnicianOrderService(apiClient);
      final results = await Future.wait([
        service.list(
            status: _statusFilter, customerId: widget.initialCustomerId),
        TechnicianCustomerService(apiClient).list(),
      ]);
      var orders = (results[0] as List).cast<Map<String, dynamic>>();
      if (_unpaidDepositOnly) {
        orders = orders
            .where((o) =>
                _activeStatuses.contains(o['status']) &&
                !((o['depositPaid'] ?? o['isDepositPaid']) as bool? ?? false))
            .toList();
      }
      if (widget.initialActiveOnly) {
        orders =
            orders.where((o) => _activeStatuses.contains(o['status'])).toList();
      }
      if (mounted) {
        setState(() {
          _orders = orders;
          _customers = (results[1] as List).cast<Map<String, dynamic>>();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DT.bg,
      appBar: GlassAppBar(
        title: Text(_title),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: DT.md),
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _showCreateBookingSheet,
              child: Container(
                constraints: const BoxConstraints(minHeight: 44),
                padding: const EdgeInsets.symmetric(horizontal: DT.md),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: DT.primary,
                  borderRadius: BorderRadius.circular(DT.rFull),
                ),
                child: const Text(
                  '新建预约',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Colors.white),
                ),
              ),
            ),
          ),
        ],
      ),
      body: Column(children: [
        SizedBox(
          height: 50,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding:
                const EdgeInsets.symmetric(horizontal: DT.lg, vertical: DT.sm),
            children: [
              if (_unpaidDepositOnly) _depositChip(),
              _filterChip(null, '全部'),
              _filterChip('pending_quote', '待报价'),
              _filterChip('pending_agree', '待用户确认'),
              _filterChip('pending_confirm', '待我确认'),
              _filterChip('pending_home', '待上门'),
              _filterChip('pending_shop', '待到店'),
              _filterChip('in_progress', '进行中'),
              _filterChip('completed', '已完成'),
              _filterChip('cancelled', '已取消'),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(
                  child: CircularProgressIndicator(color: DT.primary))
              : _orders.isEmpty
                  ? const Center(child: Text('暂无订单', style: DT.bodySmall))
                  : RefreshIndicator(
                      color: DT.primary,
                      onRefresh: _loadOrders,
                      child: ListView.separated(
                        padding:
                            const EdgeInsets.fromLTRB(DT.lg, DT.sm, DT.lg, 100),
                        itemCount: _orders.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: DT.sm),
                        itemBuilder: (context, index) =>
                            _orderCard(_orders[index]),
                      ),
                    ),
        ),
      ]),
    );
  }

  void _showCreateBookingSheet() {
    HapticFeedback.lightImpact();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => TechnicianCreateBookingSheet(
        customers: _customers,
        presetCustomerId: widget.initialCustomerId,
        onCreated: (_) => _loadOrders(),
      ),
    );
  }

  String get _title {
    if (_unpaidDepositOnly) return '未支付定金';
    final name = widget.initialCustomerName;
    if (name != null && name.isNotEmpty) {
      return widget.initialActiveOnly ? '$name 的预约' : '$name 的历史预约';
    }
    return '订单管理';
  }

  Widget _orderCard(Map<String, dynamic> order) {
    final status = order['status'] as String?;
    final price = order['quotePrice'] as num?;
    final serviceType = order['serviceType']?.toString();
    // Short labels for list view (detail view uses longer variants)
    String? badgeLabel;
    if (status == 'pending_agree') badgeLabel = '待确认';
    if (status == 'pending_confirm') badgeLabel = '待接单';

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        _showOrderActions(context, order);
      },
      child: Container(
        padding: const EdgeInsets.all(DT.md),
        decoration: BoxDecoration(
          color: DT.surface,
          borderRadius: BorderRadius.circular(DT.radius16),
          border: Border.all(color: DT.border),
          boxShadow: DT.shadowTile,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(order['orderNo']?.toString() ?? '',
                      style: DT.bodySmall),
                ),
                if (status != null)
                  OrderStatusBadge(status: status, label: badgeLabel),
              ],
            ),
            const SizedBox(height: DT.sm),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Text(
                      serviceType?.isNotEmpty == true ? serviceType! : '美甲服务',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: DT.titleSmall),
                ),
                if (price != null)
                  Text('¥${price.toStringAsFixed(0)}',
                      style: DT.monospace.copyWith(color: DT.primary)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String? value, String label) {
    final selected = _statusFilter == value && !_unpaidDepositOnly;
    return Padding(
      padding: const EdgeInsets.only(right: DT.sm),
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          setState(() {
            _statusFilter = value;
            _unpaidDepositOnly = false;
            _loading = true;
          });
          _loadOrders();
        },
        child: Container(
          alignment: Alignment.center,
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.symmetric(horizontal: DT.lg),
          decoration: BoxDecoration(
            color: selected ? DT.textPrimary : DT.surface,
            borderRadius: BorderRadius.circular(DT.rFull),
            border: Border.all(color: selected ? DT.textPrimary : DT.border),
          ),
          child: Text(label,
              style: TextStyle(
                fontSize: DT.textSm,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                color: selected ? Colors.white : DT.textSecondary,
              )),
        ),
      ),
    );
  }

  Widget _depositChip() {
    return Padding(
      padding: const EdgeInsets.only(right: DT.sm),
      child: Container(
        alignment: Alignment.center,
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(horizontal: DT.lg),
        decoration: BoxDecoration(
          color: DT.primary,
          borderRadius: BorderRadius.circular(DT.rFull),
        ),
        child: const Text('未支付定金',
            style: TextStyle(
                fontSize: DT.textSm,
                fontWeight: FontWeight.w600,
                color: Colors.white)),
      ),
    );
  }

  void _showOrderActions(BuildContext context, Map<String, dynamic> order) {
    final id = order['id'] as int;
    final status = order['status'] as String?;

    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(DT.lg),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('订单 ${order['orderNo']}', style: DT.titleMedium),
            const SizedBox(height: DT.lg),
            if (status == 'pending_quote')
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  onPressed: () {
                    HapticFeedback.mediumImpact();
                    Navigator.pop(ctx);
                    _showReviewDialog(context, id);
                  },
                  child: const Text('报价'),
                ),
              ),
            if (status == 'pending_confirm')
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  onPressed: () async {
                    HapticFeedback.mediumImpact();
                    Navigator.pop(ctx);
                    final apiClient = context.read<ApiClient>();
                    await TechnicianOrderService(apiClient).confirm(id);
                    _loadOrders();
                  },
                  child: const Text('确认接单'),
                ),
              ),
            if (status == 'in_progress')
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  onPressed: () async {
                    HapticFeedback.mediumImpact();
                    Navigator.pop(ctx);
                    final apiClient = context.read<ApiClient>();
                    await TechnicianOrderService(apiClient).complete(id);
                    _loadOrders();
                  },
                  child: const Text('完成订单'),
                ),
              ),
            if (['pending_quote', 'pending_agree', 'pending_confirm']
                .contains(status))
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton(
                  onPressed: () async {
                    HapticFeedback.mediumImpact();
                    Navigator.pop(ctx);
                    final apiClient = context.read<ApiClient>();
                    await TechnicianOrderService(apiClient).cancel(id);
                    _loadOrders();
                  },
                  child: const Text('取消订单'),
                ),
              ),
          ]),
        ),
      ),
    );
  }

  void _showReviewDialog(BuildContext context, int orderId) {
    final priceCtl = TextEditingController();
    final dateCtl = TextEditingController();
    final timeCtl = TextEditingController();
    final durationCtl = TextEditingController(text: '120');
    final remarkCtl = TextEditingController();

    showCupertinoDialog(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('报价'),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const SizedBox(height: DT.sm),
            CupertinoTextField(
              controller: priceCtl,
              placeholder: '报价金额',
              keyboardType: TextInputType.number,
              padding: const EdgeInsets.all(DT.md),
            ),
            const SizedBox(height: DT.sm),
            CupertinoTextField(
              controller: dateCtl,
              placeholder: '服务日期 (2026-06-15)',
              padding: const EdgeInsets.all(DT.md),
            ),
            const SizedBox(height: DT.sm),
            CupertinoTextField(
              controller: timeCtl,
              placeholder: '开始时间 (14:00)',
              padding: const EdgeInsets.all(DT.md),
            ),
            const SizedBox(height: DT.sm),
            CupertinoTextField(
              controller: durationCtl,
              placeholder: '时长(分钟)',
              keyboardType: TextInputType.number,
              padding: const EdgeInsets.all(DT.md),
            ),
            const SizedBox(height: DT.sm),
            CupertinoTextField(
              controller: remarkCtl,
              placeholder: '备注',
              padding: const EdgeInsets.all(DT.md),
            ),
          ]),
        ),
        actions: [
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () => Navigator.pop(ctx),
            child: const Text('取消'),
          ),
          CupertinoDialogAction(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final apiClient = context.read<ApiClient>();
                await TechnicianOrderService(apiClient).review(orderId, {
                  'price': double.tryParse(priceCtl.text) ?? 0,
                  'serviceDate': dateCtl.text,
                  'startTime': timeCtl.text,
                  'durationMinutes': int.tryParse(durationCtl.text) ?? 120,
                  if (remarkCtl.text.isNotEmpty) 'remark': remarkCtl.text,
                });
                _loadOrders();
              } catch (_) {}
            },
            child: const Text('提交报价'),
          ),
        ],
      ),
    );
  }
}
