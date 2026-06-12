import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/theme/editorial_tokens.dart';

/// 作品标准视图：与发现页一致的双列瀑布流卡片（封面 + 美甲师胶囊 + 点赞 + 标题/标签/日期）。
/// 收藏页 / 点赞页 / 发现页统一复用。
const _aspectPatterns = [4 / 5, 3 / 4, 5 / 6, 2 / 3];

String formatWorkDate(String? dateStr) {
  if (dateStr == null || dateStr.isEmpty) return '';
  final d = DateTime.tryParse(dateStr);
  if (d == null) return '';
  return '${d.month}月${d.day}日';
}

/// 双列瀑布流容器（可滚动）。[header] 作为列表首项（如页面标题）。
class WorkMasonryGrid extends StatelessWidget {
  final List<Map<String, dynamic>> works;
  final void Function(Map<String, dynamic> work) onTapWork;
  final void Function(Map<String, dynamic> work) onToggleLike;
  final Widget? header;
  final EdgeInsets padding;
  final Future<void> Function()? onRefresh;

  const WorkMasonryGrid({
    super.key,
    required this.works,
    required this.onTapWork,
    required this.onToggleLike,
    this.header,
    this.padding = const EdgeInsets.fromLTRB(16, 16, 16, 96),
    this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final left = <Widget>[];
    final right = <Widget>[];
    for (var i = 0; i < works.length; i++) {
      final card = WorkCard(
        work: works[i],
        index: i,
        onTap: () => onTapWork(works[i]),
        onToggleLike: () => onToggleLike(works[i]),
      );
      (i % 2 == 0 ? left : right).add(Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: card,
      ));
    }
    final list = ListView(
      padding: padding,
      children: [
        if (header != null) header!,
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
    if (onRefresh == null) return list;
    return RefreshIndicator(color: ET.accent, onRefresh: onRefresh!, child: list);
  }
}

class WorkCard extends StatelessWidget {
  final Map<String, dynamic> work;
  final int index;
  final VoidCallback onTap;
  final VoidCallback onToggleLike;

  const WorkCard({
    super.key,
    required this.work,
    required this.index,
    required this.onTap,
    required this.onToggleLike,
  });

  @override
  Widget build(BuildContext context) {
    final title = work['title']?.toString();
    final cover = work['coverUrl']?.toString();
    final images = (work['imageUrls'] as List<dynamic>?) ?? const [];
    final imageUrl = (cover != null && cover.isNotEmpty)
        ? cover
        : (images.isNotEmpty ? images.first.toString() : null);
    final tags = (work['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [];
    final techName = work['technicianName']?.toString() ?? '';
    final techAvatar = work['technicianAvatarUrl']?.toString();
    final liked = work['isLiked'] as bool? ?? false;
    final likeCount = work['likeCount'] as int? ?? 0;
    final ratio = _aspectPatterns[index % _aspectPatterns.length];

    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: AspectRatio(
          aspectRatio: ratio,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (imageUrl != null)
                CachedNetworkImage(
                  imageUrl: imageUrl,
                  fit: BoxFit.cover,
                  // 按显示尺寸降采样解码，加快加载、降低内存、滚动更顺滑
                  memCacheWidth: 600,
                  maxWidthDiskCache: 900,
                  fadeInDuration: const Duration(milliseconds: 150),
                  placeholder: (_, __) => Container(color: ET.surface),
                  errorWidget: (_, __, ___) => Container(
                    color: ET.surface,
                    child: const Center(child: Text('暂无图片', style: TextStyle(fontSize: 12, color: ET.inkMuted))),
                  ),
                )
              else
                Container(
                  color: ET.surface,
                  child: const Center(child: Text('暂无图片', style: TextStyle(fontSize: 12, color: ET.inkMuted))),
                ),
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.transparent, Color(0x12000000), Color(0xAB000000)],
                    stops: [0.42, 0.62, 1.0],
                  ),
                ),
              ),
              Positioned(
                left: 12, right: 12, top: 12,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Flexible(child: _techPill(techName, techAvatar)),
                    const SizedBox(width: 8),
                    _likeButton(liked, likeCount),
                  ],
                ),
              ),
              Positioned(
                left: 12, right: 12, bottom: 12,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(title?.isNotEmpty == true ? title! : '美甲作品',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
                    if (tags.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6, runSpacing: 6,
                        children: tags.take(2).map((t) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.16),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text('#$t', style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.92))),
                        )).toList(),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(formatWorkDate(work['createdAt']?.toString()),
                            style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.52))),
                        Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(Icons.check_circle, size: 12, color: Colors.white.withOpacity(0.78)),
                          const SizedBox(width: 4),
                          Text('查看详情', style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.78))),
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
      decoration: BoxDecoration(color: Colors.black.withOpacity(0.32), borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (avatar != null && avatar.isNotEmpty)
            ClipOval(child: CachedNetworkImage(imageUrl: avatar, width: 18, height: 18, fit: BoxFit.cover, memCacheWidth: 60))
          else
            Container(
              width: 18, height: 18,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), shape: BoxShape.circle),
              child: Text(name.isNotEmpty ? name.substring(0, 1) : '美',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.white)),
            ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _likeButton(bool liked, int likeCount) {
    return GestureDetector(
      onTap: onToggleLike,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(color: Colors.black.withOpacity(0.32), borderRadius: BorderRadius.circular(999)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(liked ? Icons.favorite : Icons.favorite_border, size: 14, color: liked ? ET.like : Colors.white),
          const SizedBox(width: 4),
          Text('$likeCount', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Colors.white)),
        ]),
      ),
    );
  }
}
