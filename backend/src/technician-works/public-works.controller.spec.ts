import { PublicWorksController } from './public-works.controller';

describe('PublicWorksController publication filter', () => {
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
