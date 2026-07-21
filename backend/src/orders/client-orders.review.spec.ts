import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientOrdersService } from './client-orders.service';

describe('ClientOrdersService 服务评价', () => {
  let service: ClientOrdersService;
  let prisma: {
    order: { findFirst: jest.Mock; update: jest.Mock };
    serviceReview: { findUnique: jest.Mock; upsert: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      order: { findFirst: jest.fn(), update: jest.fn() },
      serviceReview: { findUnique: jest.fn(), upsert: jest.fn() },
    };
    service = new ClientOrdersService(
      prisma as never,
      {} as never,
      {} as never,
    );
  });

  it('仅允许当前客户评价已完成订单', async () => {
    prisma.order.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.saveReview(11, 99, {
        rating: 5,
        photos: [],
        photoUseAuthorized: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.order.findFirst.mockResolvedValueOnce({
      id: 99,
      status: 'in_progress',
      technicianId: 7,
    });
    await expect(
      service.saveReview(11, 99, {
        rating: 5,
        photos: [],
        photoUseAuthorized: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.serviceReview.upsert).not.toHaveBeenCalled();
  });

  it('保存评价照片授权，并在客户关闭授权时清空授权时间', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 41,
      status: 'completed',
      technicianId: 7,
    });
    prisma.serviceReview.findUnique.mockResolvedValueOnce(null);
    prisma.serviceReview.upsert.mockImplementationOnce(({ create }) =>
      Promise.resolve({
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...create,
      }),
    );

    await service.saveReview(11, 41, {
      rating: 5,
      content: ' 很满意 ',
      photos: ['/a.jpg'],
      photoUseAuthorized: true,
    });
    expect(prisma.serviceReview.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          content: '很满意',
          photos: '["/a.jpg"]',
          photoUseAuthorized: true,
          photoUseAuthorizedAt: expect.any(Date),
        }),
      }),
    );

    prisma.serviceReview.findUnique.mockResolvedValueOnce({
      photoUseAuthorizedAt: new Date('2026-07-20T00:00:00.000Z'),
    });
    prisma.serviceReview.upsert.mockImplementationOnce(({ update }) =>
      Promise.resolve({
        id: 1,
        orderId: 41,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...update,
      }),
    );
    await service.saveReview(11, 41, {
      rating: 4,
      photos: ['/a.jpg'],
      photoUseAuthorized: false,
    });
    expect(prisma.serviceReview.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          photoUseAuthorized: false,
          photoUseAuthorizedAt: null,
        }),
      }),
    );
  });

  it('仅允许为已完成订单保存去重后的客户美甲照片', async () => {
    prisma.order.findFirst.mockResolvedValueOnce({
      id: 41,
      status: 'in_progress',
    });
    await expect(
      service.saveClientPhotos(11, 41, ['/a.jpg']),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.order.findFirst.mockResolvedValueOnce({
      id: 41,
      status: 'completed',
    });
    prisma.order.update.mockResolvedValueOnce({ id: 41 });
    await expect(
      service.saveClientPhotos(11, 41, ['/a.jpg', ' /a.jpg ', '/b.jpg']),
    ).resolves.toEqual({ orderId: 41, photos: ['/a.jpg', '/b.jpg'] });
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 41 },
      data: { clientPhotos: '["/a.jpg","/b.jpg"]' },
    });
  });
});
