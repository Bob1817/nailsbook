import 'package:flutter/material.dart';

import '../theme/design_tokens.dart';

/// Client page back button aligned with the client appointment detail header.
class ClientDetailBackButton extends StatelessWidget {
  final VoidCallback? onTap;

  const ClientDetailBackButton({super.key, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap ?? () => Navigator.of(context).maybePop(),
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: DT.surface.withValues(alpha: 0.9),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
        ),
        child: const Icon(Icons.arrow_back_ios_new_rounded,
            size: 18, color: DT.textSecondary),
      ),
    );
  }
}
