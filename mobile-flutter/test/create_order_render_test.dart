import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:nailbook_mobile/core/api/api_client.dart';
import 'package:nailbook_mobile/features/client/orders/client_create_order_screen.dart';

void main() {
  testWidgets('ClientCreateOrderScreen renders content without throwing', (tester) async {
    final api = ApiClient(baseUrl: 'http://127.0.0.1:9'); // unreachable -> _load fails fast
    api.setRole('client');

    await tester.pumpWidget(
      Provider<ApiClient>.value(
        value: api,
        child: const MaterialApp(home: ClientCreateOrderScreen()),
      ),
    );

    // Let _load() fail and rebuild the loaded (empty) state.
    for (var i = 0; i < 8; i++) {
      await tester.pump(const Duration(milliseconds: 300));
    }

    // 渲染不应抛异常；加载失败后落到第一步「选择美甲师」并展示空态。
    expect(tester.takeException(), isNull);
    expect(find.text('选择美甲师'), findsWidgets); // 头部步骤标题 + 卡片标题
    expect(find.text('暂无可预约的美甲师'), findsOneWidget);
  });
}
