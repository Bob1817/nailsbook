import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Technician } from '../services/auth';
import { orderService } from '../services/order';

export const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30',
];

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

export interface SlotStatus {
  time: string;
  occupied: boolean;
}

interface SlotStatusOptions {
  /** 到店美甲：传入当天店铺营业时段；closed=true 当天歇业返回空数组 */
  shopHours?: { start: string; end: string; closed?: boolean } | null;
}

/**
 * 美甲师可预约性的单一来源：日历日期是否可约 + 每个时段是否被占用。
 * 逻辑与 CreateOrder / ChatBookingSheet 原内联实现等价。
 */
export function useTechnicianAvailability(technician: Technician | null) {
  const [blockedSlots, setBlockedSlots] = useState<{ startTime: string; endTime: string }[]>([]);

  useEffect(() => {
    let active = true;
    if (!technician) {
      setBlockedSlots([]);
      return;
    }
    orderService
      .getBlockedSlots(technician.id)
      .then((list) => active && setBlockedSlots(list))
      .catch(() => active && setBlockedSlots([]));
    return () => {
      active = false;
    };
  }, [technician]);

  const scheduleRange = useMemo(() => {
    const sched = technician?.serviceSchedule;
    if (!sched || !Array.isArray(sched.schemes)) return null;
    const active = sched.schemes.find((s) => s.id === sched.activeSchemeId);
    return active ? { start: active.startTime, end: active.endTime } : null;
  }, [technician]);

  const isDateAvailable = useCallback(
    (dateStr: string) => {
      const sched = technician?.serviceSchedule;
      if (!sched) return true;
      const weekday = new Date(`${dateStr}T00:00:00`).getDay();
      const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][weekday];
      if (Array.isArray(sched.schemes)) {
        if (sched.restDays?.includes(dateStr)) return false;
        const active = sched.schemes.find((s) => s.id === sched.activeSchemeId);
        if (!active) return false;
        return active.days.includes(dayKey);
      }
      if (sched.selectedDates && sched.selectedDates.length > 0)
        return sched.selectedDates.includes(dateStr);
      return sched.days?.[dayKey]?.enabled ?? true;
    },
    [technician],
  );

  const getSlotStatuses = useCallback(
    (dateStr: string, opts?: SlotStatusOptions): SlotStatus[] => {
      let base = TIME_SLOTS;
      if (opts?.shopHours) {
        if (opts.shopHours.closed) return [];
        const s = timeToMinutes(opts.shopHours.start);
        const e = timeToMinutes(opts.shopHours.end);
        base = base.filter((t) => {
          const m = timeToMinutes(t);
          return m >= s && m < e;
        });
      }
      if (scheduleRange) {
        const s = timeToMinutes(scheduleRange.start);
        const e = timeToMinutes(scheduleRange.end);
        base = base.filter((t) => {
          const m = timeToMinutes(t);
          return m >= s && m < e;
        });
      }
      return base.map((time) => {
        const slotDt = new Date(`${dateStr}T${time}:00`);
        const occupied = blockedSlots.some(
          (b) => slotDt >= new Date(b.startTime) && slotDt < new Date(b.endTime),
        );
        return { time, occupied };
      });
    },
    [scheduleRange, blockedSlots],
  );

  return { blockedSlots, isDateAvailable, getSlotStatuses, scheduleRange };
}
