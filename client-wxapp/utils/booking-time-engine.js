var DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function timeToMinutes(value) {
  if (!/^\d{2}:\d{2}$/.test(value || '')) return null;
  var parts = value.split(':').map(Number);
  if (parts[0] > 23 || parts[1] > 59) return null;
  return parts[0] * 60 + parts[1];
}

function activeScheduleForDate(serviceSchedule, serviceDate) {
  if (!serviceSchedule || !(serviceSchedule.schemes || []).length) {
    return { days: DAY_KEYS, startTime: '10:00', endTime: '21:00' };
  }
  if ((serviceSchedule.restDays || []).indexOf(serviceDate) >= 0) return null;
  var schemes = serviceSchedule.schemes || [];
  var active = schemes.find(function (item) {
    return item.id === serviceSchedule.activeSchemeId;
  });
  if (!active) return null;
  var weekday = new Date(serviceDate + 'T00:00:00').getDay();
  return (active.days || []).indexOf(DAY_KEYS[weekday]) >= 0 ? active : null;
}

function shopHoursForDate(shop, serviceDate) {
  if (!shop || !Array.isArray(shop.businessHours)) return null;
  var weekday = new Date(serviceDate + 'T00:00:00').getDay();
  var hours = shop.businessHours.find(function (item) { return item.weekday === weekday; });
  return !hours || hours.closed ? null : hours;
}

function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function buildSlotStatuses(options) {
  var durationMinutes = Math.max(1, Number(options.durationMinutes) || 120);
  var schedule = activeScheduleForDate(options.serviceSchedule, options.serviceDate);
  if (!schedule) return [];

  var rangeStart = timeToMinutes(schedule.startTime);
  var rangeEnd = timeToMinutes(schedule.endTime);
  if (rangeStart == null || rangeEnd == null || rangeEnd <= rangeStart) return [];

  if (options.shopMode) {
    var hours = shopHoursForDate(options.shop, options.serviceDate);
    if (!hours) return [];
    var shopStart = timeToMinutes(hours.start);
    var shopEnd = timeToMinutes(hours.end);
    if (shopStart == null || shopEnd == null || shopEnd <= shopStart) return [];
    rangeStart = Math.max(rangeStart, shopStart);
    rangeEnd = Math.min(rangeEnd, shopEnd);
  }

  var now = options.now || new Date();
  var today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  return (options.slots || []).filter(function (time) {
    var start = timeToMinutes(time);
    return start != null && start >= rangeStart && start + durationMinutes <= rangeEnd;
  }).map(function (time) {
    var slotStart = new Date(options.serviceDate + 'T' + time + ':00');
    var slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
    var reason = '';
    if (options.serviceDate === today && slotStart.getTime() <= now.getTime()) {
      reason = 'past';
    } else {
      var occupied = (options.blockedSlots || []).some(function (item) {
        if (options.excludeOrderId && String(item.orderId) === String(options.excludeOrderId)) return false;
        return intervalsOverlap(slotStart, slotEnd, new Date(item.startTime), new Date(item.endTime));
      });
      if (occupied) reason = 'occupied';
    }
    return { time: time, occupied: Boolean(reason), reason: reason };
  });
}

module.exports = {
  activeScheduleForDate: activeScheduleForDate,
  buildSlotStatuses: buildSlotStatuses,
  intervalsOverlap: intervalsOverlap,
  shopHoursForDate: shopHoursForDate,
  timeToMinutes: timeToMinutes
};
