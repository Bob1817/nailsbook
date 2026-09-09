import 'colors.generated.dart';
import 'package:flutter/material.dart';

import 'editorial_tokens.dart';

/// Design tokens for NailBook — Apple-inspired neutral system + iOS 26 Liquid Glass.
///
/// 设计基调：图片优先的编辑式排版（image-first editorial），界面保持中性，
/// 视觉张力来自美甲作品照片本身。强调色统一为石墨与低饱和蓝灰。
///
/// 实现说明：本次仅替换调色板与材质系统，**保留全部既有 token 名**以兼容现有页面；
/// 颜色由 colors.json 统一生成，既有命名仅作兼容适配。
class DT {
  DT._();

  // ──────────────────────────────────────────────────────────────
  // COLORS - Primary (Neutral action)
  // ──────────────────────────────────────────────────────────────

  static const Color primary = ET.accent;
  static const Color primaryDark = ET.accentDeep;
  // 主操作填充：奶油色 + 深色文字（对比度优于 accent + 白字）
  static const Color cream = ET.cream;
  static const Color onCream = ET.onCream;
  static const Color primaryLight = NBColors.action;
  static const Color primaryPale = NBColors.action;
  static const Color primarySoft = ET.accentSoft;

  // ──────────────────────────────────────────────────────────────
  // COLORS - Secondary (Apple neutral grays)
  // ──────────────────────────────────────────────────────────────

  static const Color secondary = NBColors.muted;
  static const Color secondaryDark = NBColors.secondary;
  static const Color secondaryLight = NBColors.muted;
  static const Color secondarySoft = ET.bgElevated;

  // ──────────────────────────────────────────────────────────────
  // COLORS - Success
  // ──────────────────────────────────────────────────────────────

  static const Color success = NBColors.action; // Neutral success
  static const Color successDark = NBColors.action;
  static const Color successLight = NBColors.action;
  static const Color successSoft = NBColors.page;
  static const Color successBg = NBColors.page;
  static const Color successBorder = NBColors.page;
  static const Color successText = NBColors.action;

  // ──────────────────────────────────────────────────────────────
  // COLORS - Warning
  // ──────────────────────────────────────────────────────────────

  static const Color warning = NBColors.action; // Neutral attention
  static const Color warningDark = NBColors.action;
  static const Color warningLight = NBColors.action;
  static const Color warningSoft = NBColors.page;
  static const Color warningBg = NBColors.page;
  static const Color warningBorder = NBColors.page;
  static const Color warningText = NBColors.action;

  // ──────────────────────────────────────────────────────────────
  // COLORS - Error
  // ──────────────────────────────────────────────────────────────

  static const Color error = NBColors.action; // Neutral error
  static const Color errorDark = NBColors.action;
  static const Color errorLight = NBColors.action;
  static const Color errorSoft = NBColors.page;
  static const Color errorBg = NBColors.page;
  static const Color errorBorder = NBColors.page;
  static const Color errorText = NBColors.action;

  // ──────────────────────────────────────────────────────────────
  // COLORS - Info
  // ──────────────────────────────────────────────────────────────

  static const Color info = NBColors.link;
  static const Color infoDark = NBColors.link;
  static const Color infoLight = NBColors.activeSurface;
  static const Color infoSoft = NBColors.activeSurface;
  static const Color infoBg = NBColors.activeSurface;
  static const Color infoBorder = NBColors.page;
  static const Color infoText = NBColors.link;

  // ──────────────────────────────────────────────────────────────
  // COLORS - Neutral / Text (Apple ink scale)
  // ──────────────────────────────────────────────────────────────

  static const Color textPrimary = ET.ink;
  static const Color textSecondary = ET.inkSecondary;
  static const Color textTertiary = ET.inkMuted;
  static const Color textMuted = ET.inkMuted;
  static const Color textQuaternary = ET.inkFaint;
  static const Color textWhite = Colors.white;
  static const Color textDisabled = ET.inkFaint;

  /// Semantic aliases（指南命名）
  static const Color fg = textPrimary; // foreground / 主文本
  static const Color muted = textSecondary; // 次要文本

  // ──────────────────────────────────────────────────────────────
  // COLORS - Surfaces
  // ──────────────────────────────────────────────────────────────

  static const Color bg = ET.bg;
  static const Color bgWarm = ET.bgElevated;
  static const Color bgPink = ET.bgElevated;
  static const Color surface = ET.surface;
  static const Color surfaceAlt = ET.bgElevated;
  static const Color surfaceDisabled = ET.bgElevated;

  // ──────────────────────────────────────────────────────────────
  // COLORS - Extended (widely used across technician screens)
  // ──────────────────────────────────────────────────────────────

