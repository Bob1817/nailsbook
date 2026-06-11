import 'dart:ui' show ImageFilter;
import 'package:flutter/material.dart';

import '../theme/editorial_tokens.dart';

/// 客户端统一固定毛玻璃头部：
/// 标题（左，编辑感衬线）+ 操作区（右，与标题水平对齐），
/// 半透明磨砂背景，内容在其下滚动时透出玻璃效果。
///
/// 用法：放在 Stack 顶部 `Positioned(top/left/right: 0)`，
/// 滚动内容顶部留出 [estimateHeight] 的 padding。
class ClientGlassHeader extends StatelessWidget {
  final String title;
  final List<Widget> actions;

  /// 标题行下方的附加内容（如搜索框、筛选 chip 行）。
  final Widget? below;

  const ClientGlassHeader({
    super.key,
    required this.title,
    this.actions = const [],
    this.below,
  });

  /// 估算头部高度（供滚动内容预留顶部 padding）。
  static double estimateHeight(BuildContext context, {double belowHeight = 0}) {
    final topPad = MediaQuery.of(context).padding.top;
    return topPad + 8 + 44 + 12 + (belowHeight > 0 ? belowHeight + 12 : 0);
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: ET.glassBlur, sigmaY: ET.glassBlur),
        child: Container(
          padding: EdgeInsets.fromLTRB(20, topPad + 8, 20, 12),
          decoration: const BoxDecoration(
            color: ET.glassFill,
            border: Border(bottom: BorderSide(color: ET.hairlineFaint)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                height: 44,
                child: Row(
                  children: [
                    Expanded(
                      child: Text(title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          // 字号对齐美甲师端页面标题（DT.titleLarge = 20），保留衬线
                          style: ET.display.copyWith(
                              fontSize: 20, height: 1.3)),
                    ),
                    ...actions,
                  ],
                ),
              ),
              if (below != null) ...[
                const SizedBox(height: 12),
                below!,
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// 头部右侧的圆形毛玻璃图标按钮（消息/头像等）。
class HeaderCircleButton extends StatelessWidget {
  final Widget child;
  final VoidCallback onTap;
  const HeaderCircleButton({super.key, required this.child, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: ET.surfaceGlass,
          border: Border.all(color: ET.hairline),
        ),
        child: child,
      ),
    );
  }
}
