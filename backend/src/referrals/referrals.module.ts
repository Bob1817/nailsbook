import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ReferralCampaignController } from './referral-campaign.controller';
import { ReferralCampaignService } from './referral-campaign.service';
import {
  ClientReferralController,
  PublicReferralController,
  TechnicianReferralController,
} from './referral-relation.controller';
import { ReferralRelationService } from './referral-relation.service';
import { ReferralQualificationService } from './referral-qualification.service';
import {
  ClientRewardFundController,
  TechnicianRewardFundController,
} from './reward-fund.controller';
import { RewardFundService } from './reward-fund.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ReferralCampaignController,
    ClientReferralController,
    PublicReferralController,
    TechnicianReferralController,
    ClientRewardFundController,
    TechnicianRewardFundController,
  ],
  providers: [
    ReferralCampaignService,
    ReferralRelationService,
    ReferralQualificationService,
    RewardFundService,
  ],
  exports: [
    ReferralCampaignService,
    ReferralRelationService,
    ReferralQualificationService,
    RewardFundService,
  ],
})
export class ReferralsModule {}
