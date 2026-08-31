import { BadRequestException, NotFoundException, Injectable } from '@nestjs/common';
import { workShareFunnel } from './work-share-funnel';
import { PrismaService } from '../common/prisma/prisma.service';
import { calculateCustomerLifecycle } from '../customers/customer-lifecycle';

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

function dateKey(date: Date) {
  return new Date(date.getTime() + CHINA_OFFSET_MS).toISOString().slice(0, 10);
}

function weekKey(date: Date) {
  const local = new Date(date.getTime() + CHINA_OFFSET_MS);
  const day = local.getUTCDay() || 7;
  local.setUTCDate(local.getUTCDate() - day + 1);
  return local.toISOString().slice(0, 10);
}

function recognizedOrderAmount(order: {
  status: string;
  actualAmount: number | null;
  quotePrice: number | null;
  fundDiscountAmount: number;
  depositAmount: number | null;
  paidAmount: number;
}) {
  const payable = Math.max(
    0,
    order.actualAmount ??
      (order.quotePrice ?? 0) - order.fundDiscountAmount,
  );
  if (order.status === 'completed') return payable;

  const deposit = Math.max(0, order.depositAmount ?? order.paidAmount);
  return payable > 0 ? Math.min(deposit, payable) : deposit;
}

@Injectable()
export class TechnicianInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(technicianId: number, now = new Date(), month?: string) {
    const generatedAt = now;
    let selectable: { selectedMonth: string; minMonth: string; maxMonth: string } | null = null;
    if (month !== undefined) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('月份格式应为 YYYY-MM');
      const technician = await this.prisma.technician.findUnique({ where: { id: technicianId }, select: { createdAt: true } });
      if (!technician) throw new NotFoundException('美甲师不存在');
      const minMonth = dateKey(technician.createdAt).slice(0, 7);
      const maxMonth = dateKey(now).slice(0, 7);
      if (month < minMonth || month > maxMonth) throw new BadRequestException('只能选择注册月份至当前月份');
      selectable = { selectedMonth: month, minMonth, maxMonth };
      if (month !== maxMonth) {
        const [year, m] = month.split('-').map(Number);
        now = new Date(Date.UTC(year, m, 1) - CHINA_OFFSET_MS - 1);
      }
    }
    const { todayStart, tomorrowStart, monthStart, nextMonthStart } =
      periodBoundaries(now);
    const range = { gte: monthStart, lt: new Date(Math.min(nextMonthStart.getTime(), now.getTime() + 1)) };
    const monthCreated = selectable ? { createdAt: range } : {};
    const cutoff = selectable ? { createdAt: { lt: range.lt } } : {};

    const [
      todayBookings,
      monthCompleted,
      pendingBookings,
      orderStatuses,
      totalCustomers,
      newCustomers,
      completedByCustomer,
      recognizedOrders,
      rating,
      works,
      completedServiceDates,
      referralTotal,
      referralQualified,
      referralRevenue,
      fundIssued,
      fundRedeemed,
      recentRevenues,
      recentCustomers,
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
        where: { technicianId, status: { in: PENDING_STATUSES }, ...monthCreated },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { technicianId, ...monthCreated },
        _count: { id: true },
      }),
      this.prisma.customer.count({ where: { technicianId, ...cutoff } }),
      this.prisma.customer.count({
        where: {
          technicianId,
          createdAt: { gte: monthStart, lt: nextMonthStart },
        },
      }),
      this.prisma.order.groupBy({
        by: ['customerId'],
        where: { technicianId, status: 'completed', ...(selectable ? { completedAt: range } : {}) },
        _count: { id: true },
      }),
      this.prisma.order.findMany({
        where: {
          technicianId,
          OR: [
            {
              status: 'completed',
              completedAt: { gte: monthStart, lt: nextMonthStart },
            },
            {
              isDepositPaid: true,
              depositConfirmedAt: { gte: monthStart, lt: nextMonthStart },
              status: { notIn: ['completed', 'cancelled', 'expired'] },
            },
            {
              status: 'cancelled',
              depositStatus: 'forfeited',
              cancelledAt: { gte: monthStart, lt: nextMonthStart },
            },
          ],
        },
        select: {
          status: true,
          actualAmount: true,
          quotePrice: true,
          fundDiscountAmount: true,
          depositAmount: true,
          paidAmount: true,
        },
      }),
      this.prisma.serviceReview.aggregate({
        where: { technicianId, ...monthCreated },
        _avg: { rating: true },
        _count: { id: true },
      }),
      this.prisma.nailWork.count({ where: { techId: technicianId, ...monthCreated } }),
      this.prisma.order.findMany({
        where: {
          technicianId,
          status: 'completed',
          completedAt: { not: null, ...(selectable ? { lt: range.lt } : {}) },
        },
        select: {
          customerId: true,
          completedAt: true,
          customer: { select: { name: true } },
        },
      }),
      this.prisma.referralRelation.count({ where: { technicianId, ...monthCreated } }),
      this.prisma.referralRelation.count({
        where: { technicianId, status: 'qualified', ...(selectable ? { qualification: { qualifiedAt: range } } : {}) },
      }),
      this.prisma.referralQualification.aggregate({
        where: { relation: { technicianId }, ...(selectable ? { qualifiedAt: range } : {}) },
        _sum: { paidAmount: true },
      }),
      this.prisma.rewardLedger.aggregate({
        where: {
          account: { technicianId },
          entryType: 'referral_reward',
          ...monthCreated,
        },
        _sum: { amount: true },
      }),
      this.prisma.rewardLedger.aggregate({
        where: {
          account: { technicianId },
          entryType: 'fund_redemption',
          ...monthCreated,
        },
        _sum: { amount: true },
      }),
      this.prisma.revenue.findMany({
        where: {
          technicianId,
          status: 'confirmed',
          recognizedAt: {
            gte: selectable ? monthStart : new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
            lte: now,
          },
        },
        select: {
          amount: true,
          recognizedAt: true,
          customerId: true,
          customer: { select: { name: true } },
          order: {
            select: {
              customTitle: true,
              remark: true,
              serviceType: true,
              startTime: true,
            },
          },
        },
      }),
      this.prisma.customer.findMany({
        where: {
          technicianId,
          createdAt: {
            gte: selectable ? monthStart : new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
            lte: now,
          },
        },
        select: { createdAt: true },
      }),
    ]);

    const completedCustomers = completedByCustomer.length;
    const repeatCustomers = completedByCustomer.filter(
      (item) => item._count.id >= 2,
    ).length;
    const confirmedRevenue = recognizedOrders.reduce(
      (sum, order) => sum + recognizedOrderAmount(order),
      0,
    );
    const revenueOrders = recognizedOrders.length;
    const byStatus = Object.fromEntries(
      orderStatuses.map((item) => [item.status, item._count.id]),
    );
    const datesByCustomer = new Map<number, Date[]>();
    const customerNames = new Map<number, string>();
    for (const item of completedServiceDates) {
      if (!item.completedAt) continue;
      const dates = datesByCustomer.get(item.customerId) || [];
      dates.push(item.completedAt);
      datesByCustomer.set(item.customerId, dates);
      customerNames.set(item.customerId, item.customer.name);
    }
    const dueCustomers = [...datesByCustomer.values()].filter(
      (dates) => calculateCustomerLifecycle(dates, now).status === 'due',
    ).length;
    type TrendValue = { orders: number; revenue: number; newCustomers: number };
    const dailyMap = new Map<string, TrendValue>();
    const weeklyMap = new Map<string, TrendValue>();
    const serviceMap = new Map<string, { orders: number; revenue: number }>();
    const timeMap = new Map<string, { orders: number; revenue: number }>();
    const customerRevenue = new Map<
      number,
      { amount: number; count: number; name: string }
    >();
    for (const item of recentRevenues) {
      const day = dateKey(item.recognizedAt);
      const week = weekKey(item.recognizedAt);
      const service =
        item.order.customTitle ||
        item.order.remark ||
        item.order.serviceType ||
        '未分类服务';
      const hour = new Date(
        item.order.startTime.getTime() + CHINA_OFFSET_MS,
      ).getUTCHours();
      const time = hour < 12 ? '上午' : hour < 18 ? '下午' : '晚间';
      for (const [map, key] of [
        [dailyMap, day],
        [weeklyMap, week],
      ] as Array<[Map<string, TrendValue>, string]>) {
        const value = map.get(key) || {
          orders: 0,
          revenue: 0,
          newCustomers: 0,
        };
        value.orders += 1;
        value.revenue += item.amount;
        map.set(key, value);
      }
      for (const [map, key] of [
        [serviceMap, service],
        [timeMap, time],
      ] as Array<[Map<string, { orders: number; revenue: number }>, string]>) {
        const value = map.get(key) || { orders: 0, revenue: 0 };
        value.orders += 1;
        value.revenue += item.amount;
        map.set(key, value);
      }
      const customer = customerRevenue.get(item.customerId) || {
        amount: 0,
        count: 0,
        name: item.customer.name,
      };
      customer.amount += item.amount;
      customer.count += 1;
      customerRevenue.set(item.customerId, customer);
    }
    for (const customer of recentCustomers) {
      for (const [map, key] of [
        [dailyMap, dateKey(customer.createdAt)],
        [weeklyMap, weekKey(customer.createdAt)],
      ] as Array<[Map<string, TrendValue>, string]>) {
        const value = map.get(key) || {
          orders: 0,
          revenue: 0,
          newCustomers: 0,
        };
        value.newCustomers += 1;
        map.set(key, value);
      }
    }
    const series = (map: Map<string, TrendValue>) =>
      [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, value]) => ({ period, ...value }));
    const performance = (
      map: Map<string, { orders: number; revenue: number }>,
    ) =>
      [...map.entries()]
        .map(([name, value]) => ({ name, ...value }))
        .sort((a, b) => b.revenue - a.revenue);
    const reminderItems = [...datesByCustomer.entries()]
      .flatMap(([customerId, dates]) => {
        const lifecycle = calculateCustomerLifecycle(dates, now);
        const customer = customerRevenue.get(customerId);
        const items: Array<Record<string, unknown>> = [];
        if (['due', 'dormant'].includes(lifecycle.status)) {
          items.push({
            key: `${lifecycle.status}-${customerId}`,
            type: lifecycle.status,
            customerId,
            customerName:
              customer?.name || customerNames.get(customerId) || '客户',
            reason: lifecycle.reason,
            expectedNextServiceAt: lifecycle.expectedNextServiceAt,
          });
        }
        if (customer && customer.count >= 2 && customer.amount >= 500) {
          items.push({
            key: `high_value-${customerId}`,
            type: 'high_value',
            customerId,
            customerName: customer.name,
            reason: `${selectable ? '所选月份' : '最近 28 天'}完成 ${customer.count} 次服务，确认消费 ¥${customer.amount}`,
          });
        }
        return items;
      })
      .slice(0, 20);

    const conversionSince = selectable ? monthStart : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const [conversionEvents, shareEvents] = await Promise.all([
      this.prisma.conversionEvent.findMany({
        where: { technicianId, createdAt: { gte: conversionSince, lte: now } },
        select: {
          eventType: true,
          workId: true,
          visitorId: true,
          clientUserId: true,
          source: true,
        },
      }),
      this.prisma.nailWorkShareEvent.findMany({
        where: {
          work: { techId: technicianId },
          eventType: { in: ['share', 'share_intent'] },
          createdAt: { gte: conversionSince, lte: now },
        },
        select: { workId: true },
      }),
    ]);
    const countEvents = (
      type: string,
      predicate?: (item: (typeof conversionEvents)[number]) => boolean,
    ) =>
      conversionEvents.filter(
        (item) => item.eventType === type && (!predicate || predicate(item)),
      ).length;
    const artistViews = countEvents('artist_view');
    const artistBookingIntents = countEvents(
      'booking_intent',
      (item) => !item.workId,
    );
    const artistOrders = countEvents(
      'order_created',
      (item) => !item.workId && item.source === 'artist_home',
    );
    const follows = countEvents('follow');
    const workViews = countEvents('work_view');
    const workBookingIntents = countEvents('booking_intent', (item) =>
      Boolean(item.workId),
    );
    const workOrders = countEvents('order_created', (item) =>
      Boolean(item.workId),
    );
    const homepageMinimum = 20;
    const worksMinimum = 30;
    const safeRate = (value: number, base: number) =>
      base > 0 ? value / base : null;

    return {
      period: {
        timezone: BUSINESS_TIMEZONE,
        ...selectable,
        endExclusive: range.lt.toISOString(),
        monthStart: monthStart.toISOString(),
        generatedAt: generatedAt.toISOString(),
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
        dueForRepurchase: dueCustomers,
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
      referrals: {
        total: referralTotal,
        qualified: referralQualified,
        conversionRate:
          referralTotal > 0 ? referralQualified / referralTotal : null,
        qualifiedRevenue: referralRevenue._sum.paidAmount || 0,
      },
      funds: {
        issued: fundIssued._sum.amount || 0,
        redeemed: Math.abs(fundRedeemed._sum.amount || 0),
      },
      trends: {
        daily: series(dailyMap),
        weekly: series(weeklyMap),
        sampleSize: recentRevenues.length,
      },
      performance: {
        sufficientData: recentRevenues.length >= 5,
        minimumSampleSize: 5,
        services: recentRevenues.length >= 5 ? performance(serviceMap) : [],
        timeSlots: recentRevenues.length >= 5 ? performance(timeMap) : [],
      },
      reminders: reminderItems,
      conversion: {
        workShare: workShareFunnel(conversionEvents),
        periodDays: selectable ? Math.ceil((range.lt.getTime() - monthStart.getTime()) / 86400000) : 90,
        homepage: {
          sufficientData: artistViews >= homepageMinimum,
          minimumViews: homepageMinimum,
          views: artistViews,
          uniqueVisitors: new Set(
            conversionEvents
              .filter((item) => item.eventType === 'artist_view')
              .map((item) => item.visitorId)
              .filter(Boolean),
          ).size,
          follows,
          bookingIntents: artistBookingIntents,
          orders: artistOrders,
          rates:
            artistViews >= homepageMinimum
              ? {
                  followRate: safeRate(follows, artistViews),
                  bookingIntentRate: safeRate(
                    artistBookingIntents,
                    artistViews,
                  ),
                  orderRate: safeRate(artistOrders, artistViews),
                }
              : null,
        },
        works: {
          sufficientData: workViews >= worksMinimum,
          minimumViews: worksMinimum,
          views: workViews,
          shares: shareEvents.length,
          shareMetric: 'intent',
          bookingIntents: workBookingIntents,
          orders: workOrders,
          rates:
            workViews >= worksMinimum
              ? {
                  shareRate: safeRate(shareEvents.length, workViews),
                  bookingIntentRate: safeRate(workBookingIntents, workViews),
                  orderRate: safeRate(workOrders, workViews),
                }
              : null,
        },
      },
    };
  }
}
