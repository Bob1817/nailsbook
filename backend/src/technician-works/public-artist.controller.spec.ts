import { NotFoundException } from '@nestjs/common';
import { PublicArtistController } from './public-artist.controller';

describe('PublicArtistController', () => {
  const prisma = {
    technician: { findFirst: jest.fn() },
    nailWork: { findMany: jest.fn() },
  } as any;
  const controller = new PublicArtistController(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('returns only active services, enabled addresses and public works', async () => {
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
        { id: 'a', name: '基础护理', isActive: true },
        { id: 'b', name: '已下架服务', isActive: false },
      ]),
      shopAddresses: JSON.stringify([
        { id: 'shop-1', name: '静安工作室', enabled: true },
        { id: 'shop-2', name: '停用门店', enabled: false },
      ]),
      serviceSchedule: JSON.stringify({ activeSchemeId: 'weekday' }),
      socialMedia: null,
      status: 'active',
    });
    prisma.nailWork.findMany.mockResolvedValue([
      { id: 11, title: '法式', images: '["/work.png"]', coverUrl: null },
    ]);

    const result = await controller.getBusinessPage(7);

    expect(prisma.nailWork.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { techId: 7, isVisible: true, visibilityScope: 'public' },
      }),
    );
    expect(result.artist.serviceItems).toHaveLength(1);
    expect(result.artist.shopAddresses).toHaveLength(1);
    expect(result.works[0].coverUrl).toContain('/work.png');
    expect(result.artist).not.toHaveProperty('phone');
  });

  it('does not expose inactive technicians', async () => {
    prisma.technician.findFirst.mockResolvedValue(null);

    await expect(controller.getBusinessPage(7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.technician.findFirst).toHaveBeenCalledWith({
      where: { id: 7, status: 'active' },
    });
  });
});
