import { ForbiddenException } from '@nestjs/common';
import { CustomersService } from './customers.service';

describe('CustomersService follow ups', () => {
  it('美甲师可以创建并完成自己的客户跟进', async () => {
    const prisma = {
      customer: {
        findUnique: jest.fn().mockResolvedValue({ technicianId: 7 }),
      },
      customerFollowUp: {
        create: jest.fn().mockResolvedValue({ id: 21, status: 'pending' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue({ id: 21, status: 'completed' }),
      },
    };
    const service = new CustomersService(prisma as never);

    await expect(
      service.createFollowUp(
        12,
        7,
        ' 提醒客户确认下次款式 ',
        '2026-07-31T09:00:00.000Z',
      ),
    ).resolves.toEqual({ id: 21, status: 'pending' });
    expect(prisma.customerFollowUp.create).toHaveBeenCalledWith({
      data: {
        customerId: 12,
        technicianId: 7,
        content: '提醒客户确认下次款式',
        plannedAt: new Date('2026-07-31T09:00:00.000Z'),
      },
    });

    await expect(service.completeFollowUp(12, 21, 7)).resolves.toEqual({
      id: 21,
      status: 'completed',
    });
    expect(prisma.customerFollowUp.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 21,
          customerId: 12,
          technicianId: 7,
          status: 'pending',
        }),
      }),
    );
  });

  it('其他美甲师不能创建客户跟进', async () => {
    const prisma = {
      customer: {
        findUnique: jest.fn().mockResolvedValue({ technicianId: 7 }),
      },
    };
    const service = new CustomersService(prisma as never);

    await expect(
      service.createFollowUp(
        12,
        9,
        '越权跟进',
        '2026-07-31T09:00:00.000Z',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('今日任务只查询当前美甲师的待处理记录', async () => {
    const prisma = {
      customerFollowUp: {
        findMany: jest.fn().mockResolvedValue([{ id: 21 }]),
      },
    };
    const service = new CustomersService(prisma as never);
    const now = new Date('2026-07-31T12:00:00.000Z');

    await expect(service.getTodayFollowUps(7, now)).resolves.toEqual([
      { id: 21 },
    ]);
    expect(prisma.customerFollowUp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          technicianId: 7,
          status: 'pending',
        }),
      }),
    );
  });
});
