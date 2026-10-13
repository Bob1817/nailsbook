import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { BookingMutexService } from './booking-mutex.service';
import { getBusinessDateTimeParts, parseBusinessDateTime } from './business-time';
import { isLaunchTechnician } from '../common/miniprogram-launch-mode';

export const MIN_DAILY_BOOKING_LIMIT = 1;
export const MAX_DAILY_BOOKING_LIMIT = 10;
export const MIN_APPOINTMENT_BUFFER_MINUTES = 15;
export const MAX_APPOINTMENT_BUFFER_MINUTES = 180;
export const APPOINTMENT_BUFFER_STEP_MINUTES = 15;
export const DEFAULT_DAILY_BOOKING_LIMIT = 2;
export const DEFAULT_APPOINTMENT_BUFFER_MINUTES = 60;

export type BookingCapacityPolicy = {
  dailyBookingLimit: number;
  appointmentBufferMinutes: number;
};

function nextBusinessDate(serviceDate: string) {
  const start = parseBusinessDateTime(serviceDate, '00:00');
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export function withAppointmentBuffer(endTime: Date, minutes: number) {
  return new Date(endTime.getTime() + minutes * 60 * 1000);
}

export function businessDate(date: Date) {
  const p = getBusinessDateTimeParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export function assertBookingDate(value: string) {
  const date = parseBusinessDateTime(value, '00:00');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || businessDate(date) !== value) {
    throw new BadRequestException('预约日期无效');
  }
}

export function quickBookingEnabled(technicianId: number, configured?: boolean | null) {
  if (typeof configured === 'boolean') return configured;
  return Number.isInteger(technicianId) && technicianId > 0 && (process.env.QUICK_BOOKING_TECHNICIAN_IDS || '').split(',').some(id => Number(id.trim()) === technicianId);
}

export async function assertBookingDayOpen(tx: Prisma.TransactionClient, technicianId: number, serviceDate: string) {
  assertBookingDate(serviceDate);
  const day = await tx.technicianBookingDay.findUnique({ where: { technicianId_serviceDate: { technicianId, serviceDate } } });
  if (day && !day.accepting) throw new ConflictException('美甲师已停止当日接单，请选择其他日期');
}

@Injectable()
export class BookingDaysService {
  constructor(private readonly prisma: PrismaService, private readonly mutex: BookingMutexService) {}

  async settings(technicianId: number) {
    const technician = isLaunchTechnician(technicianId)
      ? await this.prisma.technician.findUnique({ where: { id: technicianId }, select: { id: true, quickBookingEnabled: true, depositMode: true, depositValue: true, dailyBookingLimit: true, appointmentBufferMinutes: true } })
      : null;
    if (!technician) {
      throw new NotFoundException('美甲师不存在');
    }
    const days = await this.prisma.technicianBookingDay.findMany({
      where: { technicianId, serviceDate: { gte: businessDate(new Date()) } },
      select: { serviceDate: true, accepting: true, version: true },
      orderBy: { serviceDate: 'asc' },
    });
    const today = parseBusinessDateTime(businessDate(new Date()), '00:00');
    const [blockedSlots, capacitySlots] = await Promise.all([
      this.prisma.blockedTimeSlot.findMany({ where: { techId: technicianId, endTime: { gte: new Date() } }, select: { orderId: true, startTime: true, endTime: true } }),
      this.prisma.blockedTimeSlot.findMany({ where: { techId: technicianId, orderId: { not: null }, startTime: { gte: today } }, select: { orderId: true, startTime: true } }),
    ]);
    // Aggregate per-service deposit as a reference total (actual booking uses per-service calculation)
    const services = await this.prisma.service.findMany({
      where: { technicianId, archivedAt: null, isBookable: true, depositMode: { not: 'none' } },
      select: { priceMinFen: true, depositMode: true, depositValue: true },
    });
    let totalDepositFen = 0;
    for (const svc of services) {
      if (svc.depositMode === 'fixed' && svc.depositValue > 0) {
        totalDepositFen += svc.depositValue;
      } else if (svc.depositMode === 'percentage' && svc.depositValue > 0 && svc.priceMinFen) {
        totalDepositFen += Math.round(svc.priceMinFen * svc.depositValue / 10000);
      }
    }
    const depositMode = totalDepositFen > 0 ? 'fixed' : 'none';
    const depositValue = totalDepositFen;
    const bookingCounts = capacitySlots.reduce<Record<string, number>>((counts, slot: { orderId: number | null; startTime: Date }) => {
      const date = businessDate(slot.startTime);
      counts[date] = (counts[date] || 0) + 1;
      return counts;
    }, {});
    return {
      depositMode,
      depositValue,
      quickBookingEnabled: quickBookingEnabled(technicianId, technician.quickBookingEnabled),
      dailyBookingLimit: technician.dailyBookingLimit,
      appointmentBufferMinutes: technician.appointmentBufferMinutes,
      bookingCounts,
      days,
      blockedSlots,
    };
  }

  async updateSettings(technicianId: number, quickBookingEnabled: boolean) {
    return this.prisma.technician.update({
      where: { id: technicianId }, data: { quickBookingEnabled }, select: { quickBookingEnabled: true },
    });
  }

  async updateCapacity(
    technicianId: number,
    dailyBookingLimit: number,
    appointmentBufferMinutes: number,
  ) {
    if (!Number.isInteger(dailyBookingLimit) || dailyBookingLimit < MIN_DAILY_BOOKING_LIMIT || dailyBookingLimit > MAX_DAILY_BOOKING_LIMIT) {
      throw new BadRequestException('每日接待上限需设置为 1 至 10 人');
    }
    if (!Number.isInteger(appointmentBufferMinutes)
      || appointmentBufferMinutes < MIN_APPOINTMENT_BUFFER_MINUTES
      || appointmentBufferMinutes > MAX_APPOINTMENT_BUFFER_MINUTES
      || appointmentBufferMinutes % APPOINTMENT_BUFFER_STEP_MINUTES !== 0) {
      throw new BadRequestException('预约间隔需设置为 15 至 180 分钟，且以 15 分钟递增');
    }
    return this.prisma.technician.update({
      where: { id: technicianId },
      data: { dailyBookingLimit, appointmentBufferMinutes },
      select: { dailyBookingLimit: true, appointmentBufferMinutes: true },
    });
  }

  async prepareSlot(
    tx: Prisma.TransactionClient,
    technicianId: number,
    serviceDate: string,
    serviceEndTime: Date,
    excludeOrderId?: number,
    allowClosedDay = false,
  ) {
    if (!allowClosedDay) {
      await assertBookingDayOpen(tx, technicianId, serviceDate);
    }
    const technician = await tx.technician.findUnique({
      where: { id: technicianId },
      select: { dailyBookingLimit: true, appointmentBufferMinutes: true },
    });
    if (!technician) throw new NotFoundException('美甲师不存在');
    const bookingCount = await tx.blockedTimeSlot.count({
      where: {
        techId: technicianId,
        AND: [
          { orderId: { not: null } },
          ...(excludeOrderId ? [{ orderId: { not: excludeOrderId } }] : []),
        ],
        startTime: {
          gte: parseBusinessDateTime(serviceDate, '00:00'),
          lt: nextBusinessDate(serviceDate),
        },
      },
    });
    if (bookingCount >= technician.dailyBookingLimit) {
      throw new ConflictException('当日预约名额已满，请选择其他日期');
    }
    return {
      ...technician,
      bookingCount,
      blockEndTime: withAppointmentBuffer(
        serviceEndTime,
        technician.appointmentBufferMinutes,
      ),
    };
  }

  assertOpen(tx: Prisma.TransactionClient, technicianId: number, serviceDate: string) {
    return assertBookingDayOpen(tx, technicianId, serviceDate);
  }

  async save(tx: Prisma.TransactionClient, technicianId: number, serviceDate: string, accepting: boolean, version: number) {
    assertBookingDate(serviceDate);
    if (serviceDate < businessDate(new Date())) throw new BadRequestException('不能修改过去日期的接单设置');
    if (typeof accepting !== 'boolean' || !Number.isInteger(version) || version < 0) throw new BadRequestException('请确认当日是否继续接单');
    const where = { technicianId_serviceDate: { technicianId, serviceDate } };
    const current = await tx.technicianBookingDay.findUnique({ where });
    if ((current?.version ?? 0) !== version) throw new ConflictException('当日接单设置已更新，请刷新后重试');
    if (!current) return tx.technicianBookingDay.create({ data: { technicianId, serviceDate, accepting } });
    const changed = await tx.technicianBookingDay.updateMany({
      where: { id: current.id, version }, data: { accepting, version: { increment: 1 } },
    });
    if (!changed.count) throw new ConflictException('当日接单设置已更新，请刷新后重试');
    return tx.technicianBookingDay.findUnique({ where });
  }

  update(technicianId: number, serviceDate: string, accepting: boolean, version: number) {
    return this.mutex.runExclusive(technicianId, () => this.prisma.$transaction(tx => this.save(tx, technicianId, serviceDate, accepting, version)));
  }
}
