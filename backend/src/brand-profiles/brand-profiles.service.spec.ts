import { NotFoundException } from '@nestjs/common';
import { BrandProfilesService } from './brand-profiles.service';

describe('BrandProfilesService', () => {
  const prisma = {
    technician: { findUnique: jest.fn() },
    brandProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    brandEnvironmentPhoto: { deleteMany: jest.fn(), createMany: jest.fn() },
    brandFaq: { deleteMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  } as any;
  const service = new BrandProfilesService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: any) => callback(prisma));
  });

  it('uses the authenticated technician id for owner writes', async () => {
    prisma.technician.findUnique.mockResolvedValue({
      id: 7,
      avatarUrl: '/uploads/avatar.png',
      shopAddresses: JSON.stringify([
        {
          name: 'Luna 工作室',
          detailAddress: '静安区示例路 1 号',
          photos: ['/uploads/shop.png'],
        },
      ]),
    });
    prisma.brandProfile.upsert.mockResolvedValue({ id: 20 });
    prisma.brandProfile.findUnique.mockResolvedValue({
      technicianId: 7,
      brandName: 'Luna',
      environmentPhotos: [],
      faqs: [],
    });

    await service.update(7, {
      brandName: 'Luna',
      tagline: '通勤美甲',
      city: '上海',
      publicServiceArea: '静安区',
      artistIntroduction: '专业美甲师',
      hygieneStandards: '一客一消毒',
      cancellationPolicy: '24小时前取消',
      exclusiveServiceNote: '同一时段只服务一位客人',
      shareTitle: 'Luna Nail',
      shareCoverUrl: '/uploads/share.png',
      environmentPhotos: [{ imageUrl: '/uploads/room.png' }],
      featuredShopKey: 'Luna 工作室||静安区示例路 1 号',
      featuredServiceIds: ['svc-care'],
      publicationStatus: 'published',
    });

    expect(prisma.brandProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { technicianId: 7 },
        create: expect.objectContaining({ technicianId: 7, brandName: 'Luna' }),
        update: expect.objectContaining({
          featuredServiceIds: JSON.stringify(['svc-care']),
        }),
      }),
    );
  });

  it('允许发布所有展示资料均为空的主页', async () => {
    prisma.technician.findUnique.mockResolvedValue({ id: 7, name: 'Luna' });
    prisma.brandProfile.upsert.mockResolvedValue({ id: 20 });
    prisma.brandProfile.findUnique.mockResolvedValue({
      technicianId: 7,
      brandName: 'Luna',
      environmentPhotos: [],
      faqs: [],
    });

    await service.update(7, { publicationStatus: 'published' });

    expect(prisma.brandProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ brandName: 'Luna' }),
        update: expect.objectContaining({ publicationStatus: 'published' }),
      }),
    );
  });

  it('rejects owner writes for a missing technician', async () => {
    prisma.technician.findUnique.mockResolvedValue(null);
    await expect(
      service.update(99, { brandName: 'x', publicationStatus: 'draft' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns an explicit public whitelist without internal fields', async () => {
    prisma.brandProfile.findFirst.mockResolvedValue({
      id: 20,
      technicianId: 7,
      brandName: 'Luna',
      tagline: '干净通勤款',
      city: '上海',
      publicServiceArea: '静安区',
      artistIntroduction: '介绍',
      aestheticPhilosophy: '审美',
      transportationNotes: '地铁可达',
      hygieneStandards: '每客消毒',
      materialStandards: '合规材料',
      allergyNotice: '请提前说明过敏史',
      latePolicy: '迟到规则',
      cancellationPolicy: '取消规则',
      aftercarePolicy: '售后规则',
      shareTitle: '分享标题',
      shareDescription: '分享描述',
      shareCoverUrl: '/uploads/share.png',
      publicationStatus: 'published',
      internalNote: 'never expose',
      technician: {
        id: 7,
        avatarUrl: '/uploads/avatar.png',
        homeService: true,
        shopService: false,
        phone: '13800138000',
      },
      environmentPhotos: [
        { imageUrl: '/uploads/room.png', caption: '环境', sortOrder: 0, id: 1 },
      ],
      faqs: [
        {
          question: '多久？',
          answer: '约两小时',
          sortOrder: 0,
          id: 2,
          isActive: true,
        },
      ],
    });

    const result = await service.getPublic(7);
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('technicianId', 20);
    expect(result).not.toHaveProperty('internalNote');
    expect(result).not.toHaveProperty('publicationStatus');
    expect(result).not.toHaveProperty('phone');
    expect(JSON.stringify(result)).not.toContain('13800138000');
    expect(result.environmentPhotos[0]).toEqual({
      imageUrl: '/uploads/room.png',
      caption: '环境',
      sortOrder: 0,
    });
  });
});
