import 'package:flutter/material.dart';

/// Design tokens for NailArt Studio - Airbnb-style design system
class DT {
  DT._();

  // ──────────────────────────────────────────────────────────────
  // COLORS - Primary
  // ──────────────────────────────────────────────────────────────

  static const Color primary = Color(0xFFFF6B8A);
  static const Color primaryDark = Color(0xFFE00B41);
  static const Color primaryLight = Color(0xFFFF88A0);
  static const Color primaryPale = Color(0xFFFFB0BE);
  static const Color primarySoft = Color(0xFFFFF0F5);

  // ──────────────────────────────────────────────────────────────
  // COLORS - Secondary
  // ──────────────────────────────────────────────────────────────

  static const Color secondary = Color(0xFF6B7280);
  static const Color secondaryDark = Color(0xFF4B5563);
  static const Color secondaryLight = Color(0xFF9CA3AF);
  static const Color secondarySoft = Color(0xFFF3F4F6);

  // ──────────────────────────────────────────────────────────────
  // COLORS - Success
  // ──────────────────────────────────────────────────────────────

  static const Color success = Color(0xFF31B46C);
  static const Color successDark = Color(0xFF059669);
  static const Color successLight = Color(0xFF6EE7B7);
  static const Color successSoft = Color(0xFFEEF9F1);
  static const Color successBg = Color(0xFFF0FDF4);
  static const Color successBorder = Color(0xFFBBF7D0);
  static const Color successText = Color(0xFF059669);

  // ──────────────────────────────────────────────────────────────
  // COLORS - Warning
  // ──────────────────────────────────────────────────────────────

  static const Color warning = Color(0xFFFFA500);
  static const Color warningDark = Color(0xFFD97706);
  static const Color warningLight = Color(0xFFFCD34D);
  static const Color warningSoft = Color(0xFFFFF1E5);
  static const Color warningBg = Color(0xFFFFF7ED);
  static const Color warningBorder = Color(0xFFFEF3C7);
  static const Color warningText = Color(0xFFD97706);

  // ──────────────────────────────────────────────────────────────
  // COLORS - Error
  // ──────────────────────────────────────────────────────────────

  static const Color error = Color(0xFFFF4962);
  static const Color errorDark = Color(0xFFDC2626);
  static const Color errorLight = Color(0xFFFCA5A5);
  static const Color errorSoft = Color(0xFFFEF2F2);
  static const Color errorBg = Color(0xFFFEF2F2);
  static const Color errorBorder = Color(0xFFFECACA);
  static const Color errorText = Color(0xFFDC2626);

  // ──────────────────────────────────────────────────────────────
  // COLORS - Info
  // ──────────────────────────────────────────────────────────────

  static const Color info = Color(0xFF428BFF);
  static const Color infoDark = Color(0xFF2563EB);
  static const Color infoLight = Color(0xFF93C5FD);
  static const Color infoSoft = Color(0xFFEDF3FF);
  static const Color infoBg = Color(0xFFEFF6FF);
  static const Color infoBorder = Color(0xFFBFDBFE);
  static const Color infoText = Color(0xFF2563EB);

  // ──────────────────────────────────────────────────────────────
  // COLORS - Neutral / Text
  // ──────────────────────────────────────────────────────────────

  static const Color textPrimary = Color(0xFF1F2230);
  static const Color textSecondary = Color(0xFF6A6A6A);
  static const Color textTertiary = Color(0xFF8D8590);
  static const Color textMuted = Color(0xFF929292);
  static const Color textQuaternary = Color(0xFFC9BEC6);
  static const Color textWhite = Colors.white;
  static const Color textDisabled = Color(0xFFD1D5DB);

  // ──────────────────────────────────────────────────────────────
  // COLORS - Surfaces
  // ──────────────────────────────────────────────────────────────

  static const Color bg = Color(0xFFF8F9FC);
  static const Color bgWarm = Color(0xFFFFF9F8);
  static const Color bgPink = Color(0xFFFFFDFD);
  static const Color surface = Colors.white;
  static const Color surfaceAlt = Color(0xFFF7F7F7);
  static const Color surfaceDisabled = Color(0xFFF9FAFB);

  // ──────────────────────────────────────────────────────────────
  // COLORS - Borders
  // ──────────────────────────────────────────────────────────────

  static const Color border = Color(0xFFE5E7EB);
  static const Color borderLight = Color(0xFFF2E6EC);
  static const Color borderPrimary = Color(0xFFF2D5DE);
  static const Color primaryBorder = Color(0xFFFFD9E6);
  static const Color hairline = Color(0xFFE2E8F0);
  static const Color divider = Color(0xFFF2F0F3);

  // ──────────────────────────────────────────────────────────────
  // COLORS - Status specific
  // ──────────────────────────────────────────────────────────────

