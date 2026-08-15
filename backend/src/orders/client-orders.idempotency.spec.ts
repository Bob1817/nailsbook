import { ClientOrdersService } from './client-orders.service';

describe('ClientOrdersService 状态操作幂等', () => {
  it('并发完成请求未取得状态流转权时不创建收入', async () => {
    const tx = {
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      revenue: { create: jest.fn() },
    };
    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          clientUserId: 8,
          technicianId: 7,
          customerId: 3,
          status: 'in_progress',
          quotePrice: 200,
          paymentStatus: 'paid',
        }),
      },
      revenue: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new ClientOrdersService(
      prisma as never,
      {} as never,
      {} as never,
    );

    await expect(service.updateStatus(8, 1, 'completed')).rejects.toThrow(
      '该订单已完成，无需重复处理',
    );
    expect(tx.revenue.create).not.toHaveBeenCalled();
  });

  it('并发取消请求未取得状态流转权时不释放档期', async () => {
    const tx = {
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn(),
      },
      blockedTimeSlot: { deleteMany: jest.fn() },
    };
    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          clientUserId: 8,
          status: 'pending_quote',
        }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new ClientOrdersService(
      prisma as never,
      {} as never,
      {} as never,
    );

    await expect(service.updateStatus(8, 1, 'cancelled')).rejects.toThrow(
      '该订单已取消，无需重复处理',
    );
    expect(tx.blockedTimeSlot.deleteMany).not.toHaveBeenCalled();
  });
});
