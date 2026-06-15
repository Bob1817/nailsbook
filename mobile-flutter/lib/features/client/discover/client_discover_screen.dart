import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/media/oss_image.dart';
import '../../../core/theme/editorial_tokens.dart';
import '../../../core/widgets/client_glass_header.dart';
import '../../../core/widgets/glow_field.dart';
import '../works/client_work_detail_screen.dart';

/// 发现页：刷一刷绑定美甲师发布的最新作品（种草核心）。
/// 对齐 webapp client-frontend/src/pages/Discover.tsx。
class ClientDiscoverScreen extends StatefulWidget {
  const ClientDiscoverScreen({super.key});

  @override
  State<ClientDiscoverScreen> createState() => _ClientDiscoverScreenState();
}

const _categories = ['全部', '法式', '渐变', '日系', 'ins风', '简约', '可爱', '水晶', '炫彩'];
const _aspectPatterns = [4 / 5, 3 / 4, 5 / 6, 2 / 3];

class _ClientDiscoverScreenState extends State<ClientDiscoverScreen> {
  List<Map<String, dynamic>> _works = [];
  bool _loading = true;
  String _activeCategory = '全部';

  bool _searchOpen = false;
  String _searchQuery = '';
  final _searchCtl = TextEditingController();
  final _searchFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    _loadWorks();
  }

  @override
  void dispose() {
    _searchCtl.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  void _openSearch() {
    setState(() => _searchOpen = true);
    WidgetsBinding.instance.addPostFrameCallback((_) => _searchFocus.requestFocus());
  }

  void _closeSearch() {
    _searchFocus.unfocus();
    setState(() => _searchOpen = false);
  }

  Future<void> _loadWorks() async {
    setState(() => _loading = true);
    try {
      final apiClient = context.read<ApiClient>();
      final items = await apiClient.getList('/works', queryParams: {
        'sortBy': 'latest',
        'sortDir': 'desc',
      });
      if (mounted) {
        setState(() {
          _works = items.cast<Map<String, dynamic>>();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _filtered {
    var list = _works;
    if (_activeCategory != '全部') {
      list = list.where((w) {
        final tags =
            (w['tags'] as List<dynamic>?)?.map((e) => e.toString()) ?? const [];
        return tags.any(
            (t) => t.contains(_activeCategory) || _activeCategory.contains(t));
      }).toList();
    }
    final q = _searchQuery.trim();
    if (q.isNotEmpty) {
      list = list.where((w) {
        final title = (w['title']?.toString() ?? '');
        final tech = (w['technicianName']?.toString() ?? '');
        final tags = ((w['tags'] as List<dynamic>?) ?? const [])
            .map((e) => e.toString())
            .join(' ');
        return '$title $tech $tags'.toLowerCase().contains(q.toLowerCase());
      }).toList();
    }
    return list;
  }

  Future<void> _toggleLike(Map<String, dynamic> work) async {
    final id = work['id'] as int;
    final nextLiked = !(work['isLiked'] as bool? ?? false);
    final delta = nextLiked ? 1 : -1;
    setState(() {
      work['isLiked'] = nextLiked;
      work['likeCount'] =
          ((work['likeCount'] as int? ?? 0) + delta).clamp(0, 1 << 31);
    });
    try {
      await context.read<ApiClient>().post('/works/$id/like');
    } catch (_) {
      if (mounted) {
        setState(() {
          work['isLiked'] = !nextLiked;
          work['likeCount'] =
              ((work['likeCount'] as int? ?? 0) - delta).clamp(0, 1 << 31);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    final topPad = MediaQuery.of(context).padding.top;
    // 去掉副标题+搜索框后头部更矮，作品可视区更大
    final headerH = ClientGlassHeader.estimateHeight(context, belowHeight: 42);
    return Scaffold(
      backgroundColor: ET.bg,
      body: Stack(
        children: [
          Positioned.fill(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: ET.accent))
                : _works.isEmpty
                    ? _buildEmptyNoWorks(headerH)
                    : filtered.isEmpty
                        ? _buildEmptyCategory(headerH)
                        : RefreshIndicator(
                            color: ET.accent,
                            backgroundColor: ET.surface,
                            onRefresh: _loadWorks,
                            child: _buildMasonry(filtered, headerH),
                          ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: ClientGlassHeader(
              title: '发现',
              actions: [
                HeaderCircleButton(
                  onTap: _openSearch,
                  child: const Icon(Icons.search_rounded,
                      size: 20, color: ET.inkSecondary),
                ),
              ],
              below: _headerBelow(),
            ),
          ),
          // 搜索浮窗：点击搜索图标弹出，点击其它区域关闭
          if (_searchOpen) ...[
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: _closeSearch,
                child: Container(color: Colors.black.withValues(alpha: 0.4)),
              ),
            ),
            Positioned(
              top: topPad + 52,
              left: 16,
              right: 16,
              child: _searchBox(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _searchBox() {
    return Material(
      color: Colors.transparent,
      child: GlowField(
        controller: _searchCtl,
        focusNode: _searchFocus,
        hint: '搜索美甲风格、美甲师…',
        textInputAction: TextInputAction.search,
        onChanged: (v) => setState(() => _searchQuery = v),
        onSubmitted: (_) => _closeSearch(),
        prefix:
            const Icon(Icons.search_rounded, size: 18, color: ET.inkMuted),
        suffix: _searchQuery.isNotEmpty
            ? GestureDetector(
                onTap: () => setState(() {
                  _searchQuery = '';
                  _searchCtl.clear();
                }),
                child: const Icon(Icons.close_rounded,
                    size: 18, color: ET.inkMuted),
              )
            : null,
      ),
    );
  }

  Widget _headerBelow() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
          SizedBox(
            height: 34,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final cat = _categories[i];
                final active = cat == _activeCategory;
                return GestureDetector(
                  onTap: () => setState(() => _activeCategory = cat),
                  child: Container(
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: active ? ET.cream : Colors.transparent,
                      borderRadius: BorderRadius.circular(ET.rChip),
                      border: Border.all(
                          color: active ? ET.cream : ET.hairline),
                    ),
                    child: Text(cat,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight:
                              active ? FontWeight.w600 : FontWeight.w500,
                          color: active ? ET.onCream : ET.inkSecondary,
                        )),
                  ),
                );
              },
            ),
          ),
        ],
      );
  }

  Widget _buildMasonry(List<Map<String, dynamic>> works, double topPad) {
    final left = <Widget>[];
    final right = <Widget>[];
    for (var i = 0; i < works.length; i++) {
      final card = _buildCard(works[i], i);
      (i % 2 == 0 ? left : right).add(Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: card,
      ));
    }
    return ListView(
      padding: EdgeInsets.fromLTRB(16, topPad + 8, 16, 96),
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: Column(children: left)),
            const SizedBox(width: 12),
            Expanded(child: Column(children: right)),
          ],
        ),
      ],
    );
  }

  Widget _buildCard(Map<String, dynamic> work, int index) {
    final id = work['id'] as int;
    final title = work['title']?.toString();
    final cover = work['coverUrl']?.toString();
    final images = (work['imageUrls'] as List<dynamic>?) ?? const [];
    final imageUrl = (cover != null && cover.isNotEmpty)
        ? cover
        : (images.isNotEmpty ? images.first.toString() : null);
    final tags =
        (work['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
            const [];
    final techName = work['technicianName']?.toString() ?? '';
    final techAvatar = work['technicianAvatarUrl']?.toString();
    final liked = work['isLiked'] as bool? ?? false;
    final likeCount = work['likeCount'] as int? ?? 0;
    final ratio = _aspectPatterns[index % _aspectPatterns.length];

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => ClientWorkDetailScreen(workId: id)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: AspectRatio(
          aspectRatio: ratio,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (imageUrl != null)
                CachedNetworkImage(
                  imageUrl: ossThumb(imageUrl),
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(color: ET.surface),
                  errorWidget: (_, __, ___) => Container(
                    color: ET.surface,
                    child: const Center(
                        child: Text('暂无图片',
                            style: TextStyle(
                                fontSize: 12, color: ET.inkMuted))),
                  ),
                )
              else
                Container(
                  color: ET.surface,
                  child: const Center(
                      child: Text('暂无图片',
                          style: TextStyle(
                              fontSize: 12, color: ET.inkMuted))),
                ),
              // 更克制的覆盖层（2 段）
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
                left: 12,
                right: 12,
                top: 12,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Flexible(child: _techPill(techName, techAvatar)),
                    const SizedBox(width: 8),
                    _likeButton(work, liked, likeCount),
                  ],
                ),
              ),
              Positioned(
                left: 12,
                right: 12,
                bottom: 12,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(title?.isNotEmpty == true ? title! : '美甲作品',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.white)),
                    if (tags.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: tags
                            .take(2)
                            .map((t) => Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.16),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text('#$t',
                                      style: TextStyle(
                                          fontSize: 10,
                                          color:
                                              Colors.white.withOpacity(0.92))),
                                ))
                            .toList(),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(_formatDate(work['createdAt']?.toString()),
                            style: TextStyle(
                                fontSize: 10,
                                color: Colors.white.withOpacity(0.52))),
                        Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(Icons.check_circle,
                              size: 12, color: Colors.white.withOpacity(0.78)),
                          const SizedBox(width: 4),
                          Text('查看详情',
                              style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.white.withOpacity(0.78))),
                        ]),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _techPill(String name, String? avatar) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.32),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (avatar != null && avatar.isNotEmpty)
            ClipOval(
              child: CachedNetworkImage(
                  imageUrl: avatar, width: 18, height: 18, fit: BoxFit.cover),
            )
          else
            Container(
              width: 18,
              height: 18,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2), shape: BoxShape.circle),
              child: Text(name.isNotEmpty ? name.substring(0, 1) : '美',
                  style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: Colors.white)),
            ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _likeButton(Map<String, dynamic> work, bool liked, int likeCount) {
    return GestureDetector(
      onTap: () => _toggleLike(work),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.32),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(liked ? Icons.favorite : Icons.favorite_border,
              size: 14, color: liked ? ET.like : Colors.white),
          const SizedBox(width: 4),
          Text('$likeCount',
              style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: Colors.white)),
        ]),
      ),
    );
  }

  Widget _buildEmptyNoWorks(double topPad) {
    return ListView(
      padding: EdgeInsets.only(top: topPad),
      children: [
        const SizedBox(height: 80),
        Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                        colors: [ET.accentSoft, ET.surface]),
                  ),
                  child: const Icon(Icons.auto_awesome_outlined,
                      color: ET.accent, size: 30),
                ),
                const SizedBox(height: 16),
                const Text('还没有作品可以刷', style: ET.displaySmall),
                const SizedBox(height: 8),
                const Text('绑定你的专属美甲师，即可在这里刷她发布的最新美甲作品，种草、预约一步到位',
                    textAlign: TextAlign.center, style: ET.body),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyCategory(double topPad) {
    return ListView(
      padding: EdgeInsets.only(top: topPad),
      children: const [
        SizedBox(height: 80),
        Center(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 32),
            child: Column(children: [
              Text('该风格暂无作品', style: ET.displaySmall),
              SizedBox(height: 8),
              Text('你的美甲师还没有发布此风格的作品', style: ET.body),
            ]),
          ),
        ),
      ],
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    final d = DateTime.tryParse(dateStr);
    if (d == null) return '';
    return '${d.month}月${d.day}日';
  }
}
