import { ForbiddenException } from '@nestjs/common';
import { CustomersService } from './customers.service';

describe('CustomersService related works', () => {
  function customerFixture(technicianId = 7) {
    return {
      id: 12, technicianId, name: '小雅', phone: '13800000000', address: null,
      orders: [], revenues: [], technician: { id: technicianId, name: 'Luna', phone: '13900000000' },
      workAccesses: [{
        orderId: 31, canView: true, canShare: true, canFavorite: false, canLike: true, canComment: true,
        order: { id: 31, orderNo: 'O31', startTime: new Date('2026-07-01T09:00:00.000Z') },
        work: {
          id: 5, title: '春日莫奈', coverUrl: '/monet.jpg', tags: '法式,艺术风',
          visibilityScope: 'authorized_clients', isVisible: true,
          createdAt: new Date('2026-07-01T10:00:00.000Z'), technician: { id: 7, name: 'Luna' },
        },
      }],
    };
  }

  it('客户详情返回当前客户的可见关联作品与独立权限', async () => {
    const prisma = { customer: { findUnique: jest.fn().mockResolvedValue(customerFixture()) } };
    const service = new CustomersService(prisma as never);
    const result = await service.findOneForTechnician(12, 7);

    expect(result.relatedWorks).toEqual([expect.objectContaining({
      id: 5,
      title: '春日莫奈',
      coverUrl: 'http://localhost:3000/monet.jpg',
      tags: ['法式', '艺术风'],
      orderId: 31,
      permissions: { canShare: true, canFavorite: false, canLike: true, canComment: true },
    })]);
  });

  it('其他美甲师不能读取客户及其关联作品', async () => {
    const prisma = { customer: { findUnique: jest.fn().mockResolvedValue(customerFixture()) } };
    const service = new CustomersService(prisma as never);
    await expect(service.findOneForTechnician(12, 9)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
