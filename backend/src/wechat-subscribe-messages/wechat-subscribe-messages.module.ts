import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsService } from './admin-notifications.service';
import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import {
  ClientWechatSubscribeController,
  TechnicianWechatSubscribeController,
} from './wechat-subscribe-messages.controller';
import { WechatSubscribeMessagesService } from './wechat-subscribe-messages.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [
    AdminNotificationsController,
    ClientWechatSubscribeController,
    TechnicianWechatSubscribeController,
  ],
  providers: [WechatSubscribeMessagesService, AdminNotificationsService],
  exports: [WechatSubscribeMessagesService],
})
export class WechatSubscribeMessagesModule {}
