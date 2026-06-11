import 'glass_container.dart';

/// 美甲师端统一固定玻璃标题栏。
///
/// 放在 Stack 顶部，滚动内容按 [estimateHeight] 预留顶部空间。
class TechnicianGlassHeader extends StatelessWidget {
  final String title;
  final List<Widget> actions;
  final Widget? below;

  const TechnicianGlassHeader({
    super.key,
    required this.title,
    this.actions = const [],
    this.below,
  });

  static double estimateHeight(BuildContext context, {double belowHeight = 0}) {
    final topPad = MediaQuery.of(context).padding.top;
    return topPad +
        DT.sm +
        44 +
        DT.md +
        (belowHeight > 0 ? belowHeight + DT.md : 0);
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    return GlassContainer(
      tint: Colors.black,
      blur: DT.glassBlurHeavy,
      opacity: 0.48,
      borderRadius: 0,
      showBorder: false,
      padding: EdgeInsets.fromLTRB(DT.xl, topPad + DT.sm, DT.xl, DT.md),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 44,
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    title,
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
            const SizedBox(height: DT.md),
            below!,
          ],
        ],
      ),
    );
  }
}
