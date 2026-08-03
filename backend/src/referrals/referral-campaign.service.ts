import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpsertReferralCampaignDto } from './dto/upsert-referral-campaign.dto';

@Injectable()
export class ReferralCampaignService {
  constructor(private prisma: PrismaService) {}

  async getForTechnician(technicianId: number, now: Date = new Date()) {
    const campaign = await this.prisma.referralCampaign.findUnique({
      where: { technicianId },
    });
    const rewardPromised = Boolean(
      campaign &&
        campaign.status === 'active' &&
        campaign.validFrom <= now &&
        campaign.validUntil >= now,
    );
    return {
      configured: Boolean(campaign),
      sharingAvailable: true,
      rewardPromised,
      rewardNotice: rewardPromised
        ? `好友满足条件后可获得 ¥${campaign!.rewardAmount} 美甲基金`
        : '当前分享不承诺推荐奖励',
      campaign,
    };
  }

  async upsertForTechnician(
    technicianId: number,
    dto: UpsertReferralCampaignDto,
  ) {
    await this.assertProfessionalPlan(technicianId);
    const validFrom = new Date(dto.validFrom);
    const validUntil = new Date(dto.validUntil);
    if (validUntil <= validFrom) {
      throw new BadRequestException('活动结束时间必须晚于开始时间');
    }
    const campaign = await this.prisma.referralCampaign.upsert({
      where: { technicianId },
      create: {
        technicianId,
        rewardAmount: dto.rewardAmount,
        minimumOrderAmount: dto.minimumOrderAmount,
        validFrom,
        validUntil,
        status: dto.status,
      },
      update: {
        rewardAmount: dto.rewardAmount,
        minimumOrderAmount: dto.minimumOrderAmount,
        validFrom,
        validUntil,
        status: dto.status,
      },
    });
    return this.getForTechnician(technicianId);
  }

  private async assertProfessionalPlan(technicianId: number) {
    const subscription =
      await this.prisma.technicianSubscription.findUnique({
        where: { technicianId },
        include: { plan: true },
      });
    const now = new Date();
    const active =
      subscription?.status === 'active' &&
      (!subscription.expiredAt || subscription.expiredAt >= now);
    let features: string[] = [];
    try {
      features = subscription?.plan.features
        ? JSON.parse(subscription.plan.features)
        : [];
    } catch {
      features = [];
    }
    const entitled =
      active &&
      (['pro', 'premium'].includes(subscription!.plan.code) ||
        features.includes('referral_campaign'));
    if (!entitled) {
      throw new ForbiddenException('推荐活动配置仅限专业版使用');
    }
  }
}
