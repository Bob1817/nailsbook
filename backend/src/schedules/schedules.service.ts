import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(private prisma: PrismaService) {}

  @Cron('0 10 0 * * *')
  async handleSubscriptionExpiration() {
    this.logger.log('Running subscription expiration check...');

    const now = new Date();

    const expiredSubscriptions = await this.prisma.technicianSubscription.findMany({
      where: {
        status: 'active',
        expiredAt: { lt: now },
      },
    });

    for (const sub of expiredSubscriptions) {
      await this.prisma.technicianSubscription.update({
        where: { id: sub.id },
        data: { status: 'expired' },
      });

      this.logger.log(`Subscription ${sub.id} expired for technician ${sub.technicianId}`);
    }

    this.logger.log(`Processed ${expiredSubscriptions.length} expired subscriptions`);
  }

  @Cron('0 0 1 * * *')
  async generateMonthlyReport() {
    this.logger.log('Generating monthly report...');

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [
      newTechnicians,
      newCustomers,
      totalOrders,
      completedOrders,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.technician.count({
        where: {
          createdAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      }),
      this.prisma.customer.count({
        where: {
          createdAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      }),
      this.prisma.order.count({
        where: {
          createdAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      }),
      this.prisma.order.count({
        where: {
          status: 'completed',
          completedAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      }),
      this.prisma.revenue.aggregate({
        where: {
          recognizedAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
        _sum: { amount: true },
      }),
    ]);

    this.logger.log(`Monthly Report for ${firstDayOfMonth.toISOString().split('T')[0]}:`);
    this.logger.log(`- New Technicians: ${newTechnicians}`);
    this.logger.log(`- New Customers: ${newCustomers}`);
    this.logger.log(`- Total Orders: ${totalOrders}`);
    this.logger.log(`- Completed Orders: ${completedOrders}`);
    this.logger.log(`- Total Revenue: ${totalRevenue._sum.amount || 0}`);
  }
}
