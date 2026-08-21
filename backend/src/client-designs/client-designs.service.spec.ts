import { NotFoundException } from '@nestjs/common';
import { ClientDesignsService } from './client-designs.service';

describe('ClientDesignsService', () => {
  let service: ClientDesignsService;
  let prisma: {
    clientTechBinding: { findFirst: jest.Mock };
    clientDesignRequest: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      clientTechBinding: {
        findFirst: jest.fn(),
      },
      clientDesignRequest: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new ClientDesignsService(prisma as never);
  });

  it('creates a pending quote design request for the client binding technician', async () => {
    prisma.clientTechBinding.findFirst
      .mockResolvedValueOnce({
        clientId: 11,
        techId: 7,
      })
      .mockResolvedValueOnce({
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
    prisma.clientTechBinding.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(
      service.create(11, {
        title: 'Spring set',
        imageUrls: [],
      }),
    ).rejects.toThrow(new NotFoundException('客户未绑定美甲师'));
  });

  it('falls back to an active technician binding when no default binding exists', async () => {
    prisma.clientTechBinding.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ clientId: 11, techId: 7 })
      .mockResolvedValueOnce({ clientId: 11, techId: 7 });
    prisma.clientDesignRequest.create.mockResolvedValueOnce({
      id: 6,
      clientId: 11,
      techId: 7,
      images: '[]',
      status: 'pending_quote',
    });

    const result = await service.create(11, { imageUrls: [] });

    expect(result.techId).toBe(7);
    expect(prisma.clientDesignRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ techId: 7 }) }),
    );
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
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            homeService: true,
            shopService: true,
            shopAddresses: true,
          },
        },
      },
    });
  });

  it('persists edited design images', async () => {
    prisma.clientDesignRequest.findFirst.mockResolvedValueOnce({
      id: 5,
      clientId: 11,
      status: 'pending_quote',
      title: 'Old',
      description: null,
      images: '[]',
    });
    prisma.clientDesignRequest.update.mockResolvedValueOnce({
      id: 5,
      clientId: 11,
      status: 'pending_quote',
      title: 'New',
      description: null,
      images: '["/uploads/new.jpg"]',
    });

    await service.update(11, 5, {
      title: 'New',
      imageUrls: ['/uploads/new.jpg'],
    });

    expect(prisma.clientDesignRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ images: '["/uploads/new.jpg"]' }),
      }),
    );
  });

  it('accepts a valid quoted design', async () => {
    prisma.clientDesignRequest.findFirst.mockResolvedValueOnce({
      id: 5,
      clientId: 11,
      status: 'quoted',
      quotePrice: 288,
    });
    prisma.clientDesignRequest.update.mockResolvedValueOnce({
      id: 5,
      clientId: 11,
      status: 'accepted',
      quotePrice: 288,
      images: '[]',
    });

    const result = await service.acceptQuote(11, 5);

    expect(prisma.clientDesignRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: { status: 'accepted' },
      }),
    );
    expect(result.status).toBe('accepted');
  });

  it('lets a client reject a quoted design', async () => {
    prisma.clientDesignRequest.findFirst.mockResolvedValueOnce({
      id: 5,
      clientId: 11,
      status: 'quoted',
    });
    prisma.clientDesignRequest.update.mockResolvedValueOnce({
      id: 5,
      clientId: 11,
      status: 'rejected',
      images: '[]',
    });

    const result = await service.rejectQuote(11, 5);

    expect(prisma.clientDesignRequest.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { status: 'rejected' },
    });
    expect(result.status).toBe('rejected');
  });

  it('lets the assigned technician quote a design request', async () => {
    prisma.clientDesignRequest.findFirst.mockResolvedValueOnce({
      id: 5,
      techId: 7,
      status: 'pending_quote',
    });
    prisma.clientDesignRequest.update.mockResolvedValueOnce({
      id: 5,
      techId: 7,
      status: 'quoted',
      quotePrice: 288,
      quoteRemark: 'includes removal',
      images: '[]',
    });

    const result = await service.quoteForTechnician(
      7,
      5,
      288,
      ' includes removal ',
    );

    expect(prisma.clientDesignRequest.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: {
        quotePrice: 288,
        quoteRemark: 'includes removal',
        status: 'quoted',
      },
    });
    expect(result.status).toBe('quoted');
  });
});
