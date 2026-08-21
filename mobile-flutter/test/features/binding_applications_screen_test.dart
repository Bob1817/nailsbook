import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:nailbook_mobile/core/api/api_client.dart';
import 'package:nailbook_mobile/features/technician/customers/technician_binding_applications_screen.dart';

void main() {
  testWidgets('美甲师审批页：加载 → 展示申请 → 通过后移除', (tester) async {
    var approved = 0;
    final mock = MockClient((req) async {
      if (req.method == 'GET' &&
          req.url.path.contains('binding-applications')) {
        return http.Response(
          jsonEncode([
            {
              'id': 1,
              'clientId': 11,
              'name': '小红',
              'phone': '13800138001',
              'address': '杭州市西湖区',
              'note': '我是老顾客',
              'appliedAt': '2026-06-10T10:00:00.000Z',
            },
          ]),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      if (req.method == 'POST' && req.url.path.contains('/approve')) {
        approved++;
        return http.Response(jsonEncode({'status': 'active'}), 200,
            headers: {'content-type': 'application/json'});
      }
      return http.Response('[]', 200);
    });
    final api = ApiClient(baseUrl: 'http://x', httpClient: mock);

    await tester.pumpWidget(
      Provider<ApiClient>.value(
        value: api,
        child: const MaterialApp(home: TechnicianBindingApplicationsScreen()),
      ),
    );
    // 等加载完成（loading 是无限动画，用固定 pump 而非 pumpAndSettle）
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 200));
    }

    // 展示申请人信息 + 备注
    expect(find.text('小红'), findsOneWidget);
    expect(find.textContaining('我是老顾客'), findsOneWidget);
    expect(find.text('通过'), findsOneWidget);

    // 点击「通过」→ 调用 approve、列表移除、回到空态
    await tester.tap(find.text('通过'));
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 200));
    }

    expect(approved, 1);
    expect(find.text('小红'), findsNothing);
    expect(find.text('暂无待审批的绑定申请'), findsOneWidget);
  });
}
