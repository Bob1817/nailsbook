import { BadRequestException, ConflictException } from '@nestjs/common';
import { ReferralRelationService } from './referral-relation.service';

describe('ReferralRelationService', () => {
  const prisma: any = {
    clientTechBinding: { findFirst: jest.fn() },
    referralLink: { findUnique: jest.fn(), create: jest.fn() },
    referralRelation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    technician: { findUnique: jest.fn() },
  };
  let service: ReferralRelationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReferralRelationService(prisma);
  });

  it('公开解析不暴露推荐人身份', async () => {
    prisma.referralLink.findUnique.mockResolvedValue({
      id: 1,
      referrerClientId: 9,
      technicianId: 2,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });
    prisma.technician.findUnique.mockResolvedValue({
      id: 2,
      name: 'Tech',
      avatarUrl: null,
      invitationCode: 'INV',
    });
    const result = await service.resolve('opaque');

    expect(result).not.toHaveProperty('referrerClientId');
    expect(JSON.stringify(result)).not.toContain('"referrer"');
    expect(result.rewardNotice).toContain('5%');
  });

  it('拒绝自荐', async () => {
    prisma.referralLink.findUnique.mockResolvedValue({
      id: 1,
      referrerClientId: 7,
      technicianId: 2,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });

    await expect(service.claim(7, 'token')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('已有归因不得被另一个推荐人覆盖', async () => {
    prisma.referralLink.findUnique.mockResolvedValue({
      id: 2,
      referrerClientId: 8,
      technicianId: 3,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });
    prisma.clientTechBinding.findFirst.mockResolvedValue({ id: 1 });
    prisma.referralRelation.findUnique.mockResolvedValue({
      id: 4,
      referrerClientId: 6,
      referredClientId: 9,
      technicianId: 3,
    });

    await expect(service.claim(9, 'token')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.referralRelation.create).not.toHaveBeenCalled();
  });

  it('A→B、B→C 只创建两条直接关系', async () => {
    prisma.clientTechBinding.findFirst.mockResolvedValue({ id: 1 });
    prisma.referralRelation.findUnique.mockResolvedValue(null);
    prisma.referralRelation.create.mockImplementation(({ data }: any) =>
      Promise.resolve(data),
    );
    prisma.referralLink.findUnique
      .mockResolvedValueOnce({
        id: 11,
        referrerClientId: 1,
        technicianId: 5,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      })
      .mockResolvedValueOnce({
        id: 12,
        referrerClientId: 2,
        technicianId: 5,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      });

    await service.claim(2, 'a-to-b');
    await service.claim(3, 'b-to-c');

    expect(prisma.referralRelation.create).toHaveBeenCalledTimes(2);
    expect(prisma.referralRelation.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ referrerClientId: 1, referredClientId: 2 }),
      }),
    );
    expect(prisma.referralRelation.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ referrerClientId: 2, referredClientId: 3 }),
      }),
    );
  });
});
