import { PublicWorksController } from './public-works.controller';
import { configureLaunchTechnicianId, resetLaunchTechnicianIdConfiguration } from '../common/miniprogram-launch-mode';

describe('PublicWorksController publication filter', () => {
  afterEach(() => resetLaunchTechnicianIdConfiguration());

  it.each(['active', 'inactive'])('分享页为%s账号返回公开店铺及正确接单状态', async status => {
    configureLaunchTechnicianId(7);
    const controller = new PublicWorksController({ nailWork: { findFirst: jest.fn().mockResolvedValue({
      id: 88, title: '作品', images: null, coverUrl: null, tags: null,
      serviceLines: [], comments: [], likes: [],
      technician: { id: 7, name: '美甲师', status, shopAddresses: JSON.stringify([
        { name: '工作室', city: '杭州', detailAddress: '测试路1号', doorInfo: '内部门禁', phone: '私密号码' },
        { name: '停用店铺', enabled: false },
      ]) },
    }) } } as any);
    const detail = await controller.getDetail(88);
    expect(detail.shops).toEqual([{ name: '工作室', address: '杭州 测试路1号' }]);
    expect(detail.technician.acceptingBookings).toBe(status === 'active');
  });

  it('失效授权不查询作品，隐藏或待审核作品不计成功打开事件', async () => {
    const prisma = {
      nailWorkShareGrant: { findFirst: jest.fn().mockResolvedValue(null) },
      nailWork: { findFirst: jest.fn().mockResolvedValue(null) },
      nailWorkShareEvent: { create: jest.fn() },
    };
    const controller = new PublicWorksController(prisma as any);
    await expect(controller.getSharedDetail('invalid')).rejects.toThrow('分享已失效');
    expect(prisma.nailWork.findFirst).not.toHaveBeenCalled();
    prisma.nailWorkShareGrant.findFirst.mockResolvedValue({ id: 1, workId: 88 });
    await expect(controller.getSharedDetail('valid')).rejects.toThrow('作品不存在');
    expect(prisma.nailWork.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 88, technician: { status: { in: ['active', 'inactive'] } }, isVisible: true, archivedAt: null, publicationStatus: 'approved' },
    }));
    expect(prisma.nailWorkShareEvent.create).not.toHaveBeenCalled();
  });
  it('游客作品流只查询审核通过且美甲师启用的公开作品', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const controller = new PublicWorksController({
      nailWork: { findMany },
    } as any);

    await controller.getPublicFeed('20');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isVisible: true,
          visibilityScope: 'public',
          publicationStatus: 'approved',
          technician: { status: 'active' },
        }),
      }),
    );
  });

  it('游客作品流透传作品价格', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 1,
        title: '法式美甲',
        coverUrl: null,
        images: null,
        tags: null,
        price: 598,
        serviceSubtotalFen: 49800,
        standardPriceFen: 59800,
        totalDurationMinutes: 90,
        createdAt: new Date('2026-08-22T00:00:00Z'),
        technician: { id: 2, name: '贝贝', avatarUrl: null, city: '杭州' },
        _count: { likes: 0, comments: 0 },
      },
    ]);
    const controller = new PublicWorksController({ nailWork: { findMany } } as any);

    const result = await controller.getPublicFeed('20');

    expect(result[0]).toEqual(expect.objectContaining({
      price: 598,
      serviceSubtotalFen: 49800,
      standardPriceFen: 59800,
      totalDurationMinutes: 90,
    }));
  });
});
