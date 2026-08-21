import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PushService } from './push.service';

/// 全局推送模块：任意模块可直接注入 PushService。
@Global()
@Module({
  imports: [PrismaModule],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
