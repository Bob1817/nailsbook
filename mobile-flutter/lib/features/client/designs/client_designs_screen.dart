import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import 'client_design_models.dart';
import 'client_design_service.dart';

class ClientDesignsScreen extends StatefulWidget {
  const ClientDesignsScreen({super.key});

  @override
  State<ClientDesignsScreen> createState() => _ClientDesignsScreenState();
}

class _ClientDesignsScreenState extends State<ClientDesignsScreen> {
  List<ClientDesign> _designs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadDesigns();
  }

  Future<void> _loadDesigns() async {
    try {
      final apiClient = context.read<ApiClient>();
      final service = ClientDesignService(apiClient);
      final designs = await service.list();
      if (mounted) setState(() { _designs = designs; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('我的设计'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showCreateDialog(context),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _designs.isEmpty
              ? const Center(child: Text('暂无设计需求'))
              : RefreshIndicator(
                  onRefresh: _loadDesigns,
                  child: ListView.builder(
                    itemCount: _designs.length,
                    itemBuilder: (context, index) {
                      final design = _designs[index];
                      return Card(
                        child: ListTile(
                          title: Text(design.title ?? '未命名设计'),
                          subtitle: Text(design.statusLabel),
                          trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                            Text(design.statusLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
                            if (design.quotePrice != null)
                              Text('¥${design.quotePrice!.toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFFE91E63))),
                          ]),
                          onTap: () => _showDesignDetail(context, design),
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  void _showDesignDetail(BuildContext context, ClientDesign design) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        minChildSize: 0.3,
        maxChildSize: 0.8,
        expand: false,
        builder: (ctx, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(design.title ?? '设计详情', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            Text('状态: ${design.statusLabel}'),
            if (design.description != null) ...[
              const SizedBox(height: 8),
              Text(design.description!),
            ],
            if (design.quotePrice != null) ...[
              const SizedBox(height: 8),
              Text('报价: ¥${design.quotePrice!.toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFFE91E63), fontWeight: FontWeight.w600)),
            ],
            if (design.quoteRemark != null) ...[
              const SizedBox(height: 4),
              Text(design.quoteRemark!),
            ],
          ]),
        ),
      ),
    );
  }

  void _showCreateDialog(BuildContext context) {
    final titleCtl = TextEditingController();
    final descCtl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('新建设计需求'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: titleCtl, decoration: const InputDecoration(labelText: '标题')),
          const SizedBox(height: 8),
          TextField(controller: descCtl, decoration: const InputDecoration(labelText: '描述'), maxLines: 3),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final apiClient = context.read<ApiClient>();
                await ClientDesignService(apiClient).create({
                  'title': titleCtl.text,
                  'description': descCtl.text,
                  'imageUrls': ['https://example.com/placeholder.jpg'],
                });
                _loadDesigns();
              } catch (_) {}
            },
            child: const Text('创建'),
          ),
        ],
      ),
    );
  }
}