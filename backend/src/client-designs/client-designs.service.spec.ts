import { NotFoundException } from '@nestjs/common';
import { ClientDesignsService } from './client-designs.service';

describe('ClientDesignsService', () => {
  let service: ClientDesignsService;
  let prisma: {
    clientTechBinding: { findUnique: jest.Mock };
    clientDesignRequest: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      clientTechBinding: {
        findUnique: jest.fn(),
      },
      clientDesignRequest: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    service = new ClientDesignsService(prisma as never);
  });

  it('creates a pending quote design request for the client binding technician', async () => {
    prisma.clientTechBinding.findUnique.mockResolvedValueOnce({
      clientId: 11,
      techId: 7,
    });
    prisma.clientDesignRequest.create.mockResolvedValueOnce({
      id: 5,
      clientId: 11,
      techId: 7,
      title: 'Spring set',
      images: '["/uploads/a.jpg"]',
      description: 'glossy',
      status: 'pending_quote',
    });

    const result = await service.create(11, {
      title: 'Spring set',
      imageUrls: ['/uploads/a.jpg'],
      description: 'glossy',
    });

    expect(prisma.clientDesignRequest.create).toHaveBeenCalledWith({
      data: {
        clientId: 11,
        techId: 7,
        title: 'Spring set',
        images: '["/uploads/a.jpg"]',
        description: 'glossy',
        status: 'pending_quote',
      },
    });
    expect(result).toMatchObject({
      id: 5,
      techId: 7,
      status: 'pending_quote',
      imageUrls: ['/uploads/a.jpg'],
    });
  });

  it('rejects creating a design request when the client has no technician binding', async () => {
    prisma.clientTechBinding.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.create(11, {
        title: 'Spring set',
        imageUrls: [],
      }),
    ).rejects.toThrow(new NotFoundException('客户绑定不存在'));
  });

  it('returns design requests ordered by newest first and maps stored images', async () => {
    prisma.clientDesignRequest.findMany.mockResolvedValueOnce([
      {
        id: 9,
        clientId: 11,
        techId: 7,
        title: 'Newest',
        images: '["/uploads/new.jpg"]',
        description: null,
        quotePrice: 88,
        quoteRemark: 'ok',
        status: 'pending_quote',
        createdAt: new Date('2026-04-09T00:00:00.000Z'),
        updatedAt: new Date('2026-04-09T00:00:00.000Z'),
      },
      {
        id: 8,
        clientId: 11,
        techId: 7,
        title: 'Fallback',
        images: '/uploads/a.jpg, /uploads/b.jpg',
        description: 'ideas',
        quotePrice: null,
        quoteRemark: null,
        status: 'pending_quote',
        createdAt: new Date('2026-04-08T00:00:00.000Z'),
        updatedAt: new Date('2026-04-08T00:00:00.000Z'),
      },
    ]);

    const result = await service.findAll(11);

    expect(prisma.clientDesignRequest.findMany).toHaveBeenCalledWith({
      where: { clientId: 11 },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 9,
        imageUrls: ['/uploads/new.jpg'],
        quotePrice: 88,
        quoteRemark: 'ok',
      }),
      expect.objectContaining({
        id: 8,
        imageUrls: ['/uploads/a.jpg', '/uploads/b.jpg'],
        description: 'ideas',
      }),
    ]);
  });

  it('rejects reading a design request that does not belong to the current client', async () => {
    prisma.clientDesignRequest.findFirst.mockResolvedValueOnce(null);

    await expect(service.findOne(11, 44)).rejects.toThrow(
      new NotFoundException('设计需求不存在'),
    );
    expect(prisma.clientDesignRequest.findFirst).toHaveBeenCalledWith({
      where: {
        id: 44,
        clientId: 11,
      },
    });
  });
});