  static const Color borderPink = Color(0x40000000); // 柔和暖玫瑰边缘（输入框等）
  static const Color fillWarm = ET.surface;
  static const Color dividerWarm = Color(0x1F000000); // 暖色分割线
  static const Color borderGrey = Color(0x24000000); // 灰色边框
  static const Color fillGrey = ET.surface;
  static const Color fillGreyLight = ET.surface;
  static const Color textDarkGrey = ET.ink;
  static const Color textMidGrey = ET.inkSecondary;
  static const Color textLightGrey = ET.inkMuted;
  static const Color iconGrey = ET.inkMuted;
  static const Color actionOrange = NBColors.action; // 操作橙色
  static const Color actionGreen = NBColors.action; // 操作绿色
  static const Color actionBlue = NBColors.action; // 操作蓝色
  static const Color avatarBorder = ET.hairline;

  // ──────────────────────────────────────────────────────────────
  // COLORS - Borders (Apple)
  // ──────────────────────────────────────────────────────────────

  static const Color border = ET.hairline;
  static const Color borderStrong = ET.hairlineStrong;
  static const Color borderLight = ET.hairlineFaint;
  static const Color borderPrimary = Color(0x33000000);
  static const Color primaryBorder = Color(0x2E000000);
  static const Color hairline = ET.hairline;
  static const Color divider = ET.hairlineFaint;

  // ──────────────────────────────────────────────────────────────
  // LIQUID GLASS — 材质系统（iOS 26）
  // 用法见 lib/core/widgets/glass_container.dart
  // ──────────────────────────────────────────────────────────────

  /// 背景模糊强度（BackdropFilter sigma）
  static const double glassBlurLight = 12.0;
  static const double glassBlurStandard = 20.0;
  static const double glassBlurHeavy = 40.0;

  /// 玻璃饱和度参考值（如做 saturation overlay 时使用）
  static const double glassSaturation = 1.8;

  /// 玻璃填充色（白底不同不透明度）
  static const Color glassLight = Color(0x80FFFFFF); // 50% white
  static const Color glassStandard = Color(0xB8FFFFFF); // 72% white
  static const Color glassHeavy = Color(0xE0FFFFFF); // 88% white

  /// 玻璃描边（高光边）
  static const Color glassBorder = Color(0x66FFFFFF); // 40% white

  /// 暗色玻璃（用于深色覆盖层 / 图片之上的 pill）
  static const Color glassDark = Color(0x52000000); // ~32% black

  // ──────────────────────────────────────────────────────────────
  // COLORS - Status specific
  // ──────────────────────────────────────────────────────────────

  static const Color statusBlue = NBColors.link;
  static const Color statusBlueBg = NBColors.activeSurface;
  static const Color statusCompleted = NBColors.muted;
  static const Color statusCompletedBg = NBColors.page;

  // ──────────────────────────────────────────────────────────────
  // COLORS - Quick action backgrounds（中性化）
  // ──────────────────────────────────────────────────────────────

  static const Color orange50 = ET.surface;
  static const Color purple50 = ET.surface;
  static const Color blue50 = ET.surface;
  static const Color green50 = ET.surface;
  static const Color pink50 = ET.accentSoft;
  static const Color disabledBg = ET.surface;
  static const Color iconPlaceholder = NBColors.control;

  // ──────────────────────────────────────────────────────────────
  // GRADIENTS（去粉化：强调色用暖玫瑰单色，页面底用中性灰）
  // ──────────────────────────────────────────────────────────────

  static const LinearGradient primaryGradient = LinearGradient(
    colors: [ET.accent, ET.accentDeep],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient heroGradient = LinearGradient(
    colors: [ET.accent, ET.accentDeep],
    begin: Alignment(0.7, -1.0),
    end: Alignment(-0.7, 1.0),
  );

  /// 个人页头部：深色 sophisticated 渐变（替换原粉色）
  static const LinearGradient profileGradient = LinearGradient(
    colors: [NBColors.ink, NBColors.secondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient bookingGradient = LinearGradient(
    colors: [ET.accent, ET.accentDeep],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// 图片之上的暗部覆盖层（中性黑，用于叠字）
  static const LinearGradient heroOverlay = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Colors.transparent,
      Color(0x29000000),
      Color(0x80000000),
      Color(0xCC000000)
    ],
  );

  static const LinearGradient screenGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [ET.bgElevated, ET.bg, ET.bg],
    stops: [0.0, 0.24, 1.0],
  );

  static const LinearGradient profilePageGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [ET.bgElevated, ET.bg, ET.bg],
    stops: [0.0, 0.48, 1.0],
  );

  // ──────────────────────────────────────────────────────────────
  // SPACING - 4pt grid system (iOS HIG compliant)
  // ──────────────────────────────────────────────────────────────

  static const double space4 = 4;
  static const double space8 = 8;
  static const double space12 = 12;
  static const double space16 = 16;
  static const double space20 = 20; // Standard page margin
  static const double space24 = 24;
  static const double space32 = 32;
  static const double space40 = 40;
  static const double space48 = 48;

