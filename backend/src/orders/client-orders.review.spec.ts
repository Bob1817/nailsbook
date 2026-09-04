import { OrdersService } from './orders.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ClientOrdersService } from './client-orders.service';

describe('ClientOrdersService 服务评价', () => {
  let service: ClientOrdersService;
  let prisma: {
    $transaction: jest.Mock;
    conversation: { upsert: jest.Mock };
    message: { create: jest.Mock };
    order: { findFirst: jest.Mock; update: jest.Mock };
    serviceReview: { findUnique: jest.Mock; upsert: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(fn => fn(prisma)),
      conversation: { upsert: jest.fn().mockResolvedValue({ id: 8 }) },
      message: { create: jest.fn().mockResolvedValue({ id: 9 }) },
      order: { findFirst: jest.fn(), update: jest.fn() },
      serviceReview: { findUnique: jest.fn(), upsert: jest.fn() },
    };
    service = new ClientOrdersService(
      prisma as never,
      { server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } } as never,
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

  it('评价与提醒同事务写入，重复内容不重复提醒，更新评分再次提醒', async () => {
    prisma.order.findFirst.mockResolvedValue({ id: 41, status: 'completed', technicianId: 7 });
    prisma.serviceReview.findUnique.mockResolvedValue(null);
    prisma.serviceReview.upsert.mockImplementation(({ create }) => Promise.resolve({ id: 1, ...create }));
    const dto = { rating: 5, content: '很满意', photos: ['/a.jpg'], photoUseAuthorized: false };
    await service.saveReview(11, 41, dto);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.message.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      receiverType: 'technician', receiverId: 7, senderId: 11,
      relatedType: 'service_review', relatedId: 41, messageType: 'system',
    }) });
    expect(prisma.message.create.mock.calls[0][0].data.content).not.toContain('/a.jpg');
    prisma.serviceReview.findUnique.mockResolvedValue({ rating: 5, content: '很满意', photos: '["/a.jpg"]' });
    await service.saveReview(11, 41, dto);
    expect(prisma.message.create).toHaveBeenCalledTimes(1);
    await service.saveReview(11, 41, { ...dto, rating: 4 });
    expect(prisma.message.create).toHaveBeenCalledTimes(2);
    expect(prisma.message.create.mock.calls[1][0].data.content).toContain('更新了');
    prisma.message.create.mockRejectedValueOnce(new Error('message storage failed'));
    await expect(service.saveReview(11, 41, { ...dto, rating: 3 })).rejects.toThrow('message storage failed');
  });

  it('仅订单所属美甲师能读取完整评价，未授权公开的照片仍供本人查看', async () => {
    const reader = Object.create(OrdersService.prototype);
    const review = { rating: 4, content: '服务很好', photos: '["/private-review.jpg"]', updatedAt: new Date() };
    reader.prisma = { order: { findUnique: jest.fn().mockResolvedValue({ id: 41, technicianId: 7, review }) } };
    const result = await reader.findOneForTechnician(41, 7);
    expect(result.review).toEqual(review);
    expect(reader.prisma.order.findUnique.mock.calls[0][0].include.review.select.photos).toBe(true);
    await expect(reader.findOneForTechnician(41, 8)).rejects.toBeInstanceOf(ForbiddenException);
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

  it('仅允许客户为自己的已完成订单保存记录备注', async () => {
    prisma.order.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.saveClientRecordNote(11, 99, '喜欢这次配色'),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.order.findFirst.mockResolvedValueOnce({
      id: 41,
      status: 'completed',
    });
    prisma.order.update.mockResolvedValueOnce({ id: 41 });
    await expect(
      service.saveClientRecordNote(11, 41, '  喜欢这次配色  '),
    ).resolves.toEqual({ orderId: 41, note: '喜欢这次配色' });
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 41 },
      data: { clientRecordNote: '喜欢这次配色' },
    });
  });
});
