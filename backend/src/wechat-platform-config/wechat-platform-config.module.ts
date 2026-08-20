import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import {
  AdminWechatPlatformConfigController,
  PublicCapabilitiesController,
  PublicLaunchConfigController,
} from './wechat-platform-config.controller';
import { WechatPlatformConfigService } from './wechat-platform-config.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [
    AdminWechatPlatformConfigController,
    PublicCapabilitiesController,
    PublicLaunchConfigController,
  ],
  providers: [WechatPlatformConfigService],
  exports: [WechatPlatformConfigService],
})
export class WechatPlatformConfigModule {}
