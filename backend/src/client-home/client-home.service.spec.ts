import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClientHomeService } from './client-home.service';

describe('ClientHomeService', () => {
  let service: ClientHomeService;
  let prisma: {
    clientTechBinding: { findFirst: jest.Mock; findMany: jest.Mock };
    nailWork: { findMany: jest.Mock; findFirst: jest.Mock };
    order: { findFirst: jest.Mock; findMany: jest.Mock };
    nailWorkClientAccess: { findFirst: jest.Mock; findMany: jest.Mock };
    nailWorkFavorite: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    nailWorkShareGrant: { create: jest.Mock };
    nailWorkShareEvent: { create: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      clientTechBinding: { findFirst: jest.fn(), findMany: jest.fn() },
      nailWork: { findMany: jest.fn(), findFirst: jest.fn() },
      order: { findFirst: jest.fn(), findMany: jest.fn() },
      nailWorkClientAccess: { findFirst: jest.fn(), findMany: jest.fn() },
      nailWorkFavorite: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      nailWorkShareGrant: { create: jest.fn() },
      nailWorkShareEvent: { create: jest.fn() },
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
        where: expect.objectContaining({
          techId: 7,
          isVisible: true,
          isFeatured: true,
        }),
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
        where: expect.objectContaining({
          techId: { in: [7] },
          isVisible: true,
        }),
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
        where: expect.objectContaining({
          id: 99,
          techId: { in: [7] },
          isVisible: true,
        }),
      }),
    );
  });

  it('getWork：返回预约同款所需的标准报价、服务明细与时长', async () => {
    prisma.clientTechBinding.findMany.mockResolvedValueOnce([{ techId: 7 }]);
    prisma.nailWork.findFirst.mockResolvedValueOnce({
      id: 12,
      techId: 7,
      title: '法式同款',
      coverUrl: '/work.jpg',
      images: '["/work.jpg"]',
      visibilityScope: 'public',
      serviceSubtotalFen: 26000,
      standardPriceFen: 23800,
      totalDurationMinutes: 120,
      serviceLines: [
        {
          servicePublicIdSnapshot: 'svc-french',
          nameSnapshot: '法式造型',
          unitPriceFen: 26000,
          durationMinutes: 120,
          quantity: 1,
          subtotalFen: 26000,
        },
      ],
      likes: [],
      favorites: [],
      comments: [],
      clientAccesses: [],
      technician: { id: 7, name: '贝贝', avatarUrl: null },
      createdAt: new Date('2026-08-21T00:00:00.000Z'),
      updatedAt: new Date('2026-08-21T00:00:00.000Z'),
    });

    const result = await service.getWork(11, 12);

    expect(result).toMatchObject({
      serviceSubtotalFen: 26000,
      standardPriceFen: 23800,
      totalDurationMinutes: 120,
      serviceLines: [
        {
          serviceId: 'svc-french',
          name: '法式造型',
          subtotalFen: 26000,
          durationMinutes: 120,
        },
      ],
    });
    expect(prisma.nailWork.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          serviceLines: { orderBy: { sortOrder: 'asc' } },
        }),
      }),
    );
  });

  it('私密作品未授权收藏时由后端拒绝', async () => {
    prisma.nailWork.findFirst.mockResolvedValueOnce({
      id: 9,
      visibilityScope: 'authorized_clients',
    });
    prisma.nailWorkClientAccess.findFirst.mockResolvedValueOnce({
      id: 30,
      canView: true,
      canFavorite: false,
    });

    await expect(service.favoriteWork(11, 9)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.nailWorkFavorite.create).not.toHaveBeenCalled();
  });

  it('私密作品获分享授权后创建七天有效的随机令牌', async () => {
    prisma.nailWork.findFirst.mockResolvedValueOnce({
      id: 9,
      visibilityScope: 'authorized_clients',
    });
    prisma.nailWorkClientAccess.findFirst.mockResolvedValueOnce({
      id: 30,
      canView: true,
      canShare: true,
    });
    prisma.nailWorkShareGrant.create.mockResolvedValueOnce({ id: 1 });

    const before = Date.now();
    const result = await service.createShareGrant(11, 9);

    expect(result.public).toBe(false);
    expect(result.token).toMatch(/^[a-f0-9]{48}$/);
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + 7 * 24 * 60 * 60 * 1000 - 1000,
    );
    expect(prisma.nailWorkShareGrant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workId: 9,
        accessId: 30,
        clientUserId: 11,
      }),
    });
  });

  it('仅在作品可分享时记录真实分享事件', async () => {
    prisma.nailWork.findFirst.mockResolvedValueOnce({
      id: 9,
      visibilityScope: 'authorized_clients',
    });
    prisma.nailWorkClientAccess.findFirst.mockResolvedValueOnce({
      id: 30,
      canView: true,
      canShare: false,
    });
    await expect(
      service.recordShare(11, 9, 'wechat_friend'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.nailWorkShareEvent.create).not.toHaveBeenCalled();

    prisma.nailWork.findFirst.mockResolvedValueOnce({
      id: 9,
      visibilityScope: 'authorized_clients',
    });
    prisma.nailWorkClientAccess.findFirst.mockResolvedValueOnce({
      id: 30,
      canView: true,
      canShare: true,
    });
    prisma.nailWorkShareEvent.create.mockResolvedValueOnce({ id: 1 });
    await expect(service.recordShare(11, 9, 'wechat_friend')).resolves.toEqual({
      success: true,
    });
    expect(prisma.nailWorkShareEvent.create).toHaveBeenCalledWith({
      data: {
        workId: 9,
        clientUserId: 11,
        eventType: 'share',
        channel: 'wechat_friend',
      },
    });
  });

  it('私人档案只合并当前客户的已完成订单与授权作品', async () => {
    prisma.order.findMany.mockResolvedValueOnce([
      {
        id: 41,
        serviceType: '手部凝胶',
        completedAt: new Date('2026-07-01T10:00:00.000Z'),
        startTime: new Date('2026-07-01T09:00:00.000Z'),
        quotePrice: 299,
        technician: { id: 7, name: 'Luna', avatarUrl: null },
        workAccesses: [
          {
            canView: true,
            canShare: true,
            canFavorite: true,
            canLike: true,
            canComment: true,
            work: {
              id: 5,
              title: '莫奈花园',
              coverUrl: '/monet.jpg',
              images: null,
              tags: '法式,艺术风',
            },
          },
        ],
      },
    ]);
    prisma.nailWorkClientAccess.findMany.mockResolvedValueOnce([]);
    prisma.nailWorkFavorite.findMany.mockResolvedValueOnce([
      {
        work: { id: 6, tags: '法式,裸色' },
      },
    ]);
    prisma.clientTechBinding.findMany.mockResolvedValueOnce([{ techId: 7 }]);
    prisma.nailWork.findMany.mockResolvedValueOnce([
      {
        id: 7,
        techId: 7,
        title: '裸色微法式',
        coverUrl: '/nude.jpg',
        images: null,
        description: null,
        designIdea: null,
        suitableScene: '职场',
        recommendationScore: 4,
        tags: '法式,裸色',
        isFeatured: true,
        createdAt: new Date('2026-07-05T10:00:00.000Z'),
        updatedAt: new Date('2026-07-05T10:00:00.000Z'),
        likes: [],
        comments: [],
        favorites: [],
        technician: { id: 7, name: 'Luna', avatarUrl: null },
      },
    ]);

    const result = await service.getBeautyArchive(11);

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientUserId: 11, status: 'completed' },
      }),
    );
    expect(result.summary).toMatchObject({
      recordCount: 1,
      totalSpent: 299,
      favoriteStyle: '法式',
    });
    expect(result.records[0]).toMatchObject({
      targetType: 'order',
      targetId: 41,
      workId: 5,
      title: '莫奈花园',
      coverUrl: 'http://localhost:3000/monet.jpg',
      tags: ['法式', '艺术风'],
      technicianName: 'Luna',
    });
    expect(result.recommendations[0]).toMatchObject({
      id: 7,
      title: '裸色微法式',
      matchedTags: ['法式', '裸色'],
      recommendationReason: '延续你喜欢的法式、裸色风格',
    });
  });
});
