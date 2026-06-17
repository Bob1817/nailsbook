import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:nailbook_mobile/core/api/api_client.dart';
import 'package:nailbook_mobile/core/api/api_error.dart';

/// P0-1 401 静默续期逻辑测试（ApiClient._send + _tryRefresh）。
void main() {
  group('ApiClient 401 静默续期', () {
    test('401 → 续期成功 → 重放原请求并返回成功', () async {
      var calls = 0;
      final mock = MockClient((req) async {
        calls++;
        // 首次未带新 token → 401；续期后第二次带新 token → 200。
        if (req.headers['Authorization'] == 'Bearer NEW') {
          return http.Response('{"ok":true}', 200);
        }
        return http.Response('{"message":"Unauthorized"}', 401);
      });
      final client = ApiClient(baseUrl: 'http://x', httpClient: mock);
      client.setToken('OLD');
      var refreshed = 0;
      client.onRefreshToken = () async {
        refreshed++;
        client.setToken('NEW');
        return true;
      };

      final res = await client.get('/me');

      expect(res['ok'], true);
      expect(refreshed, 1); // 续期一次
      expect(calls, 2); // 原请求 + 重放
    });

    test('401 → 续期失败 → 触发登出并抛 401', () async {
      var unauthorized = 0;
      final mock = MockClient(
          (req) async => http.Response('{"message":"Unauthorized"}', 401));
      final client = ApiClient(
        baseUrl: 'http://x',
        httpClient: mock,
        onUnauthorized: () => unauthorized++,
      );
      client.setToken('OLD');
      client.onRefreshToken = () async => false;

      await expectLater(
        client.get('/me'),
        throwsA(isA<ApiError>().having((e) => e.statusCode, 'statusCode', 401)),
      );
      expect(unauthorized, 1);
    });

    test('无 onRefreshToken → 401 直接登出，不重试', () async {
      var calls = 0;
      var unauthorized = 0;
      final mock = MockClient((req) async {
        calls++;
        return http.Response('{"message":"Unauthorized"}', 401);
      });
      final client = ApiClient(
        baseUrl: 'http://x',
        httpClient: mock,
        onUnauthorized: () => unauthorized++,
      );
      client.setToken('OLD');

      await expectLater(client.get('/me'), throwsA(isA<ApiError>()));
      expect(calls, 1); // 未重试
      expect(unauthorized, 1);
    });

    test('并发 401 单飞：只触发一次续期', () async {
      final mock = MockClient((req) async {
        if (req.headers['Authorization'] == 'Bearer NEW') {
          return http.Response('{"ok":true}', 200);
        }
        return http.Response('{"message":"Unauthorized"}', 401);
      });
      final client = ApiClient(baseUrl: 'http://x', httpClient: mock);
      client.setToken('OLD');
      var refreshed = 0;
      client.onRefreshToken = () async {
        refreshed++;
        await Future<void>.delayed(const Duration(milliseconds: 20));
        client.setToken('NEW');
        return true;
      };

      await Future.wait([client.get('/a'), client.get('/b'), client.get('/c')]);
      expect(refreshed, 1); // 三个并发 401 只续期一次
    });

    test('200 正常响应不触发续期', () async {
      var refreshed = 0;
      final mock =
          MockClient((req) async => http.Response('{"ok":true}', 200));
      final client = ApiClient(baseUrl: 'http://x', httpClient: mock);
      client.onRefreshToken = () async {
        refreshed++;
        return true;
      };
      final res = await client.get('/me');
      expect(res['ok'], true);
      expect(refreshed, 0);
    });
  });
}
