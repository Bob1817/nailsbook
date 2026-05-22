import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import 'technician_customer_service.dart';

class TechnicianCustomerDetailScreen extends StatefulWidget {
  final int customerId;

  const TechnicianCustomerDetailScreen({super.key, required this.customerId});

  @override
  State<TechnicianCustomerDetailScreen> createState() => _TechnicianCustomerDetailScreenState();
}

class _TechnicianCustomerDetailScreenState extends State<TechnicianCustomerDetailScreen> {
  Map<String, dynamic>? _customer;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadCustomer();
  }

  Future<void> _loadCustomer() async {
    try {
      final apiClient = context.read<ApiClient>();
      final service = TechnicianCustomerService(apiClient);
      final data = await service.detail(widget.customerId);
      if (mounted) setState(() { _customer = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_customer == null) return const Scaffold(body: Center(child: Text('加载失败')));

    final name = _customer!['name']?.toString() ?? _customer!['nickname']?.toString() ?? '客户';
    final phone = _customer!['phone']?.toString() ?? '';
    final tags = _customer!['tags'] as String? ?? '';
    final address = _customer!['address']?.toString() ?? '';
    final totalSpending = _customer!['totalSpending'] as num?;
    final serviceCount = _customer!['serviceCount'] as int?;
    final lastVisit = _customer!['lastVisitDate']?.toString() ?? '';
    final history = (_customer!['orders'] as List<dynamic>?) ?? [];

    return Scaffold(
      appBar: AppBar(title: Text(name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: const Color(0xFFE91E63),
                  child: Text(name.substring(0, 1), style: const TextStyle(color: Colors.white, fontSize: 24)),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(name, style: Theme.of(context).textTheme.titleLarge),
                    if (phone.isNotEmpty) Text(phone, style: const TextStyle(color: Color(0xFF757575))),
                    const SizedBox(height: 4),
                    if (tags.isNotEmpty)
                      Wrap(spacing: 4, children: tags.split(',').map((t) => Chip(
                        label: Text(t.trim(), style: const TextStyle(fontSize: 11)),
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        padding: EdgeInsets.zero,
                      )).toList()),
                  ]),
                ),
                IconButton(
                  icon: const Icon(Icons.edit, color: Color(0xFFE91E63)),
                  onPressed: () => _showTagEditor(context, tags),
                ),
              ]),
            ),
          ),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: _statCard('总消费', totalSpending != null ? '¥${totalSpending.toStringAsFixed(0)}' : '--')),
            const SizedBox(width: 8),
            Expanded(child: _statCard('服务次数', serviceCount != null ? '$serviceCount' : '--')),
            const SizedBox(width: 8),
            Expanded(child: _statCard('最近到访', lastVisit.isNotEmpty ? lastVisit.substring(0, 10) : '--')),
          ]),
          if (address.isNotEmpty) ...[
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                leading: const Icon(Icons.location_on, color: Color(0xFFE91E63)),
                title: const Text('地址'),
                subtitle: Text(address),
              ),
            ),
          ],
          if (history.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text('服务记录', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ...history.map((order) => Card(
              child: ListTile(
                title: Text(order['serviceType']?.toString() ?? '服务'),
                subtitle: Text(order['createdAt']?.toString().substring(0, 10) ?? ''),
                trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  if (order['quotePrice'] != null) Text('¥${(order['quotePrice'] as num).toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFFE91E63))),
                  Text(order['status']?.toString() ?? '', style: const TextStyle(fontSize: 11, color: Color(0xFF757575))),
                ]),
              ),
            )),
          ],
        ],
      ),
    );
  }

  Widget _statCard(String label, String value) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(children: [
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF757575))),
        ]),
      ),
    );
  }

  void _showTagEditor(BuildContext context, String currentTags) {
    final tagCtl = TextEditingController();
    final tags = currentTags.split(',').map((t) => t.trim()).where((t) => t.isNotEmpty).toList();
    final availableTags = ['常客', '新客', '高频', 'VIP', '敏感肌', '喜欢亮色', '喜欢深色'];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('编辑标签'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Wrap(spacing: 4, children: tags.map((t) => Chip(
                label: Text(t),
                onDeleted: () => setDialogState(() => tags.remove(t)),
              )).toList()),
              const SizedBox(height: 12),
              const Text('常用标签:', style: TextStyle(fontSize: 12, color: Color(0xFF757575))),
              const SizedBox(height: 4),
              Wrap(spacing: 4, children: availableTags.where((t) => !tags.contains(t)).map((t) => ActionChip(
                label: Text(t),
                onPressed: () => setDialogState(() => tags.add(t)),
              )).toList()),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: TextField(controller: tagCtl, decoration: const InputDecoration(labelText: '自定义标签'))),
                IconButton(
                  icon: const Icon(Icons.add),
                  onPressed: () {
                    if (tagCtl.text.trim().isNotEmpty && !tags.contains(tagCtl.text.trim())) {
                      setDialogState(() { tags.add(tagCtl.text.trim()); tagCtl.clear(); });
                    }
                  },
                ),
              ]),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  final apiClient = context.read<ApiClient>();
                  await TechnicianCustomerService(apiClient).updateTags(widget.customerId, tags.join(','));
                  _loadCustomer();
                } catch (_) {}
              },
              child: const Text('保存标签'),
            ),
          ],
        ),
      ),
    );
  }
}
