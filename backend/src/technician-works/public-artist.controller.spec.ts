import { NotFoundException } from '@nestjs/common';
import { PublicArtistController } from './public-artist.controller';

describe('PublicArtistController', () => {
  const prisma = {
    technician: { findFirst: jest.fn() },
    technicianFollow: { count: jest.fn() },
    technicianQualification: { findMany: jest.fn() },
    technicianFeaturedComment: { findMany: jest.fn() },
    serviceReview: { findUnique: jest.fn(), findMany: jest.fn() },
  } as any;
  const controller = new PublicArtistController(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('returns public profile data without exposing works to guests', async () => {
    prisma.technicianFollow.count.mockResolvedValue(12);
    prisma.technicianQualification.findMany.mockResolvedValue([]);
    prisma.technicianFeaturedComment.findMany.mockResolvedValue([]);
    prisma.serviceReview.findMany.mockResolvedValue([]);
    prisma.technician.findFirst.mockResolvedValue({
      id: 7,
      name: '阿琳',
      avatarUrl: '/avatar.png',
      city: '上海',
      serviceArea: '静安区',
      homeService: true,
      shopService: true,
      invitationCode: 'NAIL7',
      serviceItems: JSON.stringify([
        {
          id: 'a',
          name: '基础护理',
          price: 128,
          durationMinutes: 60,
          isActive: true,
        },
        { id: 'b', name: '已下架服务', isActive: false },
      ]),
      shopAddresses: JSON.stringify([
        {
          id: 'shop-1',
          name: '静安工作室',
          detailAddress: '静安路1号',
          enabled: true,
        },
        { id: 'shop-2', name: '停用门店', enabled: false },
      ]),
      serviceSchedule: JSON.stringify({
        activeSchemeId: 'weekday',
        schemes: [
          {
            id: 'weekday',
            days: ['mon'],
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      }),
      socialMedia: null,
      status: 'active',
    });
    const result = await controller.getBusinessPage(7);

    expect(result.artist.serviceItems).toHaveLength(1);
    expect(result.artist.shopAddresses).toHaveLength(1);
    expect(result.artist.followerCount).toBe(12);
    expect(result.artist.bookingReady).toBe(true);
    expect(result.works).toEqual([]);
    expect(result.artist.stats.workCount).toBe(0);
    expect(result.artist).not.toHaveProperty('phone');
  });

  it('excludes suspended/deleted accounts while allowing resting accounts', async () => {
    prisma.technician.findFirst.mockResolvedValue(null);

    await expect(controller.getBusinessPage(7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.technician.findFirst).toHaveBeenCalledWith({
      where: { id: 7, status: { in: ['active', 'inactive'] } },
    });
  });

  it('serves enabled shop guidance publicly with absolute image URLs', async () => {
    prisma.technician.findFirst.mockResolvedValue({
      id: 7,
      name: '阿琳',
      status: 'active',
      shopAddresses: JSON.stringify([{
        id: 'shop-1',
        name: '静安工作室',
        detailAddress: '静安路1号',
        enabled: true,
        guidance: {
          enabled: true,
          metro: { blocks: [{ id: 'image-1', type: 'image', url: '/uploads/guide.png' }] },
        },
      }]),
    });

    const result = await controller.getShopGuidance(7, '静安工作室');

    expect(result.shop.name).toBe('静安工作室');
    expect(result.guidance.enabled).toBe(true);
    expect(result.guidance.metro.blocks[0].url).toContain('/uploads/guide.png');
  });
});
