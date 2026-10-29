import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService service record', () => {
  let prisma: any;
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (callback) => callback(prisma)),
      serviceRecord: {
        upsert: jest.fn().mockResolvedValue({ id: 31, status: 'draft' }),
        findUnique: jest.fn().mockResolvedValue({
          id: 31,
          status: 'draft',
          nailCondition: '甲面偏薄',
          reactionLevel: 'normal',
          photos: [{ stage: 'before' }, { stage: 'after' }],
        }),
        update: jest.fn().mockResolvedValue({ id: 31 }),
      },
      serviceRecordPhoto: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      customerProfileFact: { upsert: jest.fn().mockResolvedValue({ id: 4 }) },
      actionTask: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({ status: 'in_progress' }),
      },
    };
    service = new OrdersService(
      prisma,
      { server: { to: jest.fn() } } as never,
    );
    jest.spyOn(service, 'findOneForTechnician').mockResolvedValue({
      id: 9,
      technicianId: 7,
      customerId: 12,
      status: 'completed',
    } as never);
  });

  it('saves staged photos and confirmed customer facts on the single order record', async () => {
    await service.saveServiceRecord(9, 7, {
      nailCondition: '甲面偏薄',
      beforePhotos: ['https://img/before.jpg'],
      afterPhotos: ['https://img/after.jpg'],
      complete: true,
      reactionLevel: 'normal',
      profileFacts: [{ category: 'allergy', content: '对某类底胶敏感' }],
    });

    expect(prisma.serviceRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderId: 9 },
        update: expect.objectContaining({ status: 'complete' }),
      }),
    );
    expect(prisma.serviceRecordPhoto.createMany).toHaveBeenCalledTimes(2);
    expect(prisma.customerProfileFact.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          customerId: 12,
          category: 'allergy',
          sourceRecordId: 31,
        }),
        update: expect.objectContaining({
          confirmationCount: { increment: 1 },
        }),
      }),
    );
    expect(prisma.actionTask.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'complete_service_record',
          relatedId: 9,
        }),
      }),
    );
  });

  it('keeps the record as draft and leaves the follow-up task when evidence is missing', async () => {
    prisma.serviceRecord.findUnique.mockResolvedValue({
      id: 31,
      nailCondition: '',
      reactionLevel: null,
      photos: [],
    });

    await service.saveServiceRecord(9, 7, { complete: true });

    expect(prisma.serviceRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'draft', completedAt: null },
      }),
    );
    expect(prisma.actionTask.updateMany).not.toHaveBeenCalled();
  });

  it('creates a draft record when service starts', async () => {
    jest.spyOn(service, 'findOneForTechnician').mockResolvedValue({
      id: 9,
      technicianId: 7,
      customerId: 12,
      status: 'pending_home',
    } as never);

    await service.startService(9, 7);

    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 9, status: { in: ['pending_home', 'pending_shop'] } }),
      }),
    );
    expect(prisma.serviceRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderId: 9 },
        create: expect.objectContaining({
          orderId: 9,
          technicianId: 7,
          customerId: 12,
          status: 'draft',
        }),
      }),
    );
  });

  it('is idempotent when the order is already in progress', async () => {
    prisma.order.updateMany.mockResolvedValue({ count: 0 });
    jest.spyOn(service, 'findOneForTechnician').mockResolvedValue({
      id: 9,
      technicianId: 7,
      customerId: 12,
      status: 'in_progress',
    } as never);

    await service.startService(9, 7);

    expect(prisma.serviceRecord.upsert).toHaveBeenCalledTimes(1);
  });

  it('rejects starting a completed order', async () => {
    jest.spyOn(service, 'findOneForTechnician').mockResolvedValue({
      id: 9,
      technicianId: 7,
      customerId: 12,
      status: 'completed',
    } as never);

    await expect(service.startService(9, 7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('does not allow a pre-service draft to be marked complete', async () => {
    jest.spyOn(service, 'findOneForTechnician').mockResolvedValue({
      id: 9,
      technicianId: 7,
      customerId: 12,
      status: 'in_progress',
    } as never);

    await expect(
      service.saveServiceRecord(9, 7, { complete: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.serviceRecord.upsert).not.toHaveBeenCalled();
  });
});
