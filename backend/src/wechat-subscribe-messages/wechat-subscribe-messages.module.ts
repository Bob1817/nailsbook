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
    ClientWechatSubscribeController,
    TechnicianWechatSubscribeController,
  ],
  providers: [WechatSubscribeMessagesService],
  exports: [WechatSubscribeMessagesService],
})
export class WechatSubscribeMessagesModule {}
