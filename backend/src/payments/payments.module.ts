import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import {
  ClientPaymentsController,
  WechatPaymentNotificationController,
} from './payments.controller';
import { PaymentsService } from './payments.service';
import { ReferralsModule } from '../referrals/referrals.module';
import { WechatPayService } from './wechat-pay.service';

@Module({
  imports: [PrismaModule, ReferralsModule],
  controllers: [ClientPaymentsController, WechatPaymentNotificationController],
  providers: [PaymentsService, WechatPayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
