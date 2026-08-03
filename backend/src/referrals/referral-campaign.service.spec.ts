import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReferralCampaignService } from './referral-campaign.service';

describe('ReferralCampaignService', () => {
  const dto = {
    rewardAmount: 30,
    minimumOrderAmount: 199,
    validFrom: '2026-07-31T00:00:00.000Z',
    validUntil: '2026-09-01T00:00:00.000Z',
    status: 'active' as const,
  };

  it('专业版可配置活动并返回奖励承诺', async () => {
    const campaign = {
      id: 1,
      technicianId: 7,
      rewardAmount: 30,
      minimumOrderAmount: 199,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
      status: 'active',
    };
    const prisma = {
      technicianSubscription: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'active',
          expiredAt: new Date('2099-01-01T00:00:00.000Z'),
          plan: { code: 'pro', features: '[]' },
        }),
      },
      referralCampaign: {
        upsert: jest.fn().mockResolvedValue(campaign),
        findUnique: jest.fn().mockResolvedValue(campaign),
      },
    };
    const service = new ReferralCampaignService(prisma as never);

    const result = await service.upsertForTechnician(7, dto);

    expect(result).toEqual(
      expect.objectContaining({
        configured: true,
        sharingAvailable: true,
        rewardPromised: true,
      }),
    );
    expect(prisma.referralCampaign.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { technicianId: 7 },
        create: expect.objectContaining({
          rewardAmount: 30,
          minimumOrderAmount: 199,
        }),
      }),
    );
  });

  it('免费版不能配置活动', async () => {
    const prisma = {
      technicianSubscription: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'active',
          expiredAt: null,
          plan: { code: 'free', features: '[]' },
        }),
      },
    };
    const service = new ReferralCampaignService(prisma as never);

    await expect(service.upsertForTechnician(7, dto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('未配置或活动关闭时分享仍可用但不承诺奖励', async () => {
    const prisma = {
      referralCampaign: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new ReferralCampaignService(prisma as never);

    await expect(service.getForTechnician(7)).resolves.toEqual({
      configured: false,
      sharingAvailable: true,
      rewardPromised: false,
      rewardNotice: '当前分享不承诺推荐奖励',
      campaign: null,
    });
  });

  it('拒绝结束时间不晚于开始时间的活动', async () => {
    const prisma = {
      technicianSubscription: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'active',
          expiredAt: null,
          plan: { code: 'pro', features: '[]' },
        }),
      },
    };
    const service = new ReferralCampaignService(prisma as never);

    await expect(
      service.upsertForTechnician(7, {
        ...dto,
        validUntil: dto.validFrom,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
