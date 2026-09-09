import 'package:flutter/material.dart';
import 'colors.generated.dart';

/// Existing editorial layout API, adapted to COLOR-STANDARD.md neutral light surfaces.
class ET {
  ET._();

  // ── Surfaces（中性浅色层级）──
  static const Color bg = NBColors.page;
  static const Color bgElevated = NBColors.page;
  static const Color surface = NBColors.surface;
  static const Color surfaceGlass = NBColors.surface;
  static const Color overlay = Color(0xCC000000); // 图片暗部覆盖

  // ── Cream（主操作兼容接口）──
  static const Color cream = NBColors.action;
  static const Color creamDim = NBColors.actionPressed;
  static const Color onCream = NBColors.inverse;

  // ── Text（文字层级）──
  static const Color ink = NBColors.ink;
  static const Color inkSecondary = NBColors.secondary;
  static const Color inkMuted = NBColors.muted;
  static const Color inkFaint = NBColors.muted;

  // ── Accent（石墨与蓝灰）──
  static const Color accent = NBColors.action;
  static const Color accentDeep = NBColors.action;
  static const Color accentSoft = NBColors.page;
  static const Color accentOnDark = NBColors.link;

  // ── 统一玻璃标准（以发现页顶栏为基准，全端玻璃面统一）──
  /// BackdropFilter 模糊半径。
  static const double glassBlur = 30;
  /// 玻璃填充：白色表面 @ ~96%（直接用于 BackdropFilter 之上的 Container）。
  static const Color glassFill = NBColors.surface;
  /// 给 GlassContainer 用的等价参数（tint + opacity）。
  static const Color glassTint = bg; // neutral page
  static const double glassOpacity = 0.96;

  // ── Lines / hairlines（中性描边）──
  static const Color hairline = NBColors.line;
  static const Color hairlineStrong = NBColors.control;
  static const Color hairlineFaint = NBColors.line;

  // ── States ──
  static const Color like = NBColors.ink;
  static const Color success = NBColors.ink;

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
