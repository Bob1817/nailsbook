import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import {
  SubscriptionPlansController,
  TechnicianSubscriptionsController,
  TechnicianSubscriptionsPublicController,
} from './subscriptions.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [
    SubscriptionPlansController,
    TechnicianSubscriptionsController,
    TechnicianSubscriptionsPublicController,
  ],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
