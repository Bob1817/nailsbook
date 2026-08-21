import 'package:flutter_test/flutter_test.dart';
import 'package:nailbook_mobile/features/shared/booking/booking_availability.dart';

void main() {
  group('isDateAvailable (schemes)', () {
    // 2026-06-08 是周一, 06-09 周二 ... 06-13 周六, 06-14 周日
    final sched = {
      'activeSchemeId': 's1',
      'restDays': ['2026-06-10'],
      'schemes': [
        {'id': 's1', 'startTime': '10:00', 'endTime': '18:00', 'days': ['mon', 'tue', 'wed']},
      ],
    };

    test('working weekday is available', () {
      expect(isDateAvailable(sched, '2026-06-08'), true); // Monday
      expect(isDateAvailable(sched, '2026-06-09'), true); // Tuesday
    });
    test('non-working weekday unavailable', () {
      expect(isDateAvailable(sched, '2026-06-11'), false); // Thursday not in days
      expect(isDateAvailable(sched, '2026-06-13'), false); // Saturday
    });
    test('rest day overrides working weekday', () {
      expect(isDateAvailable(sched, '2026-06-10'), false); // Wed but rest day
    });
    test('null schedule -> always available', () {
      expect(isDateAvailable(null, '2026-06-13'), true);
      expect(isDateAvailable({}, '2026-06-13'), true);
    });
  });

  group('scheduleRange + getSlotStatuses (home)', () {
    final sched = {
      'activeSchemeId': 's1',
      'schemes': [
        {'id': 's1', 'startTime': '10:00', 'endTime': '12:00', 'days': ['mon']},
      ],
    };

    test('clamps slots to work hours [10:00,12:00)', () {
      final r = scheduleRange(sched);
      final slots = getSlotStatuses(dateStr: '2026-06-08', range: r);
      expect(slots.map((s) => s.time).toList(), ['10:00', '10:30', '11:00', '11:30']);
    });

    test('blocked slot occupies overlapping 5h-lock window (backend-aligned)', () {
      final r = scheduleRange(sched);
      final slots = getSlotStatuses(
        dateStr: '2026-06-08',
        range: r,
        blockedSlots: [
          {'startTime': '2026-06-08T10:30:00', 'endTime': '2026-06-08T11:00:00'},
        ],
      );
      final byTime = {for (final s in slots) s.time: s.occupied};
      // 新预约锁定 [slot, slot+5h]，与已占用 10:30-11:00 重叠者不可选（与后端一致）。
      expect(byTime['10:00'], true); // [10:00,15:00) 覆盖 10:30
      expect(byTime['10:30'], true); // [10:30,15:30) 覆盖 10:30
      expect(byTime['11:00'], false); // [11:00,16:00) 不与 (10:30,11:00) 重叠
      expect(byTime['11:30'], false);
    });
  });

  group('sameCity', () {
    test('tech without city -> unrestricted', () {
      expect(sameCity('北京', null), true);
      expect(sameCity('北京', ''), true);
    });
    test('normalizes trailing 市', () {
      expect(sameCity('杭州市', '杭州'), true);
      expect(sameCity('杭州', '杭州市'), true);
    });
    test('different city -> false', () {
      expect(sameCity('上海', '杭州'), false);
      expect(sameCity(null, '杭州'), false);
    });
  });

  group('shop hours', () {
    final shop = {
      'businessHours': [
        {'weekday': 1, 'start': '11:00', 'end': '13:00'}, // Monday
        {'weekday': 2, 'closed': true}, // Tuesday closed
      ],
    };

    test('isShopOpenOnDate', () {
      expect(isShopOpenOnDate(shop, '2026-06-08'), true); // Mon
      expect(isShopOpenOnDate(shop, '2026-06-09'), false); // Tue closed
      expect(isShopOpenOnDate(shop, '2026-06-10'), false); // Wed no entry
      expect(isShopOpenOnDate(null, '2026-06-10'), true); // no config -> open
    });

    test('shopHoursOptionForDate + getSlotStatuses shop mode', () {
      final opt = shopHoursOptionForDate(shop, '2026-06-08');
      final slots = getSlotStatuses(dateStr: '2026-06-08', shopMode: true, shopHours: opt);
      expect(slots.map((s) => s.time).toList(), ['11:00', '11:30', '12:00', '12:30']);
    });

    test('closed day -> empty slots', () {
      final opt = shopHoursOptionForDate(shop, '2026-06-09');
      final slots = getSlotStatuses(dateStr: '2026-06-09', shopMode: true, shopHours: opt);
      expect(slots, isEmpty);
    });
  });
}
