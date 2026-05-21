import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import 'technician_customer_service.dart';

class TechnicianCustomersScreen extends StatefulWidget {
  const TechnicianCustomersScreen({super.key});

  @override
  State<TechnicianCustomersScreen> createState() => _TechnicianCustomersScreenState();
}

class _TechnicianCustomersScreenState extends State<TechnicianCustomersScreen> {
  List<Map<String, dynamic>> _customers = [];
  bool _loading = true;
  final _searchCtl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadCustomers();
  }

  @override
  void dispose() {
    _searchCtl.dispose();
    super.dispose();
  }

  Future<void> _loadCustomers({String? search}) async {
    try {
      final apiClient = context.read<ApiClient>();
      final service = TechnicianCustomerService(apiClient);
      final customers = await service.list(search: search);
      if (mounted) setState(() { _customers = customers; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('客户管理')),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchCtl,
            decoration: InputDecoration(
              labelText: '搜索客户',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: IconButton(
                icon: const Icon(Icons.clear),
                onPressed: () { _searchCtl.clear(); _loadCustomers(); },
              ),
            ),
            onSubmitted: (v) => _loadCustomers(search: v.isEmpty ? null : v),
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _customers.isEmpty
                  ? const Center(child: Text('暂无客户'))
                  : ListView.builder(
                      itemCount: _customers.length,
                      itemBuilder: (context, index) {
                        final c = _customers[index];
                        return Card(
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: const Color(0xFFE91E63),
                              child: Text((c['name'] as String?)?.substring(0, 1) ?? '?', style: const TextStyle(color: Colors.white)),
                            ),
                            title: Text(c['name']?.toString() ?? ''),
                            subtitle: Text(c['phone']?.toString() ?? ''),
                            trailing: c['tags'] != null ? Text(c['tags'].toString(), style: const TextStyle(fontSize: 12)) : null,
                          ),
                        );
                      },
                    ),
        ),
      ]),
    );
  }
}