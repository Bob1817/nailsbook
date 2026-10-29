import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService service record association correction', () => {
  function setup() {
    const prisma: any = {
      $transaction: jest.fn(async (callback) => callback(prisma)),
      customer: { findFirst: jest.fn().mockResolvedValue({ id: 22 }) },
      nailWork: { findFirst: jest.fn().mockResolvedValue({ id: 33 }) },
      customerProfileFact: { count: jest.fn().mockResolvedValue(0) },
      order: { update: jest.fn().mockResolvedValue({ id: 9 }) },
      serviceRecord: { update: jest.fn().mockResolvedValue({ id: 31 }) },
      serviceRecordAssociationCorrection: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    const service = new OrdersService(prisma, { server: { to: jest.fn() } } as never);
    const find = jest.spyOn(service, 'findOneForTechnician')
      .mockResolvedValueOnce({
        id: 9, technicianId: 7, customerId: 12, sourceWorkId: 11,
        serviceRecord: { id: 31, customerId: 12 },
      } as never)
      .mockResolvedValue({ id: 9 } as never);
    return { prisma, service, find };
  }

  it('corrects the customer atomically and writes an audit record', async () => {
    const { prisma, service } = setup();
    await service.correctServiceRecordAssociation(9, 7, {
      entityType: 'customer', targetId: 22, reason: '预约时选错客户',
    });
    expect(prisma.customer.findFirst).toHaveBeenCalledWith({ where: { id: 22, technicianId: 7 }, select: { id: true } });
    expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 9 }, data: { customerId: 22 } });
    expect(prisma.serviceRecord.update).toHaveBeenCalledWith({ where: { id: 31 }, data: { customerId: 22 } });
    expect(prisma.serviceRecordAssociationCorrection.create).toHaveBeenCalledWith({ data: expect.objectContaining({ entityType: 'customer', fromId: 12, toId: 22, reason: '预约时选错客户' }) });
  });

  it('blocks customer correction after profile facts were synced', async () => {
    const { prisma, service } = setup();
    prisma.customerProfileFact.count.mockResolvedValue(1);
    await expect(service.correctServiceRecordAssociation(9, 7, {
      entityType: 'customer', targetId: 22, reason: '预约时选错客户',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('corrects the work target without changing the service record facts', async () => {
    const { prisma, service } = setup();
    await service.correctServiceRecordAssociation(9, 7, {
      entityType: 'work', targetId: 33, reason: '实际制作了另一款',
    });
    expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 9 }, data: { sourceWorkId: 33 } });
    expect(prisma.serviceRecord.update).not.toHaveBeenCalled();
    expect(prisma.serviceRecordAssociationCorrection.create).toHaveBeenCalledWith({ data: expect.objectContaining({ entityType: 'work', fromId: 11, toId: 33 }) });
  });
});
