import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import 'client_order_models.dart';
import 'client_order_service.dart';

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
      if (mounted) setState(() { _orders = orders; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('我的订单')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _orders.isEmpty
              ? const Center(child: Text('暂无订单'))
              : RefreshIndicator(
                  onRefresh: _loadOrders,
                  child: ListView.builder(
                    itemCount: _orders.length,
                    itemBuilder: (context, index) {
                      final order = _orders[index];
                      return Card(
                        child: ListTile(
                          title: Text('${order.serviceType ?? "服务"} · ${order.statusLabel}'),
                          subtitle: Text(order.orderNo),
                          isThreeLine: true,
                          trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                            Text(order.statusLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
                            if (order.quotePrice != null && order.quotePrice! > 0)
                              Text('¥${order.quotePrice!.toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFFE91E63))),
                          ]),
                          onTap: () => _showOrderDetail(context, order),
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  void _showOrderDetail(BuildContext context, ClientOrder order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (ctx, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('订单详情', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            _detailRow('订单号', order.orderNo),
            _detailRow('状态', order.statusLabel),
            if (order.serviceType != null) _detailRow('服务类型', order.serviceType!),
            if (order.address != null) _detailRow('地址', order.address!),
            if (order.remark != null) _detailRow('备注', order.remark!),
            if (order.quotePrice != null) _detailRow('报价', '¥${order.quotePrice!.toStringAsFixed(0)}'),
            if (order.quoteRemark != null) _detailRow('报价备注', order.quoteRemark!),
            const SizedBox(height: 24),
            if (order.status == 'pending_agree') Row(children: [
              Expanded(child: ElevatedButton(onPressed: () => _agreeOrder(order.id), child: const Text('同意报价'))),
              const SizedBox(width: 8),
              Expanded(child: OutlinedButton(onPressed: () => _rejectOrder(order.id), child: const Text('拒绝报价'))),
            ]),
            if (['pending_quote', 'pending_agree', 'pending_confirm'].contains(order.status))
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton(onPressed: () => _cancelOrder(order.id), child: const Text('取消订单')),
              ),
          ]),
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(children: [
      SizedBox(width: 80, child: Text(label, style: const TextStyle(color: Color(0xFF757575)))),
      Expanded(child: Text(value)),
    ]),
  );

  Future<void> _agreeOrder(int id) async {
    try {
      final apiClient = context.read<ApiClient>();
      await ClientOrderService(apiClient).agree(id);
      _loadOrders();
    } catch (_) {}
  }

  Future<void> _rejectOrder(int id) async {
    try {
      final apiClient = context.read<ApiClient>();
      await ClientOrderService(apiClient).rejectQuote(id, '价格不合适');
      _loadOrders();
    } catch (_) {}
  }

  Future<void> _cancelOrder(int id) async {
    try {
      final apiClient = context.read<ApiClient>();
      await ClientOrderService(apiClient).updateStatus(id, 'cancelled');
      _loadOrders();
    } catch (_) {}
  }
}