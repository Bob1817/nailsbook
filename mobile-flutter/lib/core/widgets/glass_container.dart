import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/design_tokens.dart';

export 'dart:async' show Timer;
export 'dart:convert' show jsonDecode, jsonEncode;
export 'dart:ui' show ImageFilter;
export 'package:cached_network_image/cached_network_image.dart';
export 'package:flutter/cupertino.dart' hide RefreshCallback;
export 'package:flutter/material.dart';
export 'package:flutter/services.dart';
export 'package:image_picker/image_picker.dart';
export 'package:provider/provider.dart';
export 'package:shared_preferences/shared_preferences.dart';
export '../api/api_client.dart';
export '../theme/design_tokens.dart';
export 'nb_shared_components.dart';
export 'nb_toast.dart';
export 'region_picker.dart';

/// Liquid Glass 容器（iOS 26 风格）：背景模糊 + 半透明底色 + 高光描边。
///
/// 用于导航栏、浮层、图片之上的 pill 等需要「磨砂玻璃」材质的表面。
/// 默认参数对应 [DT] 的 standard 档（blur 20 / 半透明白 / 圆角 20）。
class GlassContainer extends StatelessWidget {
  final Widget child;
  final double blur;

  /// 玻璃填充不透明度（0~1）。
  final double opacity;
  final double borderRadius;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;

  /// 玻璃基色（默认白）。图片之上的暗色玻璃可传 [Colors.black]。
  final Color tint;

  /// 是否绘制高光描边。
  final bool showBorder;
  final List<BoxShadow>? boxShadow;

  const GlassContainer({
    super.key,
    required this.child,
    this.blur = DT.glassBlurStandard,
    this.opacity = 0.55,
    this.borderRadius = 20,
    this.padding,
    this.margin,
    this.tint = Colors.white,
    this.showBorder = true,
    this.boxShadow,
  });

  /// 轻档：blur 12 / 50% 白
  const GlassContainer.light({
    super.key,
    required this.child,
    this.borderRadius = 16,
    this.padding,
    this.margin,
    this.tint = Colors.white,
    this.showBorder = true,
    this.boxShadow,
  })  : blur = DT.glassBlurLight,
        opacity = 0.4;

  /// 重档：blur 40 / 88% 白（导航栏、底部浮层）
  const GlassContainer.heavy({
    super.key,
    required this.child,
    this.borderRadius = 28,
    this.padding,
    this.margin,
    this.tint = Colors.white,
    this.showBorder = true,
    this.boxShadow,
  })  : blur = DT.glassBlurHeavy,
        opacity = 0.6;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(borderRadius);
    final isDarkGlass = tint.computeLuminance() < 0.5;
    final borderColor = isDarkGlass
        ? Colors.white.withValues(alpha: 0.22)
        : Colors.white.withValues(alpha: 0.52);
    final highlightStart = isDarkGlass
        ? Colors.white.withValues(alpha: 0.10)
        : Colors.white.withValues(alpha: 0.28);
    final highlightEnd = tint.withValues(alpha: 0);

    return Container(
      margin: margin,
      decoration: boxShadow != null
          ? BoxDecoration(borderRadius: radius, boxShadow: boxShadow)
          : null,
      child: RepaintBoundary(
        child: ClipRRect(
          borderRadius: radius,
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
            child: Container(
              padding: padding,
              decoration: BoxDecoration(
                color: tint.withValues(alpha: opacity),
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [highlightStart, highlightEnd],
                ),
                borderRadius: radius,
                border: showBorder
                    ? Border.all(color: borderColor, width: 0.5)
                    : null,
              ),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

/// Fixed Liquid Glass app bar for pages that still use Scaffold.appBar.
class GlassAppBar extends StatelessWidget implements PreferredSizeWidget {
  final Widget? title;
  final Widget? leading;
  final List<Widget>? actions;
  final bool automaticallyImplyLeading;
  final bool centerTitle;
  final PreferredSizeWidget? bottom;
  final Color? backgroundColor;
  final double? elevation;

  const GlassAppBar({
    super.key,
    this.title,
    this.leading,
    this.actions,
    this.automaticallyImplyLeading = true,
    this.centerTitle = true,
    this.bottom,
    this.backgroundColor,
    this.elevation,
  });

  @override
  Size get preferredSize => Size.fromHeight(
        kToolbarHeight + (bottom?.preferredSize.height ?? 0),
      );

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: title,
      leading: leading,
      actions: actions,
      automaticallyImplyLeading: automaticallyImplyLeading,
      centerTitle: centerTitle,
      bottom: bottom,
      elevation: 0,
      scrolledUnderElevation: 0,
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      foregroundColor: DT.textPrimary,
      flexibleSpace: const GlassContainer(
        blur: DT.glassBlurHeavy,
        opacity: 0.72,
        borderRadius: 0,
        showBorder: false,
        child: SizedBox.expand(),
      ),
    );
  }
}

/// Full-width fixed bottom Liquid Glass surface with safe-area padding.
class GlassBottomSurface extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;

  const GlassBottomSurface({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(20, 12, 20, 16),
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      minimum: EdgeInsets.zero,
      child: GlassContainer(
        blur: DT.glassBlurHeavy,
        opacity: 0.5,
        borderRadius: 0,
        showBorder: false,
        boxShadow: const [
          BoxShadow(
            color: Color(0x10000000),
            blurRadius: 24,
            offset: Offset(0, -8),
          ),
        ],
        child: Padding(
          padding: padding,
          child: child,
        ),
      ),
    );
  }
}
