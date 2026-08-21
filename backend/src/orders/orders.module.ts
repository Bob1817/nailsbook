import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ClientOrdersService } from './client-orders.service';
import { TechnicianOrdersController } from './technician-orders.controller';
import { ClientOrdersController } from './client-orders.controller';
import { PublicOrdersController } from './public-orders.controller';
import { OrdersScheduler } from './orders.scheduler';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ChatModule } from '../chat/chat.module';
import { BookingMutexService } from './booking-mutex.service';
import { ReferralsModule } from '../referrals/referrals.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PrismaModule, ChatModule, ReferralsModule, SubscriptionsModule],
  controllers: [
    TechnicianOrdersController,
    ClientOrdersController,
    PublicOrdersController,
  ],
  providers: [
    OrdersService,
    ClientOrdersService,
    OrdersScheduler,
    BookingMutexService,
  ],
  exports: [OrdersService, ClientOrdersService],
})
export class OrdersModule {}
