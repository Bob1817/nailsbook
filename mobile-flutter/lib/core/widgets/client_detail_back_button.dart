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
      behavior: HitTestBehavior.opaque,
      child: const SizedBox(
        width: 40,
        height: 40,
        child: Icon(Icons.arrow_back_ios_new_rounded,
            size: 20, color: DT.textPrimary),
      ),
    );
  }
}
