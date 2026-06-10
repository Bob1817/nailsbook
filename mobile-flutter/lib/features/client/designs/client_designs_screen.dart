import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import 'client_create_design_screen.dart';
import 'client_design_detail_screen.dart';
import 'client_design_models.dart';
import 'client_design_service.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

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
      if (mounted)
        setState(() {
          _designs = designs;
          _loading = false;
        });
    } catch (_) {
      if (mounted)
        setState(() {
          _loading = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: GlassAppBar(
        dark: true,
        title: const Text('我的设计'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final created = await Navigator.push<bool>(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const ClientCreateDesignScreen()));
              if (created == true) _loadDesigns();
            },
          ),
        ],
      ),
      backgroundColor: ET.bg,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: ET.accent))
          : _designs.isEmpty
              ? const Center(
                  child: Text('暂无设计需求', style: TextStyle(color: ET.inkMuted)))
              : RefreshIndicator(
                  color: ET.accent,
                  onRefresh: _loadDesigns,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    itemCount: _designs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) =>
                        _designCard(_designs[index]),
                  ),
                ),
    );
  }

  Widget _designCard(ClientDesign design) {
    final imgs = design.imageUrls ?? const [];
    final url = imgs.isNotEmpty ? imgs.first : null;
    final quoted = design.quotePrice != null;
    return GestureDetector(
      onTap: () async {
        final changed = await Navigator.push<bool>(
            context,
            MaterialPageRoute(
                builder: (_) => ClientDesignDetailScreen(designId: design.id)));
        if (changed == true) _loadDesigns();
      },
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: ET.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: ET.hairline)),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                width: 60,
                height: 60,
                child: url != null
                    ? CachedNetworkImage(
                        imageUrl: url,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(color: ET.surface),
                        errorWidget: (_, __, ___) => Container(
                            color: ET.surface,
                            child: const Icon(Icons.image_outlined,
                                color: ET.inkMuted)))
                    : Container(
                        color: ET.surface,
                        child: const Icon(Icons.palette_outlined,
                            color: ET.inkMuted)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(design.title ?? '未命名设计',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: ET.ink)),
                  const SizedBox(height: 6),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                        color: ET.surface,
                        borderRadius: BorderRadius.circular(999)),
                    child: Text(design.statusLabel,
                        style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: ET.inkSecondary)),
                  ),
                ],
              ),
            ),
            if (quoted)
              Text('¥${design.quotePrice!.toStringAsFixed(0)}',
                  style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: ET.accent)),
          ],
        ),
      ),
    );
  }
}
