import { ArtistInteractionsController } from './artist-interactions.controller';

describe('Artist interaction records', () => {
  const prisma = {
    technicianFollow: { findMany: jest.fn() },
    nailWorkLike: { findMany: jest.fn() },
    nailWorkFavorite: { findMany: jest.fn() },
    clientUser: { findMany: jest.fn() },
    technician: { findMany: jest.fn() },
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
    prisma.technicianFollow.findMany.mockResolvedValue(Array.from({ length: 21 }, (_, id) => ({ id, createdAt: new Date(), clientUser: { nickname: '客户', status: 'active' } })));
    const result = await controller.list(req, 'follow', '2');
    expect(prisma.technicianFollow.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { technicianId: 55 }, skip: 20, take: 21 }));
    expect(result.list).toHaveLength(20);
    expect(result.hasMore).toBe(true);
  });
  it.each(['like', 'favorite'])('scopes %s to owned works and redacts deleted actors', async type => {
    const rows = [{ id: 8, clientId: 3, technicianId: null, createdAt: new Date(), work: { id: 12, title: '法式' } }];
    prisma.nailWorkLike.findMany.mockResolvedValue(rows);
    prisma.nailWorkFavorite.findMany.mockResolvedValue(rows);
    prisma.clientUser.findMany.mockResolvedValue([{ id: 3, nickname: '旧名字', avatarUrl: '/old.jpg', status: 'deleted' }]);
    prisma.technician.findMany.mockResolvedValue([]);
    const result = await controller.list(req, type);
    const model = type === 'like' ? prisma.nailWorkLike : prisma.nailWorkFavorite;
    expect(model.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { work: { techId: 55 } } }));
    expect(result.list[0]).toMatchObject({ name: '已注销用户', avatarUrl: null, workId: 12, workTitle: '法式' });
    expect(result.list[0]).not.toHaveProperty('clientId');
  });
});
