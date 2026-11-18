import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MarketingCampaignsService } from './marketing-campaigns.service';

@Injectable()
export class MarketingSchedulerService {
  private readonly logger = new Logger(MarketingSchedulerService.name);

  constructor(private readonly service: MarketingCampaignsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledAndExpiredJobs() {
    try {
      const res = await this.service.handleScheduledAndExpiredJobs();
      if (
        res.dispatchedNotices > 0 ||
        res.dispatchedActivities > 0 ||
        res.expiredActivities > 0
      ) {
        this.logger.log(
          `[MarketingScheduler] 执行完成: 已发送通知 ${res.dispatchedNotices} 篇，已发布活动 ${res.dispatchedActivities} 篇，已到期活动 ${res.expiredActivities} 篇`,
        );
      }
    } catch (err: any) {
      this.logger.error(`[MarketingScheduler] 执行异常: ${err?.message}`, err?.stack);
    }
  }
}
