import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nailbook_mobile/core/theme/app_theme.dart';
import 'package:nailbook_mobile/core/theme/colors.generated.dart';
import 'package:nailbook_mobile/core/widgets/nb_shared_components.dart';

void main() {
  const statuses = {
    'pending_quote': '待报价',
    'pending_agree': '待用户确认',
    'pending_client_confirm': '待用户确认',
    'pending_confirm': '待我确认',
    'pending_home': '待上门',
    'pending_shop': '待到店',
    'in_progress': '服务中',
    'completed': '已完成',
    'cancelled': '已取消',
    'expired': '已过期',
  };
  for (final entry in statuses.entries) {
    testWidgets('${entry.key} remains legible without status hues', (tester) async {
      await tester.pumpWidget(MaterialApp(theme: AppTheme.light,
        home: Scaffold(body: OrderStatusBadge(status: entry.key))));
      final badge = find.byType(OrderStatusBadge);
      final label = tester.widget<Text>(find.descendant(of: badge, matching: find.byType(Text)));
      expect(label.data, entry.value);
      final container = tester.widget<Container>(find.descendant(of: badge, matching: find.byType(Container)).first);
      final background = (container.decoration! as BoxDecoration).color!;
      final foreground = label.style!.color!;
      expect([NBColors.page, NBColors.surface, NBColors.pressed, NBColors.activeSurface], contains(background));
      expect([NBColors.ink, NBColors.secondary, NBColors.muted, NBColors.link], contains(foreground));
      final a = foreground.computeLuminance();
      final b = background.computeLuminance();
      final contrast = ((a > b ? a : b) + 0.05) / ((a < b ? a : b) + 0.05);
      expect(contrast, greaterThanOrEqualTo(4.5));
      expect(tester.takeException(), isNull);
    });
  }
}
