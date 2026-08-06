import { Module } from '@nestjs/common';
import { RevenuesService } from './revenues.service';
import {
  RevenuesController,
  TechnicianRevenuesController,
} from './revenues.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [RevenuesController, TechnicianRevenuesController],
  providers: [RevenuesService],
  exports: [RevenuesService],
})
export class RevenuesModule {}
