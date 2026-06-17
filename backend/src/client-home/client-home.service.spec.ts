import { NotFoundException } from '@nestjs/common';
import { ClientHomeService } from './client-home.service';

describe('ClientHomeService', () => {
  let service: ClientHomeService;
  let prisma: {
    clientTechBinding: { findFirst: jest.Mock; findMany: jest.Mock };
    nailWork: { findMany: jest.Mock; findFirst: jest.Mock };
    order: { findFirst: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      clientTechBinding: { findFirst: jest.fn(), findMany: jest.fn() },
      nailWork: { findMany: jest.fn(), findFirst: jest.fn() },
      order: { findFirst: jest.fn() },
    };
    service = new ClientHomeService(prisma as never);
  });

  it('getHome：返回默认绑定美甲师的精品作品 + 最近预约', async () => {
    prisma.clientTechBinding.findFirst.mockResolvedValueOnce({
      clientId: 11,
      techId: 7,
      technician: {
        id: 7,
        name: 'Anna',
        phone: '13900000000',
        avatarUrl: '/avatar.jpg',
        city: 'Shanghai',
        serviceArea: 'Pudong',
      },
    });
    prisma.nailWork.findMany.mockResolvedValueOnce([
      {
        id: 3,
        techId: 7,
        title: 'Visible work',
        coverUrl: '/cover.jpg',
        images: '["/cover.jpg"]',
        isVisible: true,
        likes: [],
        comments: [],
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      },
    ]);
    prisma.order.findFirst.mockResolvedValueOnce({
      id: 19,
      orderNo: 'BK001',
      status: 'confirmed',
      startTime: new Date('2026-05-01T10:00:00.000Z'),
      endTime: new Date('2026-05-01T11:00:00.000Z'),
      address: 'Studio',
      technicianId: 7,
    });

    const result = await service.getHome(11);

    expect(prisma.nailWork.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { techId: 7, isVisible: true, isFeatured: true },
        take: 6,
      }),
    );
    expect(result).toMatchObject({
      technician: { id: 7, name: 'Anna' },
      works: [
        {
          id: 3,
          title: 'Visible work',
          imageUrls: ['http://localhost:3000/cover.jpg'],
          isLiked: false,
        },
      ],
      latestOrder: { id: 19, orderNo: 'BK001', status: 'confirmed' },
    });
  });

  it('getHome：客户无绑定 → 抛 NotFoundException', async () => {
    prisma.clientTechBinding.findFirst.mockResolvedValue(null);
    await expect(service.getHome(11)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getWorks：按全部 active 绑定的美甲师筛选可见作品，并映射字段', async () => {
    prisma.clientTechBinding.findMany.mockResolvedValueOnce([{ techId: 7 }]);
    prisma.nailWork.findMany.mockResolvedValueOnce([
      {
        id: 4,
        techId: 7,
        title: 'Comma images',
        coverUrl: null,
        images: '/a.jpg, /b.jpg',
        description: null,
        tags: 'short, glitter ',
        likes: [],
        comments: [],
        favorites: [],
        createdAt: new Date('2026-04-02T00:00:00.000Z'),
        updatedAt: new Date('2026-04-03T00:00:00.000Z'),
      },
    ]);

    const result = await service.getWorks(11);

    expect(prisma.nailWork.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { techId: { in: [7] }, isVisible: true },
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 4,
        title: 'Comma images',
        coverUrl: 'http://localhost:3000/a.jpg',
        imageUrls: [
          'http://localhost:3000/a.jpg',
          'http://localhost:3000/b.jpg',
        ],
        tags: ['short', 'glitter'],
        likeCount: 0,
        commentCount: 0,
        favoriteCount: 0,
        technicianName: '美甲师',
        technicianId: 7,
        isLiked: false,
      }),
    ]);
  });

  it('getWorks：无任何 active 绑定 → 返回空数组', async () => {
    prisma.clientTechBinding.findMany.mockResolvedValueOnce([]);
    const result = await service.getWorks(11);
    expect(result).toEqual([]);
    expect(prisma.nailWork.findMany).not.toHaveBeenCalled();
  });

  it('getWork：作品不存在/不可见/非绑定美甲师 → 抛 NotFoundException', async () => {
    prisma.clientTechBinding.findMany.mockResolvedValueOnce([{ techId: 7 }]);
    prisma.nailWork.findFirst.mockResolvedValueOnce(null);

    await expect(service.getWork(11, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.nailWork.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 99, techId: { in: [7] }, isVisible: true },
      }),
    );
  });
});
