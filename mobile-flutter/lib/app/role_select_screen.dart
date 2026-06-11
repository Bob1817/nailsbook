import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/editorial_tokens.dart';

class RoleSelectScreen extends StatelessWidget {
  const RoleSelectScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ET.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.spa, size: 72, color: ET.accent),
              const SizedBox(height: 16),
              const Text('NailBook', style: ET.display),
              const SizedBox(height: 8),
              const Text('选择您的身份', style: ET.body),
              const SizedBox(height: 48),
              // 主按钮：奶油填充
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: () => context.go('/client/login'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ET.cream,
                    foregroundColor: ET.onCream,
                    elevation: 0,
                    shape: const StadiumBorder(),
                    textStyle: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  child: const Text('我是客户'),
                ),
              ),
              const SizedBox(height: 14),
              // 次按钮：深色 surface + 描边（在黑底上清晰可见）
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton(
                  onPressed: () => context.go('/technician/login'),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: ET.surface,
                    foregroundColor: ET.ink,
                    side: const BorderSide(color: ET.hairlineStrong),
                    shape: const StadiumBorder(),
                    textStyle: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  child: const Text('我是美甲师'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
