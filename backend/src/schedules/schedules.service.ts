import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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

  @Cron(CronExpression.EVERY_HOUR)
  async handleQuoteExpiration() {
    this.logger.log('Running quote expiration check...');

    const now = new Date();

    const expiredQuotes = await this.prisma.quote.findMany({
      where: {
        status: 'pending',
        expiredAt: { lt: now },
      },
    });

    for (const quote of expiredQuotes) {
      await this.prisma.quote.update({
        where: { id: quote.id },
        data: { status: 'expired' },
      });

      this.logger.log(`Quote ${quote.id} expired`);
    }

    this.logger.log(`Processed ${expiredQuotes.length} expired quotes`);
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
      totalBookings,
      completedBookings,
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
      this.prisma.booking.count({
        where: {
          createdAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      }),
      this.prisma.booking.count({
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
    this.logger.log(`- Total Bookings: ${totalBookings}`);
    this.logger.log(`- Completed Bookings: ${completedBookings}`);
    this.logger.log(`- Total Revenue: ${totalRevenue._sum.amount || 0}`);
  }
}
