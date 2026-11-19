import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import {
  AdminPlatformCampaignsController,
  PublicPlatformCampaignsController,
} from './platform-campaigns.controller';
import { PlatformCampaignsService } from './platform-campaigns.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminPlatformCampaignsController,
    PublicPlatformCampaignsController,
  ],
  providers: [PlatformCampaignsService],
  exports: [PlatformCampaignsService],
})
export class PlatformCampaignsModule {}
