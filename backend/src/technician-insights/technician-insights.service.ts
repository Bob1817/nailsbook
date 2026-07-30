import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const BUSINESS_TIMEZONE = 'Asia/Shanghai';
const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;
const PENDING_STATUSES = [
  'pending_quote',
  'pending_agree',
  'pending_client_confirm',
  'pending_confirm',
];

function periodBoundaries(now: Date) {
  const local = new Date(now.getTime() + CHINA_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = local.getUTCDate();

  return {
    todayStart: new Date(Date.UTC(year, month, day) - CHINA_OFFSET_MS),
    tomorrowStart: new Date(Date.UTC(year, month, day + 1) - CHINA_OFFSET_MS),
    monthStart: new Date(Date.UTC(year, month, 1) - CHINA_OFFSET_MS),
    nextMonthStart: new Date(Date.UTC(year, month + 1, 1) - CHINA_OFFSET_MS),
  };
}

@Injectable()
export class TechnicianInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(technicianId: number, now = new Date()) {
    const { todayStart, tomorrowStart, monthStart, nextMonthStart } =
      periodBoundaries(now);

    const [
      todayBookings,
      monthCompleted,
      pendingBookings,
      orderStatuses,
      totalCustomers,
      newCustomers,
      completedByCustomer,
      monthRevenue,
      rating,
      works,
    ] = await Promise.all([
      this.prisma.order.count({
        where: {
          technicianId,
          startTime: { gte: todayStart, lt: tomorrowStart },
          status: { notIn: ['cancelled', 'expired'] },
        },
      }),
      this.prisma.order.count({
        where: {
          technicianId,
          status: 'completed',
          completedAt: { gte: monthStart, lt: nextMonthStart },
        },
      }),
      this.prisma.order.count({
        where: { technicianId, status: { in: PENDING_STATUSES } },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { technicianId },
        _count: { id: true },
      }),
      this.prisma.customer.count({ where: { technicianId } }),
      this.prisma.customer.count({
        where: {
          technicianId,
          createdAt: { gte: monthStart, lt: nextMonthStart },
        },
      }),
      this.prisma.order.groupBy({
        by: ['customerId'],
        where: { technicianId, status: 'completed' },
        _count: { id: true },
      }),
      this.prisma.revenue.aggregate({
        where: {
          technicianId,
          status: 'confirmed',
          recognizedAt: { gte: monthStart, lt: nextMonthStart },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.serviceReview.aggregate({
        where: { technicianId },
        _avg: { rating: true },
        _count: { id: true },
      }),
      this.prisma.nailWork.count({ where: { techId: technicianId } }),
    ]);

    const completedCustomers = completedByCustomer.length;
    const repeatCustomers = completedByCustomer.filter(
      (item) => item._count.id >= 2,
    ).length;
    const confirmedRevenue = monthRevenue._sum.amount || 0;
    const revenueOrders = monthRevenue._count.id;
    const byStatus = Object.fromEntries(
      orderStatuses.map((item) => [item.status, item._count.id]),
    );

    return {
      period: {
        timezone: BUSINESS_TIMEZONE,
        monthStart: monthStart.toISOString(),
        generatedAt: now.toISOString(),
      },
      bookings: {
        today: todayBookings,
        monthCompleted,
        pending: pendingBookings,
        byStatus,
      },
      customers: {
        total: totalCustomers,
        newThisMonth: newCustomers,
        completed: completedCustomers,
        repeat: repeatCustomers,
        repeatRate:
          completedCustomers > 0 ? repeatCustomers / completedCustomers : null,
      },
      revenue: {
        monthConfirmed: confirmedRevenue,
        averageTicket:
          revenueOrders > 0 ? confirmedRevenue / revenueOrders : null,
      },
      rating: {
        average: rating._avg.rating,
        count: rating._count.id,
      },
      works: {
        total: works,
      },
    };
  }
}
