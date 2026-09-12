import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { BookingMutexService } from './booking-mutex.service';
import { getBusinessDateTimeParts, parseBusinessDateTime } from './business-time';
import { isLaunchTechnician } from '../common/miniprogram-launch-mode';

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
      ? await this.prisma.technician.findUnique({ where: { id: technicianId }, select: { id: true, quickBookingEnabled: true, depositMode: true, depositValue: true } })
      : null;
    if (!technician) {
      throw new NotFoundException('美甲师不存在');
    }
    const days = await this.prisma.technicianBookingDay.findMany({
      where: { technicianId, serviceDate: { gte: businessDate(new Date()) } },
      select: { serviceDate: true, accepting: true, version: true },
      orderBy: { serviceDate: 'asc' },
    });
    const blockedSlots = await this.prisma.blockedTimeSlot.findMany({ where: { techId: technicianId, endTime: { gte: new Date() } }, select: { startTime: true, endTime: true } });
    return { depositMode: technician.depositMode, depositValue: technician.depositValue, quickBookingEnabled: quickBookingEnabled(technicianId, technician.quickBookingEnabled), days, blockedSlots };
  }

  async updateSettings(technicianId: number, quickBookingEnabled: boolean) {
    return this.prisma.technician.update({
      where: { id: technicianId }, data: { quickBookingEnabled }, select: { quickBookingEnabled: true },
    });
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
