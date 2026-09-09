import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nailbook_mobile/core/theme/app_theme.dart';
import 'package:nailbook_mobile/core/theme/colors.generated.dart';
import 'package:nailbook_mobile/core/theme/editorial_tokens.dart';

void main() {
  test('neutral light theme keeps foregrounds paired with their surfaces', () {
    final theme = AppTheme.light;
    expect(theme.brightness, Brightness.light);
    expect(theme.scaffoldBackgroundColor, NBColors.page);
    expect(theme.colorScheme.surface, NBColors.surface);
    expect(theme.colorScheme.onSurface, NBColors.ink);
    expect(theme.colorScheme.primary, NBColors.action);
    expect(theme.colorScheme.onPrimary, NBColors.inverse);
    expect(ET.cream, NBColors.action);
    expect(ET.onCream, NBColors.inverse);
    expect(ET.ink, NBColors.ink);
    for (final color in [theme.colorScheme.primaryContainer,
      theme.colorScheme.secondaryContainer, theme.colorScheme.tertiaryContainer]) {
      expect((color.r - color.g).abs(), lessThan(0.015));
      expect((color.b - color.g).abs(), lessThan(0.015));
    }
  });

  testWidgets('shared primary button has readable enabled and disabled states', (tester) async {
    await tester.pumpWidget(MaterialApp(theme: AppTheme.light, home: Scaffold(
      body: Column(children: [
        ElevatedButton(onPressed: () {}, child: const Text('确认预约')),
        const ElevatedButton(onPressed: null, child: Text('暂不可预约')),
      ]),
    )));
    expect(tester.takeException(), isNull);
    final style = AppTheme.light.elevatedButtonTheme.style!;
    expect(style.backgroundColor!.resolve({}), NBColors.action);
    expect(style.foregroundColor!.resolve({}), NBColors.inverse);
    expect(style.backgroundColor!.resolve({WidgetState.disabled}), isNot(NBColors.action));
    expect(tester.getSize(find.byType(ElevatedButton).first).height, greaterThanOrEqualTo(44));
  });
}
