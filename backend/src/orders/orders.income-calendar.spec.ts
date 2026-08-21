import { NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService 收入日历', () => {
  const createdAt = new Date('2025-02-03T00:00:00.000Z');
  const orders = [
    { startTime: new Date('2025-03-01T04:00:00.000Z'), status: 'completed', quotePrice: 188 },
    { startTime: new Date('2025-04-01T04:00:00.000Z'), status: 'pending_home', quotePrice: 268 },
  ];

  it('返回注册时间及全部轻量订单收入字段', async () => {
    const prisma = {
      technician: { findUnique: jest.fn().mockResolvedValue({ createdAt }) },
      order: { findMany: jest.fn().mockResolvedValue(orders) },
    };
    const service = new OrdersService(prisma as never, {} as never);

    await expect(service.findIncomeCalendar(7)).resolves.toEqual({
      registeredAt: createdAt,
      orders,
    });
    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: { technicianId: 7 },
      select: { startTime: true, status: true, quotePrice: true },
      orderBy: { startTime: 'asc' },
    });
  });

  it('美甲师不存在时拒绝返回数据', async () => {
    const prisma = {
      technician: { findUnique: jest.fn().mockResolvedValue(null) },
      order: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new OrdersService(prisma as never, {} as never);

    await expect(service.findIncomeCalendar(404)).rejects.toBeInstanceOf(NotFoundException);
  });
});
