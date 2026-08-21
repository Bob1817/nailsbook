import 'package:flutter_test/flutter_test.dart';
import 'package:nailbook_mobile/core/media/oss_image.dart';

void main() {
  const oss =
      'https://nails-products-lunails.oss-cn-hangzhou.aliyuncs.com/images/a.jpg';

  group('oss_image', () {
    test('appends x-oss-process to OSS url', () {
      final u = ossThumb(oss);
      expect(u.startsWith('$oss?x-oss-process='), true);
      expect(u.contains('image/resize,w_600'), true);
      expect(u.contains('format,webp'), true);
    });

    test('ossSized honors width/quality', () {
      final u = ossSized(oss, width: 800, quality: 70);
      expect(u.contains('w_800'), true);
      expect(u.contains('q_70'), true);
    });

    test('non-OSS url left untouched (local/external/empty)', () {
      expect(ossThumb('/uploads/a.jpg'), '/uploads/a.jpg');
      expect(ossThumb('https://example.com/a.jpg'),
          'https://example.com/a.jpg');
      expect(ossThumb(''), '');
    });

    test('uses & when url already has a query string', () {
      final u = ossThumb('$oss?v=1');
      expect(u.contains('?v=1&x-oss-process='), true);
    });

    test('does not double-append if already processed', () {
      final once = ossThumb(oss);
      expect(ossFeed(once), once);
    });

    test('webp:false omits format conversion', () {
      final u = ossSized(oss, width: 600, webp: false);
      expect(u.contains('format,webp'), false);
    });
  });
}
