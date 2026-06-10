import 'package:flutter/material.dart';

import 'design_tokens.dart';
import 'editorial_tokens.dart';

/// 应用主题 — Apple 中性系 + 胶囊几何 + 克制深度。
/// 颜色/圆角/排版统一取自 [DT]。
class AppTheme {
  static ThemeData get light {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: DT.primary,
      brightness: Brightness.dark,
    ).copyWith(
      surface: DT.surface,
      onSurface: DT.textPrimary,
      primary: DT.primary,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: DT.bg,
      splashFactory: InkRipple.splashFactory,

      appBarTheme: const AppBarTheme(
        backgroundColor: DT.surface,
        surfaceTintColor: Colors.transparent,
        foregroundColor: DT.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
          color: DT.textPrimary,
        ),
      ),

      // 表面层级：柔和阴影 + 背景区分，避免依赖硬边框
      cardTheme: CardThemeData(
        color: DT.surface,
        elevation: 0.5,
        shadowColor: const Color(0x12000000),
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(DT.radius16)),
        margin: const EdgeInsets.symmetric(
            horizontal: DT.space16, vertical: DT.space8),
      ),

      // 主操作：胶囊几何
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: ET.cream,
          foregroundColor: ET.onCream,
          disabledBackgroundColor: ET.cream.withValues(alpha: 0.4),
          disabledForegroundColor: ET.onCream,
          minimumSize: const Size(double.infinity, 50),
          elevation: 0,
          shadowColor: Colors.transparent,
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          shape: const StadiumBorder(),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: DT.primary,
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: DT.textPrimary,
          backgroundColor: Colors.transparent,
          minimumSize: const Size(double.infinity, 50),
          side: const BorderSide(color: DT.border, width: 0.5),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: DT.surfaceAlt,
        hintStyle: const TextStyle(color: DT.textMuted, fontSize: 14),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: DT.space16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(DT.rInput),
          borderSide: const BorderSide(color: DT.border, width: 0.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(DT.rInput),
          borderSide: const BorderSide(color: DT.border, width: 0.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(DT.rInput),
          borderSide: const BorderSide(color: DT.primaryBorder),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(DT.rInput),
          borderSide: const BorderSide(color: DT.errorBorder),
        ),
      ),

      dividerTheme:
          const DividerThemeData(color: DT.divider, thickness: 0.5, space: 1),

      // 统一弹窗：圆角 + 中性表面 + 标题/正文排版
      dialogTheme: DialogThemeData(
        backgroundColor: DT.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(DT.radius24)),
        titleTextStyle: const TextStyle(
            fontSize: 17, fontWeight: FontWeight.w600, color: DT.textPrimary),
        contentTextStyle:
            const TextStyle(fontSize: 14, height: 1.5, color: DT.textSecondary),
      ),

      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: DT.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      ),

      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: DT.surface,
        selectedItemColor: DT.primary,
        unselectedItemColor: DT.textTertiary,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        showUnselectedLabels: true,
      ),

      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: ET.bgElevated,
        contentTextStyle: const TextStyle(color: ET.ink, fontSize: 14),
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(DT.radius12)),
      ),

      textTheme: const TextTheme(
        headlineLarge: DT.displayMedium,
        headlineMedium: DT.displaySmall,
        titleLarge: DT.titleLarge,
        titleMedium: DT.titleMedium,
        titleSmall: DT.titleSmall,
        bodyLarge: DT.bodyLarge,
        bodyMedium: DT.bodyMedium,
        bodySmall: DT.bodySmall,
      ),
    );
  }

  static const double touchTargetMin = 44.0;
}
