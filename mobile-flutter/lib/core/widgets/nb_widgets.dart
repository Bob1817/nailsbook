import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';

/// ── Glass Container ──
class NBGlassContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final Color? color;

  const NBGlassContainer({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.borderRadius = DT.rHero,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      decoration: BoxDecoration(
        color: color ?? Colors.white.withOpacity(0.88),
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: DT.shadowCard,
        border: Border.all(color: Colors.black.withOpacity(0.05), width: 1),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: Padding(
          padding: padding ?? const EdgeInsets.all(DT.lg),
          child: child,
        ),
      ),
    );
  }
}

/// ── Gradient Card ──
class NBGradientCard extends StatelessWidget {
  final Widget child;
  final Gradient gradient;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;

  const NBGradientCard({
    super.key,
    required this.child,
    this.gradient = DT.bookingGradient,
    this.padding,
    this.margin,
    this.borderRadius = DT.rCard,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: DT.shadowPrimary,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: Padding(
          padding: padding ?? const EdgeInsets.all(DT.xl),
          child: child,
        ),
      ),
    );
  }
}

/// ── Section Header ──
class NBSectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? actionText;
  final VoidCallback? onAction;

  const NBSectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actionText,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: DT.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(
                  fontSize: 18, fontWeight: FontWeight.w600, color: DT.textPrimary,
                )),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(subtitle!, style: const TextStyle(
                    fontSize: 13, color: DT.textMuted,
                  )),
                ],
              ],
            ),
          ),
          if (actionText != null)
            GestureDetector(
              onTap: onAction,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(actionText!, style: const TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w600, color: DT.primary,
                  )),
                  const SizedBox(width: 2),
                  const Icon(Icons.chevron_right, size: 16, color: DT.primary),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// ── Pill Badge ──
class NBPillBadge extends StatelessWidget {
  final String text;
  final Color? color;
  final Color? textColor;
  final Color? borderColor;
  final double fontSize;

  const NBPillBadge({
    super.key,
    required this.text,
    this.color,
    this.textColor,
    this.borderColor,
    this.fontSize = 12, // Increased from 11 for accessibility
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6), // Increased from 4
      decoration: BoxDecoration(
        color: color ?? DT.primarySoft,
        borderRadius: BorderRadius.circular(DT.rFull),
        border: borderColor != null ? Border.all(color: borderColor!) : null,
      ),
      child: Text(text, style: TextStyle(
        fontSize: fontSize,
        fontWeight: FontWeight.w600,
        color: textColor ?? DT.primary,
      )),
    );
  }
}

/// ── Menu Row ──
class NBMenuRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final Widget? trailing;
  final Color? iconBg;

  const NBMenuRow({
    super.key,
    required this.icon,
    required this.label,
    this.onTap,
    this.trailing,
    this.iconBg,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(DT.rXxl),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: DT.lg, vertical: DT.lg),
          child: Row(
            children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [DT.primarySoft, const Color(0xFFF4F7FB)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(DT.rXxl),
                ),
                child: Icon(icon, size: 20, color: DT.textSecondary),
              ),
              const SizedBox(width: DT.md),
              Expanded(
                child: Text(label, style: const TextStyle(
                  fontSize: 15, fontWeight: FontWeight.w500, color: DT.textPrimary,
                )),
              ),
              trailing ?? const Icon(Icons.chevron_right, size: 20, color: DT.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}

/// ── Skeleton Loader ──
class NBSkeleton extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;

  const NBSkeleton({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.borderRadius = DT.rMd,
  });

  @override
  State<NBSkeleton> createState() => _NBSkeletonState();
}

class _NBSkeletonState extends State<NBSkeleton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
    _animation = Tween<double>(begin: 0.3, end: 0.7).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: Color.lerp(const Color(0xFFF0F0F0), const Color(0xFFE0E0E0), _animation.value),
            borderRadius: BorderRadius.circular(widget.borderRadius),
          ),
        );
      },
    );
  }
}

/// ── Quick Action Grid Item ──
class NBQuickActionItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final Color? iconBg;

  const NBQuickActionItem({
    super.key,
    required this.icon,
    required this.label,
    this.onTap,
    this.iconBg,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 52, height: 52,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [DT.primary, DT.primaryLight],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(DT.rXxl),
              boxShadow: [
                BoxShadow(
                  color: DT.primary.withOpacity(0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Icon(icon, size: 24, color: Colors.white),
          ),
          const SizedBox(height: DT.sm),
          Text(label, style: const TextStyle(
            fontSize: 12, fontWeight: FontWeight.w500, color: DT.textPrimary,
          ), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

/// ── Error Banner ──
class NBErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback? onDismiss;

  const NBErrorBanner({super.key, required this.message, this.onDismiss});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: DT.lg),
      padding: const EdgeInsets.all(DT.md),
      decoration: BoxDecoration(
        color: const Color(0xFFFEE2E2),
        borderRadius: BorderRadius.circular(DT.rMd),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, size: 18, color: Color(0xFFDC2626)),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: const TextStyle(
            fontSize: 13, color: Color(0xFFDC2626),
          ))),
          if (onDismiss != null)
            GestureDetector(
              onTap: onDismiss,
              child: const Icon(Icons.close, size: 16, color: Color(0xFFDC2626)),
            ),
        ],
      ),
    );
  }
}
