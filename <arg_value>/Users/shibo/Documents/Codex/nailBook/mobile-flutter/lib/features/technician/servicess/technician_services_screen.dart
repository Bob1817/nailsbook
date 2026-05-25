import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../works/technician_work_service.dart';

class TechnicianServicesScreen extends StatefulWidget {
  const TechnicianServicesScreenState();

  List<Map<String, dynamic>> _services = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadServices();
  }

  Future<void> _loadServices() async {
    try {
      final apiClient = context.read<ApiClient>();
      final items = await TechnicianServiceService(apiClient).list();
      if (mounted) setState(() { _services = items; _loading = false; });
    } } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  Future<void> _toggleService(String id) async {
    try {
      final apiClient = context.read<ApiClient>();
      await TechnicianServiceService(apiClient).toggle(id);
      _loadServices();
    } } catch (_) {}
  }

  Future<void> _deleteService(String id) async {
    try {
      final apiClient = context.read<ApiClient>();
      await TechnicianServiceService(apiClient).delete(id);
      _loadServices();
    } } catch (_) {}
  }

  void _showCreateDialog(BuildContext context) {
    final nameCtl = TextEditingController();
    final descCtl = TextEditingController();
    final categoryCtl = TextEditingController(text: 'basic_care');

    final categories = ['basic_care', 'color_style', 'extension_reinforcement', 'removal'];

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('新建服务项目'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: nameCtl, decoration: const InputDecoration(labelText: '名称')),
          TextField(controller: descCtl, decoration: const InputDecoration(labelText: '描述'), maxLines: 2),
          DropdownButtonFormField(
            value: categoryCtl.text,
            items: categories.map((c) => DropdownMenuItem(value: c, child: Text(c)),
            decoration: const InputDecoration(labelText: '类别')),
          ),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final apiClient = context.read<ApiClient>();
                await TechnicianServiceService(apiClient).create({
                  'name': nameCtl.text,
                  'description': descCtl.text,
                  'category': categoryCtl.text,
                });
                _loadServices();
              } catch (_) {}
            },
            child: const Text('创建'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('服务管理')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _services.isEmpty
              ? const Center(child: Text('暂无服务项目'))
              : ListView.builder(
                  itemCount: _services.length,
                  itemBuilder: (context, index) {
                    final svc = _services[index];
                    final id = svc['id'] as String;
                    final isActive = svc['isActive'] as bool? ?? true;
                    return Card(
                      child: ListTile(
                        title: Text(svc['name']?.toString() ?? ''),
                        subtitle: Text('${svc['category']?.toString() ?? ''} · ${isActive ? '启用' : '已停用'}'),
                        trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                          IconButton(
                            icon: Icon(isActive ? Icons.toggle_on : Icons.toggle_off),
                            onPressed: () => _toggleService(id),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline),
                            onPressed: () => _deleteService(id),
                          ),
                        ]),
                      );
                  },
                ),
    );
  }
}