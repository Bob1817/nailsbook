import 'glass_container.dart';

/// 美甲师端统一固定玻璃标题栏。
///
/// 放在 Stack 顶部，滚动内容按 [estimateHeight] 预留顶部空间。
class TechnicianGlassHeader extends StatelessWidget {
  final String? title;
  final List<Widget> actions;
  final Widget? below;

  const TechnicianGlassHeader({
    super.key,
    this.title,
    this.actions = const [],
    this.below,
  });

  static const Color glassTint = TechnicianGlassStyle.tint;
  static const double glassBlur = TechnicianGlassStyle.blur;
  static const double glassOpacity = TechnicianGlassStyle.opacity;

  static double estimateHeight(
    BuildContext context, {
    double belowHeight = 0,
    bool hasTitle = true,
  }) {
    final topPad = MediaQuery.of(context).padding.top;
    return topPad +
        DT.sm +
        (hasTitle ? 44 : 0) +
        (hasTitle && belowHeight > 0 ? DT.md : 0) +
        (belowHeight > 0 ? belowHeight + DT.md : 0);
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    return GlassContainer(
      tint: glassTint,
      blur: glassBlur,
      opacity: glassOpacity,
      borderRadius: 0,
      showBorder: false,
      padding: EdgeInsets.fromLTRB(DT.xl, topPad + DT.sm, DT.xl, DT.md),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null)
            SizedBox(
              height: 44,
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      title!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: DT.titleLarge,
                    ),
                  ),
                  ...actions,
                ],
              ),
            ),
          if (below != null) ...[
            if (title != null) const SizedBox(height: DT.md),
            below!,
          ],
        ],
      ),
    );
  }
}
