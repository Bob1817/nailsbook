import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import 'client_address_models.dart';
import 'client_address_service.dart';

class ClientAddressesScreen extends StatefulWidget {
  const ClientAddressesScreen({super.key});

  @override
  State<ClientAddressesScreen> createState() => _ClientAddressesScreenState();
}

class _ClientAddressesScreenState extends State<ClientAddressesScreen> {
  List<ClientAddress> _addresses = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    try {
      final apiClient = context.read<ApiClient>();
      final service = ClientAddressService(apiClient);
      final addresses = await service.list();
      if (mounted) setState(() { _addresses = addresses; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  Future<void> _deleteAddress(int id) async {
    try {
      final apiClient = context.read<ApiClient>();
      final service = ClientAddressService(apiClient);
      await service.delete(id);
      _loadAddresses();
    } catch (_) {}
  }

  Future<void> _setDefault(int id) async {
    try {
      final apiClient = context.read<ApiClient>();
      final service = ClientAddressService(apiClient);
      await service.setDefault(id);
      _loadAddresses();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('我的地址'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showEditDialog(context),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _addresses.isEmpty
              ? const Center(child: Text('暂无地址'))
              : ListView.builder(
                  itemCount: _addresses.length,
                  itemBuilder: (context, index) {
                    final addr = _addresses[index];
                    return Card(
                      child: ListTile(
                        title: Text(addr.contactName ?? '未命名'),
                        subtitle: Text(addr.fullAddress),
                        isThreeLine: true,
                        trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                          if (!addr.isDefault)
                            IconButton(
                              icon: const Icon(Icons.star_border),
                              onPressed: () => _setDefault(addr.id),
                              tooltip: '设为默认',
                            ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline),
                            onPressed: () => _deleteAddress(addr.id),
                          ),
                        ]),
                      ),
                    );
                  },
                ),
    );
  }

  void _showEditDialog(BuildContext context, {ClientAddress? existing}) {
    final nameCtl = TextEditingController(text: existing?.contactName);
    final phoneCtl = TextEditingController(text: existing?.contactPhone);
    final cityCtl = TextEditingController(text: existing?.city);
    final districtCtl = TextEditingController(text: existing?.district);
    final detailCtl = TextEditingController(text: existing?.detailAddress);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existing == null ? '新增地址' : '编辑地址'),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: nameCtl, decoration: const InputDecoration(labelText: '联系人')),
            TextField(controller: phoneCtl, decoration: const InputDecoration(labelText: '联系电话'), keyboardType: TextInputType.phone),
            TextField(controller: cityCtl, decoration: const InputDecoration(labelText: '城市')),
            TextField(controller: districtCtl, decoration: const InputDecoration(labelText: '区/县')),
            TextField(controller: detailCtl, decoration: const InputDecoration(labelText: '详细地址')),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final apiClient = context.read<ApiClient>();
              final service = ClientAddressService(apiClient);
              final data = {
                'contactName': nameCtl.text,
                'contactPhone': phoneCtl.text,
                'city': cityCtl.text,
                'district': districtCtl.text,
                'detailAddress': detailCtl.text,
                if (existing == null) 'isDefault': _addresses.isEmpty,
              };
              if (existing == null) {
                await service.create(data);
              } else {
                await service.update(existing.id, data);
              }
              _loadAddresses();
            },
            child: const Text('保存'),
          ),
        ],
      ),
    );
  }
}
