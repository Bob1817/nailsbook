import { BadRequestException } from '@nestjs/common';
import { TechnicianWorksService } from './technician-works.service';

describe('TechnicianWorksService work access', () => {
  const grant = {
    customerId: 12,
    orderId: 31,
    canView: true,
    canShare: true,
    canFavorite: true,
    canLike: false,
    canComment: true,
  };

  function setup() {
    const tx = {
      nailWorkShareGrant: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      nailWorkClientAccess: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 90 }),
      },
      nailWork: { update: jest.fn().mockResolvedValue({ id: 5 }) },
    };
    const prisma = {
      nailWork: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({ id: 5, techId: 7 })
          .mockResolvedValueOnce({
            id: 5, techId: 7, title: '客户专属作品', coverUrl: null,
            images: null, description: null, tags: null, isVisible: true,
            visibilityScope: 'authorized_clients', sortOrder: 0,
            createdAt: new Date(), updatedAt: new Date(), likes: [], favorites: [],
            comments: [], clientAccesses: [],
          }),
      },
      customer: { findMany: jest.fn().mockResolvedValue([{ id: 12, clientUserId: 22 }]) },
      order: { findFirst: jest.fn().mockResolvedValue({ id: 31 }) },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    return { service: new TechnicianWorksService(prisma as never), prisma, tx };
  }

  it('仅允许关联当前美甲师名下的客户和订单，并原子更新权限', async () => {
    const { service, prisma, tx } = setup();
    await service.updateAccess(7, 5, { visibilityScope: 'authorized_clients', grants: [grant] });

    expect(prisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: [12] }, technicianId: 7 },
    }));
    expect(prisma.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 31, technicianId: 7, customerId: 12 },
    }));
    expect(tx.nailWorkShareGrant.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { workId: 5, revokedAt: null },
    }));
    expect(tx.nailWorkClientAccess.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ workId: 5, customerId: 12, clientUserId: 22, canShare: true, canLike: false }),
    });
    expect(tx.nailWork.update).toHaveBeenCalledWith({
      where: { id: 5 }, data: { visibilityScope: 'authorized_clients' },
    });
  });

  it('拒绝关联其他美甲师或不存在的客户', async () => {
    const { service, prisma } = setup();
    prisma.customer.findMany.mockResolvedValueOnce([]);
    await expect(service.updateAccess(7, 5, {
      visibilityScope: 'authorized_clients', grants: [grant],
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('拒绝给尚未绑定客户端账号的客户授权', async () => {
    const { service, prisma } = setup();
    prisma.customer.findMany.mockResolvedValueOnce([{ id: 12, clientUserId: null }]);
    await expect(service.updateAccess(7, 5, {
      visibilityScope: 'authorized_clients', grants: [grant],
    })).rejects.toThrow('客户尚未绑定客户端账号');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('创建作品时保存结构化审美字段', async () => {
    const created = {
      id: 8, techId: 7, title: '春日莫奈', coverUrl: '/cover.jpg', images: null,
      description: '春季作品', designIdea: '低饱和花园色彩', suitableScene: '约会,旅行',
      recommendationScore: 5, tags: '法式', isVisible: true, sortOrder: 0,
      createdAt: new Date(), updatedAt: new Date(), likes: [], favorites: [], comments: [],
    };
    const prisma = { nailWork: { create: jest.fn().mockResolvedValue(created) } };
    const service = new TechnicianWorksService(prisma as never);
    const result = await service.create(7, {
      title: '春日莫奈', coverUrl: '/cover.jpg', description: '春季作品',
      designIdea: '低饱和花园色彩', suitableScene: '约会,旅行', recommendationScore: 5,
    });

    expect(prisma.nailWork.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        designIdea: '低饱和花园色彩', suitableScene: '约会,旅行', recommendationScore: 5,
      }),
    }));
    expect(result).toMatchObject({
      designIdea: '低饱和花园色彩', suitableScene: '约会,旅行', recommendationScore: 5,
    });
  });
});
