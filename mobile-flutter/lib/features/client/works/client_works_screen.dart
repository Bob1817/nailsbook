import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import 'client_work_detail_screen.dart';
import 'package:nailbook_mobile/core/widgets/glass_container.dart';

class ClientWorksScreen extends StatefulWidget {
  const ClientWorksScreen({super.key});

  @override
  State<ClientWorksScreen> createState() => _ClientWorksScreenState();
}

class _ClientWorksScreenState extends State<ClientWorksScreen> {
  List<Map<String, dynamic>> _works = [];
  int? _selectedTechId;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadWorks();
  }

  Future<void> _loadWorks() async {
    try {
      final apiClient = context.read<ApiClient>();
      final queryParams = <String, String>{};
      if (_selectedTechId != null)
        queryParams['techId'] = _selectedTechId.toString();
      final items = await apiClient.getList('/works',
          queryParams: queryParams.isEmpty ? null : queryParams);
      if (mounted)
        setState(() {
          _works = items.cast<Map<String, dynamic>>();
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
      backgroundColor: ET.bg,
      appBar: GlassAppBar(title: const Text('作品'), dark: true),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: ET.accent))
          : _works.isEmpty
              ? const Center(
                  child: Text('暂无作品', style: TextStyle(color: ET.inkMuted)))
              : RefreshIndicator(
                  color: ET.accent,
                  onRefresh: _loadWorks,
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 0.72,
                    ),
                    itemCount: _works.length,
                    itemBuilder: (context, index) => _workCard(_works[index]),
                  ),
                ),
    );
  }

  Widget _workCard(Map<String, dynamic> work) {
    final images = (work['imageUrls'] as List<dynamic>?) ?? [];
    final cover = work['coverUrl']?.toString();
    final url = (cover != null && cover.isNotEmpty)
        ? cover
        : (images.isNotEmpty ? images.first.toString() : null);
    final title = work['title']?.toString();
    final techName =
        (work['technician'] as Map<String, dynamic>?)?['name']?.toString() ??
            work['technicianName']?.toString() ??
            '';
    final likeCount = work['likeCount'] as int? ?? 0;

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
            builder: (_) => ClientWorkDetailScreen(workId: work['id'] as int)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (url != null)
              CachedNetworkImage(
                  imageUrl: url,
                  fit: BoxFit.cover,
                  placeholder: (_, __) =>
                      Container(color: ET.surface),
                  errorWidget: (_, __, ___) =>
                      Container(color: ET.surface))
            else
              Container(
                  color: ET.surface,
                  child:
                      const Icon(Icons.spa_outlined, color: ET.inkMuted)),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Color(0x12000000),
                    Color(0xAB000000)
                  ],
                  stops: [0.42, 0.62, 1.0],
                ),
              ),
            ),
            Positioned(
              right: 8,
              top: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.28),
                    borderRadius: BorderRadius.circular(999)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.favorite, color: Colors.white, size: 11),
                  const SizedBox(width: 3),
                  Text('$likeCount',
                      style:
                          const TextStyle(color: Colors.white, fontSize: 11)),
                ]),
              ),
            ),
            Positioned(
              left: 10,
              right: 10,
              bottom: 10,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(title?.isNotEmpty == true ? title! : '未命名作品',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Colors.white)),
                  if (techName.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(techName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 11,
                            color: Colors.white.withValues(alpha: 0.8))),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
