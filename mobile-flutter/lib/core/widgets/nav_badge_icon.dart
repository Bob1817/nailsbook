import 'package:flutter/material.dart';

import '../theme/design_tokens.dart';
import '../theme/editorial_tokens.dart';

/// 底部导航图标 + 右上角未读角标。badge<=0 时不显示角标。
class NavBadgeIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final int badge;
  final double size;

  const NavBadgeIcon({
    super.key,
    required this.icon,
    required this.color,
    this.badge = 0,
    this.size = 24,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icon, size: size, color: color),
        if (badge > 0)
          Positioned(
            right: -7,
            top: -4,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: DT.error,
                borderRadius: BorderRadius.circular(999),
                // 深色描边让角标在玻璃导航上更清晰
                border: Border.all(color: ET.bg, width: 1.5),
              ),
              child: Text(
                badge > 99 ? '99+' : '$badge',
                style: const TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    height: 1),
              ),
            ),
          ),
      ],
    );
  }
}