  // Semantic aliases
  static const double xs = space4;
  static const double sm = space8;
  static const double md = space12;
  static const double lg = space16;
  static const double xl = space20;
  static const double xxl = space24;
  static const double xxxl = space32;

  // ──────────────────────────────────────────────────────────────
  // RADIUS
  // ──────────────────────────────────────────────────────────────

  static const double radius8 = 8;
  static const double radius12 = 12;
  static const double radius14 = 14; // inputs
  static const double radius16 = 16;
  static const double radius24 = 24;

  // Legacy aliases
  static const double rSm = radius8;
  static const double rMd = radius12;
  static const double rInput = radius14; // 输入框
  static const double rLg = radius16;
  static const double rXl = 20;
  static const double rXxl = radius24;
  static const double rCard = 28;
  static const double rHero = 32;
  static const double rFull = 999;
  static const double rCapsule = 999; // 胶囊（主操作）

  // ──────────────────────────────────────────────────────────────
  // TYPOGRAPHY - Font Sizes
  // ──────────────────────────────────────────────────────────────

  static const double textXs = 11;
  static const double textSm = 13;
  static const double textBase = 15;
  static const double textMd = 16;
  static const double textLg = 18;
  static const double textXl = 20;
  static const double text2xl = 24;
  static const double text3xl = 28;

  // ──────────────────────────────────────────────────────────────
  // TYPOGRAPHY - Text Styles (Semantic) — SF Pro 风格，标题用紧负字距
  // ──────────────────────────────────────────────────────────────

  static const TextStyle displayLarge = TextStyle(
    fontSize: 34,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.8,
    height: 1.15,
    color: textPrimary,
  );

