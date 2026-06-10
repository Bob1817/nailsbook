import 'package:flutter/material.dart';

/// Editorial Tokens (ET) — 暖调深色编辑风设计令牌。
///
/// 设计基调：暖黑底 + 大地暖棕（caramel / bronze）强调 + 奶油浮层卡 +
/// 编辑感衬线标题（iOS 内置 Songti SC 宋体），图片优先的瀑布流。
/// 参考：Nailtastic Studio 风格稿。
///
/// 迁移说明：这是项目正在切换的**新设计方向**（替换原 Apple 浅色 liquid glass）。
/// 当前阶段先以本套令牌完成「客户端发现页」样板验证，确认后再把全局 DT
/// 切到这套值并逐屏迁移。新页面请优先使用 ET。
class ET {
  ET._();

  // ── Surfaces（暖黑层级）──
  static const Color bg = Color(0xFF16120E); // 页面底：暖近黑
  static const Color bgElevated = Color(0xFF211C17); // 抬升底（区块）
  static const Color surface = Color(0xFF2A241E); // 卡片表面
  static const Color surfaceGlass = Color(0x14FFFFFF); // 暗底玻璃填充 ~8%
  static const Color overlay = Color(0xCC000000); // 图片暗部覆盖

  // ── Cream（奶油浮层卡 / 主操作）──
  static const Color cream = Color(0xFFEDE5D8);
  static const Color creamDim = Color(0xFFDED4C3);
  static const Color onCream = Color(0xFF2A241E); // 奶油卡上的深色文字

  // ── Text（暖白阶）──
  static const Color ink = Color(0xFFF3ECE1); // 主文本
  static const Color inkSecondary = Color(0xFFB7AC9B); // 次要文本
  static const Color inkMuted = Color(0xFF8B8073); // 弱化文本/占位
  static const Color inkFaint = Color(0xFF635B50); // 极弱

  // ── Accent（大地暖棕 / 焦糖）──
  static const Color accent = Color(0xFFC9A57C); // 主强调：caramel/bronze
  static const Color accentDeep = Color(0xFFA8855C);
  static const Color accentSoft = Color(0xFF3A2F23); // 暖棕浅染暗填充
  static const Color accentOnDark = Color(0xFFE6C9A3); // 暗底上的高光暖棕

  // ── Lines / hairlines（暖白描边）──
  static const Color hairline = Color(0x1FFFFFFF); // ~12% white
  static const Color hairlineStrong = Color(0x33FFFFFF); // ~20% white
  static const Color hairlineFaint = Color(0x14FFFFFF); // ~8% white

  // ── States ──
  static const Color like = Color(0xFFE08A7B); // 收藏/喜欢（暖珊瑚）
  static const Color success = Color(0xFF8FB98A);

  // ── Radius ──
  static const double rChip = 999;
  static const double rCard = 22;
  static const double rTile = 18;
  static const double rField = 16;

  // ── Spacing（沿用 4pt grid）──
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;

  // ── Typography ──
  /// 编辑感衬线（iOS 内置宋体；Latin 回退 Georgia）。用于大标题。
  static const String serif = 'Songti SC';
  static const List<String> serifFallback = ['Georgia', 'serif'];

  static const TextStyle display = TextStyle(
    fontFamily: serif,
    fontFamilyFallback: serifFallback,
    fontSize: 32,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.2,
    height: 1.12,
    color: ink,
  );

  static const TextStyle displaySmall = TextStyle(
    fontFamily: serif,
    fontFamilyFallback: serifFallback,
    fontSize: 24,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.2,
    height: 1.2,
    color: ink,
  );

  static const TextStyle title = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.1,
    height: 1.4,
    color: ink,
  );

  static const TextStyle body = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 1.5,
    color: inkSecondary,
  );

  static const TextStyle caption = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    height: 1.4,
    color: inkMuted,
  );

  static const TextStyle label = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    height: 1.3,
    color: inkSecondary,
  );

  // ── Shadows（深色下用更深的扩散影）──
  static List<BoxShadow> get shadowCard => const [
        BoxShadow(
            color: Color(0x66000000), blurRadius: 28, offset: Offset(0, 14)),
      ];

  static List<BoxShadow> get shadowTile => const [
        BoxShadow(
            color: Color(0x4D000000), blurRadius: 18, offset: Offset(0, 8)),
      ];
}
