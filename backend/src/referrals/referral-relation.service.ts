import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';

const REFERRAL_REWARD_NOTICE = '好友首个有效订单完成后，邀请人获得订单有效实付金额 5% 的美甲基金';

@Injectable()
export class ReferralRelationService {
  constructor(private readonly prisma: PrismaService) {}

  async createLink(clientId: number, technicianId?: number) {
    const binding = await this.prisma.clientTechBinding.findFirst({
      where: {
        clientId,
        status: 'active',
        ...(technicianId ? { techId: technicianId } : {}),
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    if (!binding) throw new BadRequestException('请先绑定该美甲师');
    const link = await this.prisma.referralLink.create({
      data: {
        token: randomBytes(24).toString('base64url'),
        referrerClientId: clientId,
        technicianId: binding.techId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return {
      token: link.token,
      path: `/pages/client/login/index?referral=${link.token}`,
      expiresAt: link.expiresAt,
      rewardPromised: true,
      rewardNotice: REFERRAL_REWARD_NOTICE,
    };
  }

  async resolve(token: string) {
    const link = await this.validLink(token);
    const technician = await this.prisma.technician.findUnique({
      where: { id: link.technicianId },
      select: { id: true, name: true, avatarUrl: true, invitationCode: true },
    });
    return {
      valid: true,
      technician,
      rewardPromised: true,
      rewardNotice: REFERRAL_REWARD_NOTICE,
    };
  }

  async claim(clientId: number, token: string) {
    const link = await this.validLink(token);
    if (link.referrerClientId === clientId) {
      throw new BadRequestException('不能推荐自己');
    }
    const binding = await this.prisma.clientTechBinding.findFirst({
      where: { clientId, techId: link.technicianId, status: 'active' },
    });
    if (!binding) throw new BadRequestException('请先完成与该美甲师的绑定');
    const existing = await this.prisma.referralRelation.findUnique({
      where: {
        technicianId_referredClientId: {
          technicianId: link.technicianId,
          referredClientId: clientId,
        },
      },
    });
    if (existing) {
      if (existing.referrerClientId !== link.referrerClientId) {
        throw new ConflictException('该推荐关系已归属其他推荐人');
      }
      return existing;
    }
    return this.prisma.referralRelation.create({
      data: {
        referrerClientId: link.referrerClientId,
        referredClientId: clientId,
        technicianId: link.technicianId,
        sourceLinkId: link.id,
        rewardPromised: true,
        rewardAmount: null,
        minimumOrderAmount: 0,
      },
    });
  }

  listForClient(clientId: number) {
    return this.prisma.referralRelation.findMany({
      where: { OR: [{ referrerClientId: clientId }, { referredClientId: clientId }] },
      include: {
        technician: { select: { id: true, name: true, avatarUrl: true } },
        referred: { select: { id: true, nickname: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listForTechnician(technicianId: number) {
    return this.prisma.referralRelation.findMany({
      where: { technicianId },
      include: {
        referrer: { select: { id: true, nickname: true, avatarUrl: true } },
        referred: { select: { id: true, nickname: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async validLink(token: string) {
    const link = await this.prisma.referralLink.findUnique({ where: { token } });
    if (!link || link.revokedAt || link.expiresAt < new Date()) {
      throw new NotFoundException('推荐链接无效或已过期');
    }
    return link;
  }
}
