import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import 'client_work_detail_screen.dart';

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
      if (_selectedTechId != null) queryParams['techId'] = _selectedTechId.toString();
      final items = await apiClient.getList('/home/works', queryParams: queryParams.isEmpty ? null : queryParams);
      if (mounted) setState(() { _works = items.cast<Map<String, dynamic>>(); _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('作品')),
      body: Column(children: [
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: [
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: FilterChip(
                  label: const Text('全部'),
                  selected: _selectedTechId == null,
                  onSelected: (_) { setState(() { _selectedTechId = null; _loading = true; }); _loadWorks(); },
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _works.isEmpty
                  ? const Center(child: Text('暂无作品'))
                  : RefreshIndicator(
                      onRefresh: _loadWorks,
                      child: GridView.builder(
                        padding: const EdgeInsets.all(8),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 8,
                          mainAxisSpacing: 8,
                          childAspectRatio: 0.75,
                        ),
                        itemCount: _works.length,
                        itemBuilder: (context, index) {
                          final work = _works[index];
                          final images = (work['imageUrls'] as List<dynamic>?) ?? [];
                          final techName = (work['technician'] as Map<String, dynamic>?)?['name']?.toString() ?? '';
                          final likeCount = work['likeCount'] as int? ?? 0;
                          final commentCount = work['commentCount'] as int? ?? 0;

                          return GestureDetector(
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => ClientWorkDetailScreen(workId: work['id'] as int)),
                            ),
                            child: Card(
                              clipBehavior: Clip.antiAlias,
                              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                                Expanded(
                                  flex: 3,
                                  child: Stack(fit: StackFit.expand, children: [
                                    if (images.isNotEmpty)
                                      CachedNetworkImage(
                                        imageUrl: images[0].toString(),
                                        fit: BoxFit.cover,
                                        placeholder: (_, __) => Container(color: Colors.grey.shade200),
                                        errorWidget: (_, __, ___) => const Icon(Icons.image_not_supported),
                                      )
                                    else
                                      Container(color: Colors.grey.shade200, child: const Icon(Icons.spa, color: Colors.grey)),
                                    Positioned(
                                      top: 8,
                                      right: 8,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.black54,
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                                          const Icon(Icons.favorite, color: Colors.white, size: 12),
                                          const SizedBox(width: 2),
                                          Text('$likeCount', style: const TextStyle(color: Colors.white, fontSize: 11)),
                                        ]),
                                      ),
                                    ),
                                  ]),
                                ),
                                Expanded(
                                  flex: 1,
                                  child: Padding(
                                    padding: const EdgeInsets.all(8),
                                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                      Text(work['title']?.toString() ?? '未命名',
                                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                          maxLines: 1, overflow: TextOverflow.ellipsis),
                                      const SizedBox(height: 2),
                                      Row(children: [
                                        Expanded(child: Text(techName, style: const TextStyle(fontSize: 11, color: Color(0xFF757575)), maxLines: 1, overflow: TextOverflow.ellipsis)),
                                        Icon(Icons.chat_bubble, size: 12, color: Colors.grey.shade400),
                                        const SizedBox(width: 2),
                                        Text('$commentCount', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                                      ]),
                                    ]),
                                  ),
                                ),
                              ]),
                            ),
                          );
                        },
                      ),
                    ),
        ),
      ]),
    );
  }
}
