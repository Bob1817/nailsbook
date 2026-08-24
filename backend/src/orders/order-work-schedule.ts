import { BadRequestException } from '@nestjs/common';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

type ScheduleScheme = {
  id: string;
  days?: string[];
  startTime?: string;
  endTime?: string;
};

type ServiceSchedule = {
  schemes?: ScheduleScheme[];
  activeSchemeId?: string | null;
  restDays?: string[];
};

function minutes(value?: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function parseSchedule(raw?: string | null): ServiceSchedule {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    throw new BadRequestException('美甲师工作时间配置异常，请联系美甲师');
  }
}

export function assertWithinServiceSchedule(
  rawSchedule: string | null | undefined,
  serviceDate: string,
  startTime: string,
  durationMinutes: number,
) {
  const schedule = parseSchedule(rawSchedule);
  if ((schedule.restDays || []).includes(serviceDate)) {
    throw new BadRequestException('该日期为美甲师休息日，请选择其他日期');
  }

  const schemes = schedule.schemes || [];
  const active = schemes.find((item) => item.id === schedule.activeSchemeId);
  const scheme = active || (schemes.length === 0
    ? { id: 'default', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], startTime: '10:00', endTime: '21:00' }
    : null);
  if (!scheme) {
    throw new BadRequestException('美甲师尚未启用工作时间方案');
  }

  const date = new Date(`${serviceDate}T00:00:00`);
  if (Number.isNaN(date.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
    throw new BadRequestException('预约日期无效');
  }
  if (!(scheme.days || []).includes(DAY_KEYS[date.getDay()])) {
    throw new BadRequestException('该日期不在美甲师工作日内');
  }

  const bookingStart = minutes(startTime);
  const workingStart = minutes(scheme.startTime);
  const workingEnd = minutes(scheme.endTime);
  if (bookingStart == null || workingStart == null || workingEnd == null || workingEnd <= workingStart) {
    throw new BadRequestException('美甲师工作时间配置异常，请联系美甲师');
  }
  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0 ||
    bookingStart < workingStart ||
    bookingStart + durationMinutes > workingEnd
  ) {
    throw new BadRequestException('完整服务时间不在美甲师工作时间内');
  }
}
