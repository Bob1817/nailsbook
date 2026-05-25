import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
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
      activeSubscriptions,
      recentOrders,
      recentRevenues,
    ] = await Promise.all([
      this.prisma.technician.count(),
      this.prisma.technician.count({ where: { status: 'active' } }),
      this.prisma.customer.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'pending_confirm' } }),
      this.prisma.order.count({ where: { status: 'pending_home' } }),
      this.prisma.order.count({ where: { status: 'pending_shop' } }),
      this.prisma.order.count({ where: { status: 'completed' } }),
      this.prisma.revenue.aggregate({ _sum: { amount: true } }),
      this.prisma.technicianSubscription.count(),
      this.prisma.technicianSubscription.count({ where: { status: 'active' } }),
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
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      newTechniciansLast30Days,
      newCustomersLast30Days,
      revenueLast30Days,
    ] = await Promise.all([
      this.prisma.technician.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.customer.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.revenue.aggregate({
        where: { recognizedAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
    ]);

    const subscriptionByPlan = await this.prisma.technicianSubscription.groupBy(
      {
        by: ['planId'],
        _count: { id: true },
        where: { status: 'active' },
      },
    );

    const plans = await this.prisma.subscriptionPlan.findMany();
    const subscriptionStats = subscriptionByPlan.map((item) => {
      const plan = plans.find((p) => p.id === item.planId);
      return {
        planId: item.planId,
        planName: plan?.name || 'Unknown',
        planCode: plan?.code || 'unknown',
        count: item._count.id,
      };
    });

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
        pending: pendingOrders,
        pendingHome,
        pendingShop,
        completed: completedOrders,
      },
      revenueStats: {
        total: totalRevenue._sum.amount || 0,
        last30Days: revenueLast30Days._sum.amount || 0,
      },
      subscriptionStats: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        byPlan: subscriptionStats,
      },
      recentOrders,
      recentRevenues,
    };
  }

  async getBusinessStats(startDate?: string, endDate?: string) {
    const where: any = {};

    if (startDate || endDate) {
      where.recognizedAt = {};
      if (startDate) {
        where.recognizedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.recognizedAt.lte = new Date(endDate);
      }
    }

    const dailyRevenue = await this.prisma.$queryRaw`
      SELECT 
        date(recognizedAt) as date,
        SUM(amount) as totalAmount,
        COUNT(*) as count
      FROM Revenue
      WHERE status = 'confirmed'
      GROUP BY date(recognizedAt)
      ORDER BY date(recognizedAt) DESC
      LIMIT 30
    `;

    const topTechnicians = await this.prisma.revenue.groupBy({
      by: ['technicianId'],
      where: { status: 'confirmed' },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    const technicianIds = topTechnicians.map((t) => t.technicianId);
    const technicians = await this.prisma.technician.findMany({
      where: { id: { in: technicianIds } },
      select: { id: true, name: true, phone: true },
    });

    const topTechniciansWithInfo = topTechnicians.map((t) => {
      const tech = technicians.find((tr) => tr.id === t.technicianId);
      return {
        technicianId: t.technicianId,
        technicianName: tech?.name || 'Unknown',
        totalRevenue: t._sum.amount || 0,
        orderCount: t._count.id,
      };
    });

    return {
      dailyRevenue,
      topTechnicians: topTechniciansWithInfo,
    };
  }
}
