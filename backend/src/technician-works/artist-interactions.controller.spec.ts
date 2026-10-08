import { ArtistInteractionsController } from './artist-interactions.controller';

describe('Artist interaction records', () => {
  const prisma = {
    technicianFollow: { findMany: jest.fn() },
    artistHomepageLike: { findMany: jest.fn() },
    artistHomepageFavorite: { findMany: jest.fn() },
    artistHomepageComment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const controller = new ArtistInteractionsController(prisma as any);
  const req = { user: { technicianId: 55 } };
  beforeEach(() => jest.resetAllMocks());
  it('rejects invalid types and pagination before querying', async () => {
    await expect(controller.list(req, 'invalid')).rejects.toThrow();
    await expect(controller.list(req, 'follow', '0')).rejects.toThrow();
    await expect(controller.list(req, 'follow', '1.5')).rejects.toThrow();
    expect(prisma.technicianFollow.findMany).not.toHaveBeenCalled();
  });
  it('scopes followers to authenticated artist and paginates with a lookahead', async () => {
    prisma.technicianFollow.findMany.mockResolvedValue(
      Array.from({ length: 21 }, (_, id) => ({
        id,
        createdAt: new Date(),
        clientUser: { nickname: '客户', status: 'active' },
      })),
    );
    const result = await controller.list(req, 'follow', '2');
    expect(prisma.technicianFollow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { technicianId: 55 },
        skip: 20,
        take: 21,
      }),
    );
    expect(result.list).toHaveLength(20);
    expect(result.hasMore).toBe(true);
  });
  it.each(['like', 'favorite'])(
    'scopes homepage %s records and redacts deleted actors',
    async (type) => {
      const rows = [
        {
          id: 8,
          createdAt: new Date(),
          clientUser: {
            nickname: '旧名字',
            avatarUrl: '/old.jpg',
            status: 'deleted',
          },
        },
      ];
      prisma.artistHomepageLike.findMany.mockResolvedValue(rows);
      prisma.artistHomepageFavorite.findMany.mockResolvedValue(rows);
      const result = await controller.list(req, type);
      const model =
        type === 'like'
          ? prisma.artistHomepageLike
          : prisma.artistHomepageFavorite;
      expect(model.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { technicianId: 55 } }),
      );
      expect(result.list[0]).toMatchObject({
        name: '已注销用户',
        avatarUrl: null,
      });
    },
  );

  it('returns homepage comments with moderation state', async () => {
    prisma.artistHomepageComment.findMany.mockResolvedValue([
      {
        id: 9,
        createdAt: new Date(),
        content: '很专业',
        isPinned: true,
        isHidden: false,
        clientUser: { nickname: '小美', avatarUrl: null, status: 'active' },
      },
    ]);
    const result = await controller.list(req, 'comment');
    expect(result.list[0]).toMatchObject({
      content: '很专业',
      isPinned: true,
      isHidden: false,
      name: '小美',
    });
  });
});
