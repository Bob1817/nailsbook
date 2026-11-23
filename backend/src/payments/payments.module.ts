import { ChatModule } from '../chat/chat.module';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import {
  ClientPaymentsController,
  WechatPaymentNotificationController,
} from './payments.controller';
import { PaymentsService } from './payments.service';
import { ReferralsModule } from '../referrals/referrals.module';
import { WechatPayService } from './wechat-pay.service';
import { WechatAuthModule } from '../wechat-auth/wechat-auth.module';

@Module({
  imports: [PrismaModule, ReferralsModule, ChatModule, WechatAuthModule],
  controllers: [ClientPaymentsController, WechatPaymentNotificationController],
  providers: [PaymentsService, WechatPayService],
  exports: [PaymentsService, WechatPayService],
})
export class PaymentsModule {}
