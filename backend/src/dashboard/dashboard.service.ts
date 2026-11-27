import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const [
      totalTechnicians,
      activeTechnicians,
      totalCustomers,
      totalOrders,
      pendingOrders,
      pendingHome,
      pendingShop,
      completedOrders,
      totalRevenue,
      totalSubscriptions,
      expiringIn7Days,
      recentOrders,
      recentRevenues,
      pendingApplications,
      pendingWorks,
      pendingDeletions,
      pendingReports,
      pendingFeedbacks,
      newTechniciansLast30Days,
      newCustomersLast30Days,
      ordersLast30Days,
      revenueLast30Days,
      subPaymentTotal,
      subPaymentLast30Days,
    ] = await Promise.all([
      this.prisma.technician.count({ where: { isDemo: false, status: { not: 'deleted' } } }),
      this.prisma.technician.count({ where: { isDemo: false, status: 'active' } }),
      this.prisma.customer.count({ where: { technician: { isDemo: false } } }),
      this.prisma.order.count({ where: { technician: { isDemo: false } } }),
      this.prisma.order.count({ where: { status: 'pending_confirm', technician: { isDemo: false } } }),
      this.prisma.order.count({ where: { status: 'pending_home', technician: { isDemo: false } } }),
      this.prisma.order.count({ where: { status: 'pending_shop', technician: { isDemo: false } } }),
      this.prisma.order.count({ where: { status: 'completed', technician: { isDemo: false } } }),
      this.prisma.revenue.aggregate({ where: { technician: { isDemo: false } }, _sum: { amount: true } }),
      this.prisma.technicianSubscription.count(),
      this.prisma.technicianSubscription.count({
        where: {
          status: 'active',
          expiredAt: { gte: now, lte: sevenDaysLater },
          plan: { price: { gt: 0 } },
        },
      }),
      this.prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          technician: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
        },
      }),
      this.prisma.revenue.findMany({
        take: 5,
        orderBy: { recognizedAt: 'desc' },
        include: {
          technician: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
        },
      }),
      this.prisma.artistApplication.count({ where: { status: 'pending' } }),
      this.prisma.nailWork.count({ where: { publicationStatus: 'pending' } }),
      this.prisma.accountDeletionRequest.count({ where: { status: 'pending' } }),
      this.prisma.nailWorkReport.count({ where: { status: 'pending' } }),
      this.prisma.feedback.count({ where: { status: 'pending' } }),
      this.prisma.technician.count({
        where: { isDemo: false, status: { not: 'deleted' }, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.customer.count({
        where: { technician: { isDemo: false }, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.order.count({
        where: { technician: { isDemo: false }, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.revenue.aggregate({
        where: { technician: { isDemo: false }, recognizedAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
      this.prisma.paymentOrder.aggregate({
        where: { paymentType: 'subscription', status: 'paid' },
        _sum: { amountCents: true },
        _count: { id: true },
      }),
      this.prisma.paymentOrder.aggregate({
        where: {
          paymentType: 'subscription',
          status: 'paid',
          paidAt: { gte: thirtyDaysAgo },
        },
        _sum: { amountCents: true },
        _count: { id: true },
      }),
    ]);

    const activePlans = await this.prisma.subscriptionPlan.findMany({
      where: { status: 'active' },
      orderBy: { price: 'asc' },
    });

    const subscriptionByPlan = await this.prisma.technicianSubscription.groupBy(
      {
        by: ['planId'],
        _count: { id: true },
        where: {
          status: 'active',
          technician: { status: { not: 'deleted' } },
        },
      },
    );

    const totalActiveSubs = subscriptionByPlan.reduce(
      (acc, curr) => acc + curr._count.id,
      0,
    );

    let paidActive = 0;
    let freeActive = 0;
    let mrr = 0;

    const subscriptionStats = activePlans.map((plan) => {
      const found = subscriptionByPlan.find((item) => item.planId === plan.id);
      const count = found?._count.id || 0;
      if (plan.price > 0) {
        paidActive += count;
        mrr += plan.price * count;
      } else {
        freeActive += count;
      }
      return {
        planId: plan.id,
        planName: plan.name,
        planCode: plan.code,
        price: plan.price,
        billingCycle: plan.billingCycle,
        count,
        percentage:
          totalActiveSubs > 0
            ? Number(((count / totalActiveSubs) * 100).toFixed(1))
            : 0,
      };
    });

    const paidConversionRate =
      totalTechnicians > 0
        ? Number(((paidActive / totalTechnicians) * 100).toFixed(1))
        : 0;

    const governancePending =
      pendingWorks + pendingDeletions + pendingReports + pendingFeedbacks;

    return {
      technicianStats: {
        total: totalTechnicians,
        active: activeTechnicians,
        newLast30Days: newTechniciansLast30Days,
      },
      customerStats: {
        total: totalCustomers,
        newLast30Days: newCustomersLast30Days,
      },
      orderStats: {
        total: totalOrders,
        last30Days: ordersLast30Days,
        pending: pendingOrders,
        pendingHome,
        pendingShop,
        completed: completedOrders,
      },
      revenueStats: {
        total: totalRevenue._sum.amount || 0,
        last30Days: revenueLast30Days._sum.amount || 0,
      },
      subscriptionRevenueStats: {
        total: Number(((subPaymentTotal._sum.amountCents || 0) / 100).toFixed(2)),
        last30Days: Number(
          ((subPaymentLast30Days._sum.amountCents || 0) / 100).toFixed(2),
        ),
        paidOrdersCount: subPaymentTotal._count.id || 0,
        paidOrdersLast30Days: subPaymentLast30Days._count.id || 0,
      },
      subscriptionStats: {
        total: totalSubscriptions,
        active: totalActiveSubs,
        paidActive,
        freeActive,
        paidConversionRate,
        expiringIn7Days,
        mrr: Number(mrr.toFixed(2)),
        byPlan: subscriptionStats,
      },
      approvalStats: {
        pendingApplications,
        pendingWorks,
        pendingDeletions,
        pendingReports,
        pendingFeedbacks,
        totalPending: governancePending,
      },
      recentOrders,
      recentRevenues,
    };
  }

  async getBusinessStats(startDate?: string, endDate?: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const queryStartDate = startDate ? new Date(startDate) : thirtyDaysAgo;
    const queryEndDate = endDate ? new Date(endDate) : new Date();

    const formatDateStr = (date: Date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // 1. 美甲师入驻趋势
    const technicians = await this.prisma.technician.findMany({
      where: {
        isDemo: false,
        status: { not: 'deleted' },
        createdAt: { gte: queryStartDate, lte: queryEndDate },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const techDateMap = new Map<string, number>();
    for (const t of technicians) {
      if (!t.createdAt) continue;
      const dateKey = formatDateStr(t.createdAt);
      techDateMap.set(dateKey, (techDateMap.get(dateKey) || 0) + 1);
    }

    const dailyTechnicians = Array.from(techDateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 2. 订阅及订阅收入趋势
    const subscriptionOrders = await this.prisma.paymentOrder.findMany({
      where: {
        paymentType: 'subscription',
        status: 'paid',
        paidAt: { gte: queryStartDate, lte: queryEndDate },
      },
      select: { amountCents: true, paidAt: true },
      orderBy: { paidAt: 'asc' },
    });

    const subRevMap = new Map<string, { totalAmount: number; count: number }>();
    for (const order of subscriptionOrders) {
      if (!order.paidAt) continue;
      const dateKey = formatDateStr(order.paidAt);
      const current = subRevMap.get(dateKey) || { totalAmount: 0, count: 0 };
      current.totalAmount += (order.amountCents || 0) / 100;
      current.count += 1;
      subRevMap.set(dateKey, current);
    }

    const dailySubscriptionRevenue = Array.from(subRevMap.entries())
      .map(([date, val]) => ({
        date,
        totalAmount: Number(val.totalAmount.toFixed(2)),
        count: val.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 3. 预约履约确认收入
    const revenues = await this.prisma.revenue.findMany({
      where: {
        status: 'confirmed',
        technician: { isDemo: false },
        recognizedAt: { gte: queryStartDate, lte: queryEndDate },
      },
      select: { amount: true, recognizedAt: true },
      orderBy: { recognizedAt: 'asc' },
    });

    const revDateMap = new Map<string, { totalAmount: number; count: number }>();
    for (const r of revenues) {
      if (!r.recognizedAt) continue;
      const dateKey = formatDateStr(r.recognizedAt);
      const current = revDateMap.get(dateKey) || { totalAmount: 0, count: 0 };
      current.totalAmount += Number(r.amount || 0);
      current.count += 1;
      revDateMap.set(dateKey, current);
    }

    const dailyRevenue = Array.from(revDateMap.entries())
      .map(([date, val]) => ({
        date,
        totalAmount: Number(val.totalAmount.toFixed(2)),
        count: val.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const topTechnicians = await this.prisma.revenue.groupBy({
      by: ['technicianId'],
      where: {
        status: 'confirmed',
        technician: { isDemo: false },
        recognizedAt: { gte: queryStartDate, lte: queryEndDate },
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    const technicianIds = topTechnicians.map((t) => t.technicianId);
    const topTechs = await this.prisma.technician.findMany({
      where: { id: { in: technicianIds } },
      select: { id: true, name: true, phone: true },
    });

    const topTechniciansWithInfo = topTechnicians.map((t) => {
      const tech = topTechs.find((tr) => tr.id === t.technicianId);
      return {
        technicianId: t.technicianId,
        technicianName: tech?.name || 'Unknown',
        totalRevenue: t._sum.amount || 0,
        orderCount: t._count.id,
      };
    });

    return {
      dailyTechnicians,
      dailySubscriptionRevenue,
      dailyRevenue,
      topTechnicians: topTechniciansWithInfo,
    };
  }
}
