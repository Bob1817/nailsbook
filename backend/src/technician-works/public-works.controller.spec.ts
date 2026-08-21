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
});
