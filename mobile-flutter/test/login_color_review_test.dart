import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nailbook_mobile/core/theme/app_theme.dart';
import 'package:nailbook_mobile/features/shared/auth/unified_login_screen.dart';

void main() {
  for (final width in [320.0, 375.0, 390.0, 430.0, 768.0, 1440.0]) {
    testWidgets('real login layout and local validation at width $width', (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = Size(width, 900);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.light,
        home: const UnifiedLoginScreen(),
      ));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('欢迎回来'), findsOneWidget);
      for (final label in ['注册账号', '忘记密码？']) {
        final target = find.ancestor(of: find.text(label), matching: find.byType(GestureDetector)).first;
        expect(tester.getSize(target).height, greaterThanOrEqualTo(44));
      }
      for (final element in find.byType(TextField).evaluate()) {
        final box = element.renderObject! as RenderBox;
        expect(box.size.width, lessThanOrEqualTo(width));
        expect(box.size.height, greaterThanOrEqualTo(44));
      }
      await tester.ensureVisible(find.text('登录'));
      await tester.tap(find.text('登录'));
      await tester.pumpAndSettle();
      // Empty input is rejected before any API/provider lookup.
      expect(find.text('请输入有效的手机号码'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
}
