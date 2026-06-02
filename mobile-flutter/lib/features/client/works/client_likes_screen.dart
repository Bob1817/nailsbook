import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';

class ClientLikesScreen extends StatefulWidget {
  const ClientLikesScreen({super.key});

  @override
  State<ClientLikesScreen> createState() => _ClientLikesScreenState();
}

class _ClientLikesScreenState extends State<ClientLikesScreen> {
  List<Map<String, dynamic>> _works = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>();
      final items = await api.getList('/works/likes');
      if (mounted) setState(() { _works = items.cast<Map<String, dynamic>>(); _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFF8FA), Color(0xFFF6F7FB), Color(0xFFF5F6F8)],
          stops: [0.0, 0.28, 1.0],
        ),
      ),
      child: _loading
          ? _buildSkeleton(topPad)
          : RefreshIndicator(
              color: DT.primary,
              onRefresh: _load,
              child: ListView(
                padding: EdgeInsets.fromLTRB(16, topPad + 8, 16, bottomPad + 24),
                children: [
                  _buildHeader(topPad),
                  const SizedBox(height: 16),
                  if (_works.isEmpty)
                    _buildEmpty()
                  else
                    _buildGrid(),
                ],
              ),
            ),
    );
  }

  Widget _buildHeader(double topPad) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, topPad + 8, 20, 16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.88),
        border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.6), width: 0.5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => context.pop(),
            child: Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: DT.primarySoft, shape: BoxShape.circle),
              child: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: DT.textPrimary),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('我的点赞',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, letterSpacing: -0.5, color: DT.textPrimary)),
                const SizedBox(height: 4),
                Text('查看你点赞过的美甲作品', style: TextStyle(fontSize: 13, color: DT.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGrid() {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.8,
      ),
      itemCount: _works.length,
      itemBuilder: (_, i) {
        final work = _works[i];
        final images = (work['imageUrls'] as List<dynamic>?) ?? [];
        final techName = (work['technician'] as Map<String, dynamic>?)?['name']?.toString() ?? '';
        final title = work['title']?.toString() ?? '未命名作品';
        final likeCount = work['likeCount'] as int? ?? 0;

        return GestureDetector(
          onTap: () => context.push('/client/works/${work['id']}'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 30, offset: const Offset(0, 10))],
                      border: Border.all(color: Colors.black.withOpacity(0.05)),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: images.isNotEmpty
                          ? Image.network(images[0].toString(), fit: BoxFit.cover, width: double.infinity,
                              errorBuilder: (_, __, ___) => Container(
                                color: const Color(0xFFF1F5F9),
                                child: const Icon(Icons.image_not_supported_outlined, color: Color(0xFFCBD5E1), size: 32),
                              ))
                          : Container(
                              color: const Color(0xFFF1F5F9),
                              child: const Icon(Icons.image_outlined, color: Color(0xFFCBD5E1), size: 32),
                            ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (techName.isNotEmpty)
                      Row(
                        children: [
                          Text(techName,
                            style: TextStyle(fontSize: 11, color: DT.textMuted)),
                          const SizedBox(width: 4),
                          const Icon(Icons.check_circle, size: 12, color: DT.primary),
                        ],
                      ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Expanded(
                          child: Text(title,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: DT.textPrimary),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.favorite, size: 14, color: DT.primary),
                            const SizedBox(width: 3),
                            Text('$likeCount',
                              style: TextStyle(fontSize: 11, color: DT.textMuted)),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmpty() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: DT.shadowSm,
        border: Border.all(color: Colors.black.withOpacity(0.05)),
      ),
      child: Column(
        children: [
          const Text('💗', style: TextStyle(fontSize: 40)),
          const SizedBox(height: 12),
          const Text('暂无点赞作品', style: TextStyle(fontSize: 15, color: DT.textMuted)),
          const SizedBox(height: 6),
          Text('去首页发现喜欢的作品并点赞吧',
            style: TextStyle(fontSize: 13, color: DT.textMuted)),
          const SizedBox(height: 20),
          GestureDetector(
            onTap: () => context.go('/client/home'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
              decoration: BoxDecoration(color: DT.primary, borderRadius: BorderRadius.circular(999)),
              child: const Text('去逛逛', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSkeleton(double topPad) {
    return ListView(
      padding: EdgeInsets.fromLTRB(16, topPad + 8, 16, 24),
      children: [
        Row(children: [
          Container(width: 44, height: 44, decoration: BoxDecoration(color: const Color(0xFFE8E8E8), shape: BoxShape.circle)),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(width: 80, height: 26, decoration: BoxDecoration(color: const Color(0xFFE8E8E8), borderRadius: BorderRadius.circular(4))),
            const SizedBox(height: 4),
            Container(width: 140, height: 12, decoration: BoxDecoration(color: const Color(0xFFE8E8E8), borderRadius: BorderRadius.circular(4))),
          ]),
        ]),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.8,
          ),
          itemCount: 4,
          itemBuilder: (_, __) => Container(
            decoration: BoxDecoration(color: const Color(0xFFE8E8E8), borderRadius: BorderRadius.circular(20)),
          ),
        ),
      ],
    );
  }
}
