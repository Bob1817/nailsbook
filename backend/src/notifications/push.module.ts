import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PushService } from './push.service';
import { DingtalkAlertService } from './dingtalk-alert.service';

/// 全局推送模块：任意模块可直接注入 PushService 或 DingtalkAlertService。
@Global()
@Module({
  imports: [PrismaModule],
  providers: [PushService, DingtalkAlertService],
  exports: [PushService, DingtalkAlertService],
})
export class PushModule {}
