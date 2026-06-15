import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

/// 图片全屏预览：左右翻页 + 双指缩放 + 点击关闭。
class FullscreenGallery extends StatefulWidget {
  final List<String> images;
  final int initialIndex;
  const FullscreenGallery(
      {super.key, required this.images, this.initialIndex = 0});

  @override
  State<FullscreenGallery> createState() => _FullscreenGalleryState();
}

class _FullscreenGalleryState extends State<FullscreenGallery> {
  late final PageController _ctl =
      PageController(initialPage: widget.initialIndex);
  late int _index = widget.initialIndex;

  @override
  void dispose() {
    _ctl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          PageView.builder(
            controller: _ctl,
            itemCount: widget.images.length,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (_, i) => GestureDetector(
              onTap: () => Navigator.pop(context),
              child: InteractiveViewer(
                minScale: 1,
                maxScale: 4,
                child: Center(
                  child: CachedNetworkImage(
                    imageUrl: widget.images[i],
                    fit: BoxFit.contain,
                    placeholder: (_, __) => const Center(
                        child: CircularProgressIndicator(color: Colors.white)),
                    errorWidget: (_, __, ___) => const Icon(
                        Icons.image_not_supported,
                        color: Colors.white24,
                        size: 48),
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: 16,
            top: topPad + 8,
            child: GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    shape: BoxShape.circle),
                child: const Icon(Icons.close_rounded,
                    color: Colors.white, size: 22),
              ),
            ),
          ),
          if (widget.images.length > 1)
            Positioned(
              bottom: MediaQuery.of(context).padding.bottom + 20,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(999)),
                  child: Text('${_index + 1} / ${widget.images.length}',
                      style:
                          const TextStyle(color: Colors.white, fontSize: 13)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// 以半透明黑底全屏弹出图片画廊。
void openFullscreenGallery(
    BuildContext context, List<String> images, int index) {
  if (images.isEmpty) return;
  Navigator.push(
    context,
    PageRouteBuilder(
      opaque: false,
      barrierColor: Colors.black,
      pageBuilder: (_, __, ___) =>
          FullscreenGallery(images: images, initialIndex: index),
    ),
  );
}
