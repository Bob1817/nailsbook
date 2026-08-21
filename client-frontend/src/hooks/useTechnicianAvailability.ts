import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Technician, ServiceSchedule } from '../services/auth';
import { orderService } from '../services/order';

export const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

function hasEffectiveWorkTime(sched?: ServiceSchedule | null): boolean {
  if (!sched) return false;
  if (Array.isArray(sched.schemes)) {
    const active = sched.schemes.find((s) => s.id === sched.activeSchemeId);
    return !!active && Array.isArray(active.days) && active.days.length > 0;
  }
  if (sched.selectedDates && sched.selectedDates.length > 0) return true;
  if (sched.days) return Object.values(sched.days).some((d) => d?.enabled);
  return false;
}

export interface SlotStatus {
  time: string;
  occupied: boolean;
}

interface SlotStatusOptions {
  /** 到店美甲：传入当天店铺营业时段；closed=true 当天歇业返回空数组 */
  shopHours?: { start: string; end: string; closed?: boolean } | null;
  /** 到店模式：以店铺营业时间为准，不叠加美甲师工时；店铺无营业时间则不限制 */
  shopMode?: boolean;
}

/**
 * 美甲师可预约性的单一来源：日历日期是否可约 + 每个时段是否被占用。
 * 逻辑与 CreateOrder / ChatBookingSheet 原内联实现等价。
 */
export function useTechnicianAvailability(technician: Technician | null) {
  const [blockedSlots, setBlockedSlots] = useState<{ startTime: string; endTime: string }[]>([]);

  const fetchBlocked = useCallback(() => {
    if (!technician) {
      setBlockedSlots([]);
      return;
    }
    orderService
      .getBlockedSlots(technician.id)
      .then(setBlockedSlots)
      .catch(() => setBlockedSlots([]));
  }, [technician]);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  const scheduleRange = useMemo(() => {
    const sched = technician?.serviceSchedule;
    if (!hasEffectiveWorkTime(sched) || !sched || !Array.isArray(sched.schemes)) return null;
    const active = sched.schemes.find((s) => s.id === sched.activeSchemeId);
    return active ? { start: active.startTime, end: active.endTime } : null;
  }, [technician]);

  const isDateAvailable = useCallback(
    (dateStr: string) => {
      const sched = technician?.serviceSchedule;
      if (!hasEffectiveWorkTime(sched) || !sched) return true;
      const weekday = new Date(`${dateStr}T00:00:00`).getDay();
      const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][weekday];
      if (Array.isArray(sched.schemes)) {
        if (sched.restDays?.includes(dateStr)) return false;
        const active = sched.schemes.find((s) => s.id === sched.activeSchemeId);
        return !!active && active.days.includes(dayKey);
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
      if (opts?.shopMode) {
        // 到店：以店铺营业时间为准（不叠加美甲师工时）；无营业时间则不限制
        if (opts.shopHours) {
          if (opts.shopHours.closed) return [];
          const s = timeToMinutes(opts.shopHours.start);
          const e = timeToMinutes(opts.shopHours.end);
          base = base.filter((t) => {
            const m = timeToMinutes(t);
            return m >= s && m < e;
          });
        }
      } else if (scheduleRange) {
        // 上门：按美甲师工时
        const s = timeToMinutes(scheduleRange.start);
        const e = timeToMinutes(scheduleRange.end);
        base = base.filter((t) => {
          const m = timeToMinutes(t);
          return m >= s && m < e;
        });
      }
      const now = Date.now();
      const td = new Date();
      const todayStr = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}-${String(td.getDate()).padStart(2, '0')}`;
      return base.map((time) => {
        const slotDt = new Date(`${dateStr}T${time}:00`);
        const isPast = dateStr === todayStr && slotDt.getTime() <= now;
        const occupied =
          isPast ||
          blockedSlots.some((b) => slotDt >= new Date(b.startTime) && slotDt < new Date(b.endTime));
        return { time, occupied };
      });
    },
    [scheduleRange, blockedSlots],
  );

  return { blockedSlots, isDateAvailable, getSlotStatuses, scheduleRange, refresh: fetchBlocked };
}