  static const TextStyle displayMedium = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.6,
    height: 1.2,
    color: textPrimary,
  );

  static const TextStyle displaySmall = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.4,
    height: 1.25,
    color: textPrimary,
  );

  static const TextStyle titleLarge = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.3,
    height: 1.35,
    color: textPrimary,
  );

  static const TextStyle titleMedium = TextStyle(
    fontSize: 17,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    height: 1.4,
    color: textPrimary,
  );

  static const TextStyle titleSmall = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.1,
    height: 1.4,
    color: textPrimary,
  );

  static const TextStyle bodyLarge = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 1.5,
    color: textPrimary,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 1.5,
    color: textPrimary,
  );

  static const TextStyle bodySmall = TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    height: 1.5,
    color: textSecondary,
  );

  static const TextStyle captionLarge = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    height: 1.4,
    color: textTertiary,
  );

  static const TextStyle captionMedium = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w400,
    height: 1.4,
    color: textMuted,
  );

  static const TextStyle captionSmall = TextStyle(
    fontSize: 10,
    fontWeight: FontWeight.w400,
    height: 1.4,
    color: textMuted,
  );

  // ──────────────────────────────────────────────────────────────
  // SHADOWS — 柔和深度：用扩散阴影承载层级，减少硬边框依赖
  // ──────────────────────────────────────────────────────────────

  static List<BoxShadow> get shadowSm => const [
        BoxShadow(
            color: Color(0x0A000000), blurRadius: 18, offset: Offset(0, 8)),
      ];

  static List<BoxShadow> get shadowMd => const [
        BoxShadow(
            color: Color(0x0F000000), blurRadius: 36, offset: Offset(0, 16)),
      ];

  static List<BoxShadow> get shadowLg => const [
        BoxShadow(
            color: Color(0x14000000), blurRadius: 56, offset: Offset(0, 24)),
      ];

  static List<BoxShadow> get shadowPrimary => const [
        BoxShadow(
            color: Color(0x24000000), blurRadius: 34, offset: Offset(0, 16)),
      ];

  static List<BoxShadow> get shadowCard => const [
        BoxShadow(
            color: Color(0x0F000000), blurRadius: 38, offset: Offset(0, 18)),
      ];

  static List<BoxShadow> get shadowHero => const [
        BoxShadow(
            color: Color(0x1A1D1D1F), blurRadius: 48, offset: Offset(0, 22)),
      ];

  static List<BoxShadow> get shadowHeroSm => const [
        BoxShadow(
            color: Color(0x141D1D1F), blurRadius: 36, offset: Offset(0, 16)),
      ];

  static List<BoxShadow> get shadowButton => const [
        BoxShadow(
            color: Color(0x20000000), blurRadius: 18, offset: Offset(0, 8)),
      ];

  static List<BoxShadow> get shadowButtonLg => const [
        BoxShadow(
            color: Color(0x24000000), blurRadius: 28, offset: Offset(0, 14)),
      ];

  static List<BoxShadow> get shadowButtonOutline => const [
        BoxShadow(
            color: Color(0x14000000), blurRadius: 16, offset: Offset(0, 8)),
      ];

  static List<BoxShadow> get shadowTile => const [
        BoxShadow(
            color: Color(0x0A000000), blurRadius: 28, offset: Offset(0, 12)),
      ];

  static List<BoxShadow> get shadowTileLg => const [
        BoxShadow(
            color: Color(0x0D000000), blurRadius: 34, offset: Offset(0, 16)),
      ];

  // ──────────────────────────────────────────────────────────────
  // BORDER RADIUS HELPERS
  // ──────────────────────────────────────────────────────────────

  static BorderRadius get borderRadius8 => BorderRadius.circular(radius8);
  static BorderRadius get borderRadius12 => BorderRadius.circular(radius12);
  static BorderRadius get borderRadius14 => BorderRadius.circular(radius14);
  static BorderRadius get borderRadius16 => BorderRadius.circular(radius16);
  static BorderRadius get borderRadius24 => BorderRadius.circular(radius24);
  static BorderRadius get borderRadiusCard => BorderRadius.circular(rCard);
  static BorderRadius get borderRadiusFull => BorderRadius.circular(rFull);
  static BorderRadius get borderRadiusCapsule =>
      BorderRadius.circular(rCapsule);

  // ──────────────────────────────────────────────────────────────
  // EDGE INSETS HELPERS
  // ──────────────────────────────────────────────────────────────

  static const EdgeInsets padding4 = EdgeInsets.all(space4);
  static const EdgeInsets padding8 = EdgeInsets.all(space8);
  static const EdgeInsets padding12 = EdgeInsets.all(space12);
  static const EdgeInsets padding16 = EdgeInsets.all(space16);
  static const EdgeInsets padding24 = EdgeInsets.all(space24);
  static const EdgeInsets padding32 = EdgeInsets.all(space32);

  static const EdgeInsets paddingHorizontal4 =
      EdgeInsets.symmetric(horizontal: space4);
  static const EdgeInsets paddingHorizontal8 =
      EdgeInsets.symmetric(horizontal: space8);
  static const EdgeInsets paddingHorizontal12 =
      EdgeInsets.symmetric(horizontal: space12);
  static const EdgeInsets paddingHorizontal16 =
      EdgeInsets.symmetric(horizontal: space16);
  static const EdgeInsets paddingHorizontal24 =
      EdgeInsets.symmetric(horizontal: space24);

  static const EdgeInsets paddingVertical4 =
      EdgeInsets.symmetric(vertical: space4);
  static const EdgeInsets paddingVertical8 =
      EdgeInsets.symmetric(vertical: space8);
  static const EdgeInsets paddingVertical12 =
      EdgeInsets.symmetric(vertical: space12);
  static const EdgeInsets paddingVertical16 =
      EdgeInsets.symmetric(vertical: space16);
  static const EdgeInsets paddingVertical24 =
      EdgeInsets.symmetric(vertical: space24);

  // ──────────────────────────────────────────────────────────────
  // ORDER STATUS COLORS - Unified mapping (iOS HIG compliant)
  // ──────────────────────────────────────────────────────────────

  static const Color statusPendingQuoteBg = NBColors.page;
  static const Color statusPendingQuoteText = NBColors.action;

  static const Color statusPendingAgreeBg = NBColors.page;
  static const Color statusPendingAgreeText = NBColors.action;

  static const Color statusPendingConfirmBg = NBColors.page;
  static const Color statusPendingConfirmText = NBColors.action;

  static const Color statusPendingHomeBg = NBColors.page;
  static const Color statusPendingHomeText = NBColors.action;

  static const Color statusPendingShopBg = NBColors.page;
  static const Color statusPendingShopText = NBColors.action;

  static const Color statusInProgressBg = NBColors.page;
  static const Color statusInProgressText = NBColors.action;

  static const Color statusCompletedText = NBColors.muted;

  static const Color statusCancelledBg = NBColors.page;
  static const Color statusCancelledText = NBColors.action;

  // ──────────────────────────────────────────────────────────────
  // MONOSPACE / TABULAR FIGURES - For numbers, prices, times
  // 使用 tabularFigures 而非独立字体，确保 iOS 原生渲染
  // ──────────────────────────────────────────────────────────────

  static const TextStyle monospace = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    fontFeatures: [FontFeature.tabularFigures()],
    height: 1.4,
    color: textPrimary,
  );

  static const TextStyle monospaceLarge = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.bold,
    fontFeatures: [FontFeature.tabularFigures()],
    height: 1.2,
    letterSpacing: -0.5,
    color: textPrimary,
  );

  static const TextStyle monospaceDisplay = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    fontFeatures: [FontFeature.tabularFigures()],
    height: 1.15,
    letterSpacing: -0.6,
    color: textPrimary,
  );
}
