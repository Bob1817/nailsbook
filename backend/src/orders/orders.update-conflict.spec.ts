import { BadRequestException } from '@nestjs/common';
import { ClientOrdersService } from './client-orders.service';
import { OrdersService } from './orders.service';

describe('修改预约时间的冲突保护', () => {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const serviceDate = [
    futureDate.getFullYear(),
    String(futureDate.getMonth() + 1).padStart(2, '0'),
    String(futureDate.getDate()).padStart(2, '0'),
  ].join('-');

  it('客户修改时间时拒绝与其他预约重叠', async () => {
    const tx = {
      blockedTimeSlot: {
        findFirst: jest.fn().mockResolvedValue({ id: 90 }),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      order: { update: jest.fn() },
    };
    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          clientUserId: 8,
          technicianId: 7,
          status: 'pending_quote',
          startTime: new Date('2026-07-01T10:00:00'),
          endTime: new Date('2026-07-01T12:00:00'),
        }),
      },
      clientAddress: {
        findFirst: jest.fn().mockResolvedValue({
          id: 3,
          clientId: 8,
          province: '上海',
          city: '上海',
          district: '静安区',
          detailAddress: '测试地址',
        }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new ClientOrdersService(
      prisma as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.update(8, 1, {
        addressId: 3,
        serviceDate,
        startTime: '14:00',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.blockedTimeSlot.create).not.toHaveBeenCalled();
  });

  it('客户修改时间时同步订单和占用时段，并排除自身占用', async () => {
    const updatedOrder = {
      id: 1,
      technicianId: 7,
      startTime: futureDate,
      endTime: new Date(futureDate.getTime() + 2 * 60 * 60 * 1000),
    };
    const tx = {
      blockedTimeSlot: {
        findFirst: jest.fn().mockResolvedValue(null),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 10 }),
      },
      order: { update: jest.fn().mockResolvedValue(updatedOrder) },
    };
    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          clientUserId: 8,
          technicianId: 7,
          status: 'pending_quote',
          startTime: new Date('2026-07-01T10:00:00'),
          endTime: new Date('2026-07-01T12:00:00'),
        }),
      },
      clientAddress: {
        findFirst: jest.fn().mockResolvedValue({
          id: 3,
          clientId: 8,
          province: '上海',
          city: '上海',
          district: '静安区',
          detailAddress: '测试地址',
        }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new ClientOrdersService(
      prisma as never,
      {} as never,
      {} as never,
    );

    await service.update(8, 1, {
      addressId: 3,
      serviceDate,
      startTime: '14:00',
    });

    expect(tx.blockedTimeSlot.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        techId: 7,
        NOT: { orderId: 1 },
      }),
      select: { id: true },
    });
    expect(tx.blockedTimeSlot.deleteMany).toHaveBeenCalledWith({
      where: { orderId: 1 },
    });
    expect(tx.blockedTimeSlot.create).toHaveBeenCalledTimes(1);
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reminderDaySent: false,
          reminderHourSent: false,
        }),
      }),
    );
  });

  it('美甲师修改开始时间时保留原服务时长并检查冲突', async () => {
    const tx = {
      blockedTimeSlot: {
        findFirst: jest.fn().mockResolvedValue(null),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 12 }),
      },
      order: { update: jest.fn().mockImplementation(({ data }) => data) },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
      order: { update: jest.fn() },
    };
    const service = new OrdersService(prisma as never, {} as never);
    jest.spyOn(service, 'findOneForTechnician').mockResolvedValue({
      id: 5,
      technicianId: 7,
      startTime: new Date('2026-07-01T10:00:00'),
      endTime: new Date('2026-07-01T12:00:00'),
    } as never);

    const newStart = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    await service.updateForTechnician(5, 7, {
      startTime: newStart.toISOString(),
    });

    const updateData = tx.order.update.mock.calls[0][0].data;
    expect(updateData.endTime.getTime() - updateData.startTime.getTime()).toBe(
      2 * 60 * 60 * 1000,
    );
    expect(tx.blockedTimeSlot.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        techId: 7,
        NOT: { orderId: 5 },
      }),
      select: { id: true },
    });
    expect(tx.blockedTimeSlot.create).toHaveBeenCalledTimes(1);
  });
});
