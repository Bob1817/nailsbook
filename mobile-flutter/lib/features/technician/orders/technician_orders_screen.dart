import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../orders/technician_order_service.dart';

class TechnicianOrdersScreen extends StatefulWidget {
  const TechnicianOrdersScreen({super.key});

  @override
  State<TechnicianOrdersScreen> createState() => _TechnicianOrdersScreenState();
}

class _TechnicianOrdersScreenState extends State<TechnicianOrdersScreen> {
  List<Map<String, dynamic>> _orders = [];
  bool _loading = true;
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    try {
      final apiClient = context.read<ApiClient>();
      final service = TechnicianOrderService(apiClient);
      final orders = await service.list(status: _statusFilter);
      if (mounted) setState(() { _orders = orders; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  String _statusLabel(String? status) {
    switch (status) {
      case 'pending_quote': return '待报价';
      case 'pending_agree': return '待确认';
      case 'pending_confirm': return '待接单';
      case 'in_progress': return '服务中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status ?? '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('订单管理')),
      body: Column(children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(children: [
            _filterChip(null, '全部'),
            const SizedBox(width: 8),
            _filterChip('pending_quote', '待报价'),
            const SizedBox(width: 8),
            _filterChip('pending_agree', '待确认'),
            const SizedBox(width: 8),
            _filterChip('pending_confirm', '待接单'),
            const SizedBox(width: 8),
            _filterChip('in_progress', '服务中'),
            const SizedBox(width: 8),
            _filterChip('completed', '已完成'),
          ]),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _orders.isEmpty
                  ? const Center(child: Text('暂无订单'))
                  : RefreshIndicator(
                      onRefresh: _loadOrders,
                      child: ListView.builder(
                        itemCount: _orders.length,
                        itemBuilder: (context, index) {
                          final order = _orders[index];
                          final status = order['status'] as String?;
                          return Card(
                            child: ListTile(
                              title: Text(order['orderNo']?.toString() ?? ''),
                              subtitle: Text(_statusLabel(status)),
                              trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                                Text(_statusLabel(status), style: const TextStyle(fontWeight: FontWeight.w600)),
                                if (order['quotePrice'] != null)
                                  Text('¥${(order['quotePrice'] as num).toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFFE91E63))),
                              ]),
                              onTap: () => _showOrderActions(context, order),
                            ),
                          );
                        },
                      ),
                    ),
        ),
      ]),
    );
  }

  Widget _filterChip(String? value, String label) {
    final selected = _statusFilter == value;
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) {
        setState(() { _statusFilter = value; _loading = true; });
        _loadOrders();
      },
    );
  }

  void _showOrderActions(BuildContext context, Map<String, dynamic> order) {
    final id = order['id'] as int;
    final status = order['status'] as String?;

    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('订单 ${order['orderNo']}', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            if (status == 'pending_quote')
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  onPressed: () { Navigator.pop(ctx); _showReviewDialog(context, id); },
                  child: const Text('报价'),
                ),
              ),
            if (status == 'pending_confirm')
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  onPressed: () async {
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
                    Navigator.pop(ctx);
                    final apiClient = context.read<ApiClient>();
                    await TechnicianOrderService(apiClient).complete(id);
                    _loadOrders();
                  },
                  child: const Text('完成订单'),
                ),
              ),
            if (['pending_quote', 'pending_agree', 'pending_confirm'].contains(status))
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton(
                  onPressed: () async {
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

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('报价'),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: priceCtl, decoration: const InputDecoration(labelText: '报价金额'), keyboardType: TextInputType.number),
            TextField(controller: dateCtl, decoration: const InputDecoration(labelText: '服务日期', hintText: '2026-06-15')),
            TextField(controller: timeCtl, decoration: const InputDecoration(labelText: '开始时间', hintText: '14:00')),
            TextField(controller: durationCtl, decoration: const InputDecoration(labelText: '时长(分钟)'), keyboardType: TextInputType.number),
            TextField(controller: remarkCtl, decoration: const InputDecoration(labelText: '备注')),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
          ElevatedButton(
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