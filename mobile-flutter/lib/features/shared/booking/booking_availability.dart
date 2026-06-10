/// 预约可用性：与 webapp `useTechnicianAvailability` + `utils/shopHours` 等价的纯逻辑端口。
///
/// 三个联动维度：
/// 1. 美甲师工作时间方案（serviceSchedule）—— 决定哪些“日期”可约 + 上门时段范围；
/// 2. 店铺营业时间（shopAddress.businessHours）—— 到店模式下的时段范围 / 休息日；
/// 3. 已占用时段（blockedSlots，含其他客户预约/手动屏蔽）+ 过去时间 —— 决定时段是否被占用。
library;

/// 全天 48 个半小时时段 "00:00".."23:30"（与 webapp TIME_SLOTS 一致）。
final List<String> kBookingTimeSlots = List.generate(48, (i) {
  final h = (i ~/ 2).toString().padLeft(2, '0');
  final m = i % 2 == 0 ? '00' : '30';
  return '$h:$m';
});

int _toMinutes(String hhmm) {
  final parts = hhmm.split(':');
  return int.parse(parts[0]) * 60 + int.parse(parts[1]);
}

/// JS getDay() 约定：0=周日 .. 6=周六。Dart weekday 是 1=周一..7=周日。
int _jsWeekday(String dateStr) => DateTime.parse(dateStr).weekday % 7;

const _dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

bool _hasEffectiveWorkTime(Map<String, dynamic>? sched) {
  if (sched == null) return false;
  final schemes = sched['schemes'];
  if (schemes is List) {
    final active = _activeScheme(sched);
    final days = active?['days'];
    return active != null && days is List && days.isNotEmpty;
  }
  final selectedDates = sched['selectedDates'];
  if (selectedDates is List && selectedDates.isNotEmpty) return true;
  final days = sched['days'];
  if (days is Map) {
    return days.values.any((d) => d is Map && d['enabled'] == true);
  }
  return false;
}

Map<String, dynamic>? _activeScheme(Map<String, dynamic>? sched) {
  final schemes = sched?['schemes'];
  if (schemes is! List) return null;
  final activeId = sched?['activeSchemeId'];
  for (final s in schemes) {
    if (s is Map<String, dynamic> && s['id'] == activeId) return s;
  }
  return null;
}

class TimeRange {
  final String start;
  final String end;
  const TimeRange(this.start, this.end);
}

/// 上门模式的工时范围（活动方案的 start/end），无有效方案则 null（不限制）。
TimeRange? scheduleRange(Map<String, dynamic>? sched) {
  if (!_hasEffectiveWorkTime(sched) || sched == null) return null;
  if (sched['schemes'] is! List) return null;
  final active = _activeScheme(sched);
  if (active == null) return null;
  final s = active['startTime'];
  final e = active['endTime'];
  if (s is String && e is String) return TimeRange(s, e);
  return null;
}

/// 该日期美甲师是否接单（休息日/非工作日 → false）。无方案则视为可约。
bool isDateAvailable(Map<String, dynamic>? sched, String dateStr) {
  if (!_hasEffectiveWorkTime(sched) || sched == null) return true;
  final dayKey = _dayKeys[_jsWeekday(dateStr)];
  if (sched['schemes'] is List) {
    final restDays = sched['restDays'];
    if (restDays is List && restDays.contains(dateStr)) return false;
    final active = _activeScheme(sched);
    final days = active?['days'];
    return active != null && days is List && days.contains(dayKey);
  }
  final selectedDates = sched['selectedDates'];
  if (selectedDates is List && selectedDates.isNotEmpty) {
    return selectedDates.contains(dateStr);
  }
  final days = sched['days'];
  if (days is Map) {
    final d = days[dayKey];
    return d is Map ? (d['enabled'] == true) : true;
  }
  return true;
}

class SlotStatus {
  final String time;
  final bool occupied;
  const SlotStatus(this.time, this.occupied);
}

