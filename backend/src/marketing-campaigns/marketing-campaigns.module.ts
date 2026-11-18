import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ChatModule } from '../chat/chat.module';
import { MarketingCampaignsService } from './marketing-campaigns.service';
import { MarketingNoticesController } from './marketing-notices.controller';
import { MarketingActivitiesController } from './marketing-activities.controller';
import { ClientActivitiesController } from './client-activities.controller';
import { MarketingSchedulerService } from './marketing-scheduler.service';

@Module({
  imports: [PrismaModule, ChatModule],
  controllers: [
    MarketingNoticesController,
    MarketingActivitiesController,
    ClientActivitiesController,
  ],
  providers: [MarketingCampaignsService, MarketingSchedulerService],
  exports: [MarketingCampaignsService],
})
export class MarketingCampaignsModule {}
