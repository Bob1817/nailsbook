import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';

/// ── Standard Card Component ──
/// Consistent padding, radius, and shadow across all screens.
class NBCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double? borderRadius;
  final Color? color;
  final List<BoxShadow>? boxShadow;
  final VoidCallback? onTap;

  const NBCard({
    super.key,
    required this.child,
    this.padding,
    this.borderRadius,
    this.color,
    this.boxShadow,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final card = Container(
      padding: padding ?? const EdgeInsets.all(DT.lg),
      decoration: BoxDecoration(
        color: color ?? DT.glassStandard,
        borderRadius: BorderRadius.circular(borderRadius ?? DT.rMd),
        boxShadow: boxShadow ?? DT.shadowTile,
      ),
      child: child,
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(borderRadius ?? DT.rMd),
          child: card,
        ),
      );
    }
    return card;
  }
}

/// ── Order Status Badge ──
/// Unified status color mapping for all order statuses.
class OrderStatusBadge extends StatelessWidget {
  final String status;
  final String? label;
  final double fontSize;

  const OrderStatusBadge({
    super.key,
    required this.status,
    this.label,
    this.fontSize = 12,
  });

  @override
  Widget build(BuildContext context) {
    final colors = _getStatusColors(status);
    final displayLabel = label ?? _getStatusLabel(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: colors.bg,
        borderRadius: BorderRadius.circular(DT.rFull),
      ),
      child: Text(
        displayLabel,
        style: DT.captionLarge.copyWith(
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
          color: colors.text,
        ),
      ),
    );
  }

  ({Color bg, Color text}) _getStatusColors(String status) {
    switch (status) {
      case 'pending_quote':
        return (bg: DT.statusPendingQuoteBg, text: DT.statusPendingQuoteText);
      case 'pending_agree':
      case 'pending_client_confirm':
        return (bg: DT.statusPendingAgreeBg, text: DT.statusPendingAgreeText);
      case 'pending_confirm':
        return (
          bg: DT.statusPendingConfirmBg,
          text: DT.statusPendingConfirmText
        );
      case 'pending_home':
        return (bg: DT.statusPendingHomeBg, text: DT.statusPendingHomeText);
      case 'pending_shop':
        return (bg: DT.statusPendingShopBg, text: DT.statusPendingShopText);
      case 'in_progress':
        return (bg: DT.statusInProgressBg, text: DT.statusInProgressText);
      case 'completed':
        return (bg: DT.statusCompletedBg, text: DT.statusCompletedText);
      case 'cancelled':
        return (bg: DT.statusCancelledBg, text: DT.statusCancelledText);
      case 'expired':
        return (bg: DT.surfaceAlt, text: DT.textSecondary);
      default:
        return (bg: DT.surfaceAlt, text: DT.textSecondary);
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'pending_quote':
        return '待报价';
      case 'pending_agree':
      case 'pending_client_confirm':
        return '待用户确认';
      case 'pending_confirm':
        return '待我确认';
      case 'pending_home':
        return '待上门';
      case 'pending_shop':
        return '待到店';
      case 'in_progress':
        return '服务中';
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      case 'expired':
        return '已过期';
      default:
        return status;
    }
  }
}

/// ── Page Layout Wrapper ──
/// Standard page margin (DT.xl = 20pt) with safe area support.
class NBPagePadding extends StatelessWidget {
  final Widget child;
  final EdgeInsets? additionalPadding;

  const NBPagePadding({
    super.key,
    required this.child,
    this.additionalPadding,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          additionalPadding ?? const EdgeInsets.symmetric(horizontal: DT.xl),
      child: child,
    );
  }
}

/// ── Section Header ──
/// Consistent section titles across all screens.
class NBSectionTitle extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? actionText;
  final VoidCallback? onAction;

  const NBSectionTitle({
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
                Text(title, style: DT.titleLarge),
                if (subtitle != null) ...[
                  const SizedBox(height: DT.xs),
                  Text(subtitle!, style: DT.captionLarge),
                ],
              ],
            ),
          ),
          if (actionText != null)
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: onAction,
              child: SizedBox(
                height: 44,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(actionText!,
                        style: DT.bodySmall.copyWith(
                          color: DT.primary,
                          fontWeight: FontWeight.w600,
                        )),
                    const SizedBox(width: DT.xs),
                    const Icon(CupertinoIcons.chevron_right,
                        size: 16, color: DT.primary),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// ── Safe Min Tap Target ──
/// Ensures any widget has at least 44x44pt tap area (iOS HIG).
class NBMinTapTarget extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final double minWidth;
  final double minHeight;

  const NBMinTapTarget({
    super.key,
    required this.child,
    this.onTap,
    this.minWidth = 44,
    this.minHeight = 44,
  });

  @override
  Widget build(BuildContext context) {
    final content = ConstrainedBox(
      constraints: BoxConstraints(
        minWidth: minWidth,
        minHeight: minHeight,
      ),
      child: child,
    );

    if (onTap != null) {
      return GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: content,
      );
    }
    return content;
  }
}

/// ── Stat Row Item ──
/// Consistent stat display for cards.
class NBStatRow extends StatelessWidget {
  final List<NBStatItem> items;

  const NBStatRow({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(DT.md),
      decoration: BoxDecoration(
        color: DT.bgWarm,
        borderRadius: BorderRadius.circular(DT.rMd),
      ),
      child: Row(
        children: items.map((item) => Expanded(child: item)).toList(),
      ),
    );
  }
}

class NBStatItem extends StatelessWidget {
  final String label;
  final String value;
  final bool highlight;

  const NBStatItem({
    super.key,
    required this.label,
    required this.value,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: DT.captionMedium),
        const SizedBox(height: DT.xs),
        Text(
          value,
          style: DT.bodySmall.copyWith(
            fontWeight: highlight ? FontWeight.w600 : FontWeight.w500,
            color: highlight ? DT.primary : DT.textPrimary,
          ),
        ),
      ],
    );
  }
}
