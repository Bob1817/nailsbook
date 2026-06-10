import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../works/technician_work_service.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

class TechnicianServicesScreen extends StatefulWidget {
  const TechnicianServicesScreen({super.key});

  @override
  State<TechnicianServicesScreen> createState() =>
      _TechnicianServicesScreenState();
}

class _TechnicianServicesScreenState extends State<TechnicianServicesScreen> {
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
      if (mounted)
        setState(() {
          _services = items;
          _loading = false;
        });
    } catch (_) {
      if (mounted)
        setState(() {
          _loading = false;
        });
    }
  }

  Future<void> _toggleService(String id) async {
    try {
      final apiClient = context.read<ApiClient>();
      await TechnicianServiceService(apiClient).toggle(id);
      _loadServices();
    } catch (_) {}
  }

  Future<void> _deleteService(String id) async {
    try {
      final apiClient = context.read<ApiClient>();
      await TechnicianServiceService(apiClient).delete(id);
      _loadServices();
    } catch (_) {}
  }

  void _showCreateDialog(BuildContext context) {
    final nameCtl = TextEditingController();
    final descCtl = TextEditingController();
    String category = 'basic_care';

    final categories = [
      'basic_care',
      'color_style',
      'extension_reinforcement',
      'removal'
    ];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => CupertinoAlertDialog(
          title: const Text('新建服务项目'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            CupertinoTextField(controller: nameCtl, placeholder: '名称'),
            const SizedBox(height: DT.sm),
            CupertinoTextField(
                controller: descCtl, placeholder: '描述', maxLines: 2),
            const SizedBox(height: DT.sm),
            DropdownButtonFormField<String>(
              value: category,
              items: categories
                  .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                  .toList(),
              onChanged: (v) =>
                  setDialogState(() => category = v ?? 'basic_care'),
              decoration: const InputDecoration(labelText: '类别'),
            ),
          ]),
          actions: [
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () => Navigator.pop(ctx),
              child: const Text('取消'),
            ),
            CupertinoDialogAction(
              onPressed: () async {
                HapticFeedback.mediumImpact();
                Navigator.pop(ctx);
                try {
                  final apiClient = context.read<ApiClient>();
                  await TechnicianServiceService(apiClient).create({
                    'name': nameCtl.text,
                    'description': descCtl.text,
                    'category': category,
                  });
                  _loadServices();
                } catch (_) {}
              },
              child: const Text('创建'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: GlassAppBar(
        title: const Text('服务管理'),
        actions: [
          IconButton(
              icon: const Icon(CupertinoIcons.plus),
              onPressed: () {
                HapticFeedback.lightImpact();
                _showCreateDialog(context);
              }),
        ],
      ),
      backgroundColor: DT.bg,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : _services.isEmpty
              ? const Center(
                  child: Text('暂无服务项目', style: TextStyle(color: DT.textMuted)))
              : RefreshIndicator(
                  color: DT.primary,
                  onRefresh: _loadServices,
                  child: ListView.separated(
                    padding:
                        const EdgeInsets.fromLTRB(DT.lg, DT.md, DT.lg, 100),
                    itemCount: _services.length,
                    separatorBuilder: (_, __) => const SizedBox(height: DT.sm),
                    itemBuilder: (context, index) {
                      final svc = _services[index];
                      final id = svc['id'] as String;
                      final isActive = svc['isActive'] as bool? ?? true;
                      return GestureDetector(
                        onTap: () => HapticFeedback.lightImpact(),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: DT.md, vertical: DT.sm),
                          decoration: BoxDecoration(
                            color: DT.surface,
                            borderRadius: BorderRadius.circular(DT.radius16),
                            border: Border.all(color: DT.border),
                            boxShadow: DT.shadowTile,
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(svc['name']?.toString() ?? '',
                                        style: DT.titleSmall),
                                    const SizedBox(height: DT.xs),
                                    Text(
                                        '${svc['category']?.toString() ?? ''} \u00B7 ${isActive ? '启用' : '已停用'}',
                                        style: TextStyle(
                                            fontSize: 12,
                                            color: isActive
                                                ? DT.textSecondary
                                                : DT.textMuted)),
                                  ],
                                ),
                              ),
                              CupertinoSwitch(
                                value: isActive,
                                activeColor: DT.primary,
                                onChanged: (v) {
                                  HapticFeedback.selectionClick();
                                  _toggleService(id);
                                },
                              ),
                              const SizedBox(width: DT.xs),
                              IconButton(
                                icon: const Icon(CupertinoIcons.trash,
                                    color: DT.error),
                                onPressed: () {
                                  HapticFeedback.heavyImpact();
                                  _deleteService(id);
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