  static const Color statusBlue = Color(0xFF3B82F6);
  static const Color statusBlueBg = Color(0xFFEBF4FF);
  static const Color statusCompleted = Color(0xFF8A8F98);
  static const Color statusCompletedBg = Color(0xFFF4F5F7);

  // ──────────────────────────────────────────────────────────────
  // COLORS - Quick action backgrounds
  // ──────────────────────────────────────────────────────────────

  static const Color orange50 = Color(0xFFFFF7FA);
  static const Color purple50 = Color(0xFFF7F1FF);
  static const Color blue50 = Color(0xFFF0F7FF);
  static const Color green50 = Color(0xFFEEFAF4);
  static const Color pink50 = Color(0xFFFFF7FA);
  static const Color disabledBg = Color(0xFFE8E8E8);
  static const Color iconPlaceholder = Color(0xFFD1A1B3);

  // ──────────────────────────────────────────────────────────────
  // GRADIENTS
  // ──────────────────────────────────────────────────────────────

  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFFF6B8A), Color(0xFFFF8FA3)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient heroGradient = LinearGradient(
    colors: [Color(0xFFFF6FA2), Color(0xFFFF6B9B), Color(0xFFFF81A4), Color(0xFFFFB387)],
    begin: Alignment(0.7, -1.0),
    end: Alignment(-0.7, 1.0),
  );

  static const LinearGradient profileGradient = LinearGradient(
    colors: [Color(0xFFFF8AA0), Color(0xFFFF9AB0), Color(0xFFFFC8B2)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient bookingGradient = LinearGradient(
    colors: [Color(0xFFFF6B8A), Color(0xFFFF7C98), Color(0xFFFF8FA3)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient heroOverlay = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Colors.transparent, Color(0x33070A14), Color(0x80070A14), Color(0xD1070A14)],
  );

  static const LinearGradient screenGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFFFF8FA), Color(0xFFF8F9FC), Color(0xFFF5F6F8)],
    stops: [0.0, 0.24, 1.0],
  );

  static const LinearGradient profilePageGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFFFFDFD), Color(0xFFF7F3F6), Color(0xFFF2F6FB)],
    stops: [0.0, 0.48, 1.0],
  );

  // ──────────────────────────────────────────────────────────────
  // SPACING - 4pt grid system (iOS HIG compliant)
  // ──────────────────────────────────────────────────────────────

  static const double space4 = 4;
  static const double space8 = 8;
  static const double space12 = 12;
  static const double space16 = 16;
  static const double space20 = 20;  // Standard page margin
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
  static const double radius16 = 16;
  static const double radius24 = 24;

  // Legacy aliases
  static const double rSm = radius8;
  static const double rMd = radius12;
  static const double rLg = radius16;
  static const double rXl = 20;
  static const double rXxl = radius24;
  static const double rCard = 28;
  static const double rHero = 32;
  static const double rFull = 999;

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
  // TYPOGRAPHY - Text Styles (Semantic)
  // ──────────────────────────────────────────────────────────────

  static const TextStyle displayLarge = TextStyle(
    fontSize: 34,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.5,
    height: 1.2,
    color: textPrimary,
  );

  static const TextStyle displayMedium = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.5,
    height: 1.2,
    color: textPrimary,
  );

  static const TextStyle displaySmall = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.3,
    height: 1.3,
    color: textPrimary,
  );

  static const TextStyle titleLarge = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    height: 1.4,
    color: textPrimary,
  );

  static const TextStyle titleMedium = TextStyle(
    fontSize: 17,
    fontWeight: FontWeight.w600,
    height: 1.4,
    color: textPrimary,
  );

  static const TextStyle titleSmall = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w600,
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
  // SHADOWS
  // ──────────────────────────────────────────────────────────────

  static List<BoxShadow> get shadowSm => [
    BoxShadow(color: const Color(0x0D0F172A), blurRadius: 12, offset: const Offset(0, 4)),
  ];

  static List<BoxShadow> get shadowMd => [
    BoxShadow(color: const Color(0x140F172A), blurRadius: 32, offset: const Offset(0, 12)),
  ];

  static List<BoxShadow> get shadowLg => [
    BoxShadow(color: const Color(0x1A0F172A), blurRadius: 50, offset: const Offset(0, 18)),
  ];

  static List<BoxShadow> get shadowPrimary => [
    BoxShadow(color: const Color(0x47FF6B8A), blurRadius: 48, offset: const Offset(0, 18)),
  ];

  static List<BoxShadow> get shadowCard => [
    BoxShadow(color: const Color(0x14242B3A), blurRadius: 34, offset: const Offset(0, 18)),
  ];

  static List<BoxShadow> get shadowHero => [
    BoxShadow(color: const Color(0x233D1B31), blurRadius: 32, offset: const Offset(0, 16)),
  ];

  static List<BoxShadow> get shadowHeroSm => [
    BoxShadow(color: const Color(0x1F3D1B31), blurRadius: 34, offset: const Offset(0, 16)),
  ];

  static List<BoxShadow> get shadowButton => [
    BoxShadow(color: const Color(0x30FF6B8A), blurRadius: 12, offset: const Offset(0, 6)),
  ];

  static List<BoxShadow> get shadowButtonLg => [
    BoxShadow(color: const Color(0x38FF5F86), blurRadius: 20, offset: const Offset(0, 12)),
  ];

  static List<BoxShadow> get shadowButtonOutline => [
    BoxShadow(color: const Color(0x14FF6E8D), blurRadius: 16, offset: const Offset(0, 8)),
  ];

  static List<BoxShadow> get shadowTile => [
    BoxShadow(color: const Color(0x0D241B29), blurRadius: 20, offset: const Offset(0, 8)),
  ];

  static List<BoxShadow> get shadowTileLg => [
    BoxShadow(color: const Color(0x0D241B29), blurRadius: 16, offset: const Offset(0, 8)),
  ];

  // ──────────────────────────────────────────────────────────────
  // BORDER RADIUS HELPERS
  // ──────────────────────────────────────────────────────────────

  static BorderRadius get borderRadius8 => BorderRadius.circular(radius8);
  static BorderRadius get borderRadius12 => BorderRadius.circular(radius12);
  static BorderRadius get borderRadius16 => BorderRadius.circular(radius16);
  static BorderRadius get borderRadius24 => BorderRadius.circular(radius24);
  static BorderRadius get borderRadiusCard => BorderRadius.circular(rCard);
  static BorderRadius get borderRadiusFull => BorderRadius.circular(rFull);

  // ──────────────────────────────────────────────────────────────
  // EDGE INSETS HELPERS
  // ──────────────────────────────────────────────────────────────

  static const EdgeInsets padding4 = EdgeInsets.all(space4);
  static const EdgeInsets padding8 = EdgeInsets.all(space8);
  static const EdgeInsets padding12 = EdgeInsets.all(space12);
  static const EdgeInsets padding16 = EdgeInsets.all(space16);
  static const EdgeInsets padding24 = EdgeInsets.all(space24);
  static const EdgeInsets padding32 = EdgeInsets.all(space32);

  static const EdgeInsets paddingHorizontal4 = EdgeInsets.symmetric(horizontal: space4);
  static const EdgeInsets paddingHorizontal8 = EdgeInsets.symmetric(horizontal: space8);
  static const EdgeInsets paddingHorizontal12 = EdgeInsets.symmetric(horizontal: space12);
  static const EdgeInsets paddingHorizontal16 = EdgeInsets.symmetric(horizontal: space16);
  static const EdgeInsets paddingHorizontal24 = EdgeInsets.symmetric(horizontal: space24);

  static const EdgeInsets paddingVertical4 = EdgeInsets.symmetric(vertical: space4);
  static const EdgeInsets paddingVertical8 = EdgeInsets.symmetric(vertical: space8);
  static const EdgeInsets paddingVertical12 = EdgeInsets.symmetric(vertical: space12);
  static const EdgeInsets paddingVertical16 = EdgeInsets.symmetric(vertical: space16);
  static const EdgeInsets paddingVertical24 = EdgeInsets.symmetric(vertical: space24);

  // ──────────────────────────────────────────────────────────────
  // ORDER STATUS COLORS - Unified mapping (iOS HIG compliant)
  // ──────────────────────────────────────────────────────────────

  static const Color statusPendingQuoteBg = Color(0xFFFFF3E0);
  static const Color statusPendingQuoteText = Color(0xFFD97706);

  static const Color statusPendingAgreeBg = Color(0xFFFFF7ED);
  static const Color statusPendingAgreeText = Color(0xFFC2410C);

  static const Color statusPendingConfirmBg = Color(0xFFEEF9F1);
  static const Color statusPendingConfirmText = Color(0xFF059669);

  static const Color statusPendingHomeBg = Color(0xFFEFF6FF);
  static const Color statusPendingHomeText = Color(0xFF2563EB);

  static const Color statusPendingShopBg = Color(0xFFEFF6FF);
  static const Color statusPendingShopText = Color(0xFF2563EB);

  static const Color statusInProgressBg = Color(0xFFEFF6FF);
  static const Color statusInProgressText = Color(0xFF2563EB);

  static const Color statusCompletedText = Color(0xFF6B7280);

  static const Color statusCancelledBg = Color(0xFFFEF2F2);
  static const Color statusCancelledText = Color(0xFFDC2626);

  // ──────────────────────────────────────────────────────────────
  // MONOSPACE TEXT STYLE - For numbers, prices, times
  // ──────────────────────────────────────────────────────────────

  static const TextStyle monospace = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    fontFamily: 'Courier',
    height: 1.4,
    color: textPrimary,
  );

  static const TextStyle monospaceLarge = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.bold,
    fontFamily: 'Courier',
    height: 1.2,
    letterSpacing: -0.5,
    color: textPrimary,
  );
}