String _todayStr() {
  final t = DateTime.now();
  return '${t.year}-${t.month.toString().padLeft(2, '0')}-${t.day.toString().padLeft(2, '0')}';
}

/// 计算某天各时段的占用状态。
/// - [shopMode]=true：到店，以 [shopHours] 为准；closed → 空数组；null → 不限制。
/// - 否则：上门，以 [range]（美甲师工时）为准；null → 不限制。
/// - [blockedSlots]：[{startTime,endTime}] ISO 字符串，过去时间与重叠时段标记为占用。
List<SlotStatus> getSlotStatuses({
  required String dateStr,
  TimeRange? range,
  List<Map<String, dynamic>> blockedSlots = const [],
  bool shopMode = false,
  Map<String, dynamic>? shopHours,
}) {
  Iterable<String> base = kBookingTimeSlots;
  if (shopMode) {
    if (shopHours != null) {
      if (shopHours['closed'] == true) return const [];
      final s = _toMinutes(shopHours['start'] as String);
      final e = _toMinutes(shopHours['end'] as String);
      base = base.where((t) {
        final m = _toMinutes(t);
        return m >= s && m < e;
      });
    }
  } else if (range != null) {
    final s = _toMinutes(range.start);
    final e = _toMinutes(range.end);
    base = base.where((t) {
      final m = _toMinutes(t);
      return m >= s && m < e;
    });
  }

  final now = DateTime.now();
  final today = _todayStr();
  final parsed = blockedSlots
      .map((b) => (
            DateTime.parse(b['startTime'] as String),
            DateTime.parse(b['endTime'] as String),
          ))
      .toList();

  return base.map((time) {
    final slotDt = DateTime.parse('$dateStr $time:00');
    final isPast = dateStr == today && !slotDt.isAfter(now);
    final occupied = isPast ||
        parsed.any((p) => !slotDt.isBefore(p.$1) && slotDt.isBefore(p.$2));
    return SlotStatus(time, occupied);
  }).toList();
}

// ───────── 跨城上门限制 ─────────

/// 归一化城市名：去除首尾空白与结尾的「市」。
String normCity(String? s) => (s ?? '').trim().replaceAll(RegExp(r'市$'), '');

/// 地址与美甲师是否同城。美甲师未设城市 → 不限制（true）。
bool sameCity(String? addressCity, String? techCity) {
  if (techCity == null || techCity.trim().isEmpty) return true;
  return normCity(addressCity) == normCity(techCity);
}

// ───────── 店铺营业时间 ─────────

bool _hasBusinessHours(Map<String, dynamic>? shop) {
  final bh = shop?['businessHours'];
  return bh is List && bh.isNotEmpty;
}

/// 取某天对应星期的营业时间条目，无则 null。
Map<String, dynamic>? getShopHoursForDate(Map<String, dynamic>? shop, String dateStr) {
  final bh = shop?['businessHours'];
  if (bh is! List || dateStr.isEmpty) return null;
  final wd = _jsWeekday(dateStr);
  for (final item in bh) {
    if (item is Map<String, dynamic> && item['weekday'] == wd) return item;
  }
  return null;
}

/// 某天店铺是否营业（未配置营业时间 → 视为营业）。
bool isShopOpenOnDate(Map<String, dynamic>? shop, String dateStr) {
  if (!_hasBusinessHours(shop)) return true;
  final hours = getShopHoursForDate(shop, dateStr);
  return hours != null && hours['closed'] != true;
}

/// 传给 [getSlotStatuses] 的 shopHours 选项。
Map<String, dynamic>? shopHoursOptionForDate(Map<String, dynamic>? shop, String dateStr) {
  if (!_hasBusinessHours(shop)) return null;
  final hours = getShopHoursForDate(shop, dateStr);
  if (hours == null || hours['closed'] == true) {
    return {'start': '', 'end': '', 'closed': true};
  }
  return {'start': hours['start'], 'end': hours['end']};
}
