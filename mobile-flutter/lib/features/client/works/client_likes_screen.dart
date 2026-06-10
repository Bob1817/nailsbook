import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/editorial_tokens.dart';
import 'work_card.dart';

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
      final works = items.cast<Map<String, dynamic>>();
      for (final w in works) {
        w['isLiked'] = true; // 点赞列表中的作品默认均为已点赞
      }
      if (mounted) setState(() { _works = works; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleLike(Map<String, dynamic> work) async {
    final id = work['id'] as int;
    final next = !(work['isLiked'] as bool? ?? false);
    final delta = next ? 1 : -1;
    setState(() {
      work['isLiked'] = next;
      work['likeCount'] = ((work['likeCount'] as int? ?? 0) + delta).clamp(0, 1 << 31);
    });
    try {
      await context.read<ApiClient>().post('/works/$id/like');
    } catch (_) {
      if (mounted) setState(() {
        work['isLiked'] = !next;
        work['likeCount'] = ((work['likeCount'] as int? ?? 0) - delta).clamp(0, 1 << 31);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    return Scaffold(
      backgroundColor: ET.bg,
      body: Container(
      color: ET.bg,
      child: Column(
        children: [
          _buildHeader(topPad),
          Expanded(
            child: _loading
                ? _buildSkeleton()
                : _works.isEmpty
                    ? _buildEmpty()
                    : WorkMasonryGrid(
                        works: _works,
                        onRefresh: _load,
                        padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.of(context).padding.bottom + 24),
                        onTapWork: (w) => context.push('/client/works/${w['id']}'),
                        onToggleLike: _toggleLike,
                      ),
          ),
        ],
      ),
      ),
    );
  }

  Widget _buildHeader(double topPad) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, topPad + 8, 20, 16),
      decoration: BoxDecoration(
        color: ET.bg,
        border: Border(bottom: BorderSide(color: ET.hairlineFaint, width: 0.5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => context.pop(),
            child: Container(
              width: 44, height: 44,
              decoration: const BoxDecoration(color: ET.surface, shape: BoxShape.circle),
              child: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: ET.ink),
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('我的点赞', style: ET.displaySmall),
                SizedBox(height: 4),
                Text('查看你点赞过的美甲作品', style: TextStyle(fontSize: 13, color: ET.inkMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 80, 24, 24),
      children: [
        const Center(child: Text('❤️', style: TextStyle(fontSize: 44))),
        const SizedBox(height: 14),
        const Center(child: Text('暂无点赞作品', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: ET.ink))),
        const SizedBox(height: 6),
        const Center(child: Text('去首页给喜欢的作品点个赞吧', style: TextStyle(fontSize: 13, color: ET.inkMuted))),
        const SizedBox(height: 22),
        Center(
          child: GestureDetector(
            onTap: () => context.go('/client/home'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 11),
              decoration: BoxDecoration(color: ET.cream, borderRadius: BorderRadius.circular(999)),
              child: const Text('去逛逛', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: ET.onCream)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSkeleton() {
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.7,
      ),
      itemCount: 6,
      itemBuilder: (_, __) => Container(
        decoration: BoxDecoration(color: ET.surface, borderRadius: BorderRadius.circular(18)),
      ),
    );
  }
}
