import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../works/technician_work_service.dart';

class TechnicianWorksScreen extends StatefulWidget {
  const TechnicianWorksScreen({super.key});

  @override
  State<TechnicianWorksScreen> createState() => _TechnicianWorksScreenState();
}

class _TechnicianWorksScreenState extends State<TechnicianWorksScreen> {
  List<Map<String, dynamic>> _works = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadWorks();
  }

  Future<void> _loadWorks() async {
    try {
      final apiClient = context.read<ApiClient>();
      final service = TechnicianWorkService(apiClient);
      final works = await service.list();
      if (mounted) setState(() { _works = works; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('作品管理'),
        actions: [
          IconButton(icon: const Icon(Icons.add), onPressed: () => _showCreateDialog(context)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _works.isEmpty
              ? const Center(child: Text('暂无作品'))
              : RefreshIndicator(
                  onRefresh: _loadWorks,
                  child: ListView.builder(
                    itemCount: _works.length,
                    itemBuilder: (context, index) {
                      final work = _works[index];
                      final id = work['id'] as int;
                      final isVisible = work['isVisible'] as bool? ?? true;
                      final isPinned = work['isPinned'] as bool? ?? false;
                      final isFeatured = work['isFeatured'] as bool? ?? false;
                      return Card(
                        child: ListTile(
                          title: Row(children: [
                            Expanded(child: Text(work['title']?.toString() ?? '未命名作品')),
                            if (isPinned) const Icon(Icons.push_pin, size: 16, color: Colors.orange),
                            if (isFeatured) const Icon(Icons.star, size: 16, color: Colors.amber),
                          ]),
                          subtitle: Text(isVisible ? '可见' : '已隐藏'),
                          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                            IconButton(
                              icon: Icon(isVisible ? Icons.visibility : Icons.visibility_off),
                              onPressed: () async {
                                final apiClient = context.read<ApiClient>();
                                await TechnicianWorkService(apiClient).toggleVisible(id);
                                _loadWorks();
                              },
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline),
                              onPressed: () async {
                                final apiClient = context.read<ApiClient>();
                                await TechnicianWorkService(apiClient).delete(id);
                                _loadWorks();
                              },
                            ),
                          ]),
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  void _showCreateDialog(BuildContext context) {
    final titleCtl = TextEditingController();
    final descCtl = TextEditingController();
    final tagsCtl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('新建作品'),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: titleCtl, decoration: const InputDecoration(labelText: '标题')),
            TextField(controller: descCtl, decoration: const InputDecoration(labelText: '描述'), maxLines: 2),
            TextField(controller: tagsCtl, decoration: const InputDecoration(labelText: '标签(逗号分隔)')),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final apiClient = context.read<ApiClient>();
                await TechnicianWorkService(apiClient).create({
                  'title': titleCtl.text,
                  'description': descCtl.text,
                  'tags': tagsCtl.text,
                  'isVisible': true,
                });
                _loadWorks();
              } catch (_) {}
            },
            child: const Text('创建'),
          ),
        ],
      ),
    );
  }
}