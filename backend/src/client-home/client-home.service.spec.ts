import { NotFoundException } from '@nestjs/common';
import { ClientHomeService } from './client-home.service';

describe('ClientHomeService', () => {
  let service: ClientHomeService;
  let prisma: {
    clientTechBinding: { findFirst: jest.Mock };
    nailWork: { findMany: jest.Mock; findFirst: jest.Mock };
    order: { findFirst: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      clientTechBinding: {
        findFirst: jest.fn(),
      },
      nailWork: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      order: {
        findFirst: jest.fn(),
      },
    };
    service = new ClientHomeService(prisma as never);
  });

  it('returns the bound technician, visible works, and latest booking summary for home', async () => {
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

    expect(prisma.nailWork.findMany).toHaveBeenCalledWith({
      where: {
        techId: 7,
        isVisible: true,
        isFeatured: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 6,
      include: {
        likes: true,
        comments: true,
        technician: {
          select: { name: true, id: true },
        },
      },
    });
    expect(result).toMatchObject({
      technician: {
        id: 7,
        name: 'Anna',
      },
      works: [
        {
          id: 3,
          title: 'Visible work',
          imageUrls: ['http://localhost:3000/cover.jpg'],
        },
      ],
      latestOrder: {
        id: 19,
        orderNo: 'BK001',
        status: 'confirmed',
      },
    });
  });

  it('rejects reading home data when the client has no technician binding', async () => {
    prisma.clientTechBinding.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(service.getHome(11)).rejects.toThrow(
      new NotFoundException('客户未绑定美甲师'),
    );
  });

  it('returns visible works for the bound technician with mapped fallback fields', async () => {
    prisma.clientTechBinding.findFirst.mockResolvedValueOnce({
      clientId: 11,
      techId: 7,
      technician: { id: 7 },
    });
    prisma.nailWork.findMany.mockResolvedValueOnce([
      {
        id: 4,
        techId: 7,
        title: 'Comma images',
        coverUrl: null,
        images: '/a.jpg, /b.jpg',
        description: null,
        tags: 'short, glitter ',
        createdAt: new Date('2026-04-02T00:00:00.000Z'),
        updatedAt: new Date('2026-04-03T00:00:00.000Z'),
      },
    ]);

    const result = await service.getWorks(11);

    expect(prisma.nailWork.findMany).toHaveBeenCalledWith({
      where: {
        techId: 7,
        isVisible: true,
      },
      orderBy: [
        { isPinned: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        likes: true,
        comments: true,
        technician: {
          select: { name: true, id: true },
        },
      },
    });
    expect(result).toEqual([
      {
        id: 4,
        title: 'Comma images',
        coverUrl: 'http://localhost:3000/a.jpg',
        imageUrls: [
          'http://localhost:3000/a.jpg',
          'http://localhost:3000/b.jpg',
        ],
        description: null,
        tags: ['short', 'glitter'],
        likeCount: 0,
        commentCount: 0,
        technicianName: '美甲师',
        technicianId: 7,
        createdAt: new Date('2026-04-02T00:00:00.000Z'),
        updatedAt: new Date('2026-04-03T00:00:00.000Z'),
      },
    ]);
  });

  it('rejects reading a work when it is missing, invisible, or not owned by the bound technician', async () => {
    prisma.clientTechBinding.findFirst.mockResolvedValueOnce({
      clientId: 11,
      techId: 7,
      technician: { id: 7 },
    });
    prisma.nailWork.findFirst.mockResolvedValueOnce(null);

    await expect(service.getWork(11, 99)).rejects.toThrow(
      new NotFoundException('作品不存在'),
    );
    expect(prisma.nailWork.findFirst).toHaveBeenCalledWith({
      where: {
        id: 99,
        techId: 7,
        isVisible: true,
      },
      include: {
        likes: true,
        favorites: true,
        comments: {
          orderBy: { createdAt: 'desc' },
        },
        technician: {
          select: { name: true, avatarUrl: true, id: true },
        },
      },
    });
  });
});
