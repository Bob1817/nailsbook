import { ClientArtistHomepageInteractionsController } from './client-artist-homepage-interactions.controller';

describe('Client artist homepage interactions', () => {
  const prisma = {
    technician: { findFirst: jest.fn().mockResolvedValue({ id: 7 }) },
    artistHomepageLike: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    artistHomepageFavorite: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    artistHomepageComment: { create: jest.fn(), count: jest.fn() },
  };
  const controller = new ClientArtistHomepageInteractionsController(
    prisma as never,
  );
  const req = { user: { clientUserId: 3 } };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.technician.findFirst.mockResolvedValue({ id: 7 });
  });

  it('toggles a homepage like and returns the server count', async () => {
    prisma.artistHomepageLike.findUnique.mockResolvedValue(null);
    prisma.artistHomepageLike.create.mockResolvedValue({ id: 1 });
    prisma.artistHomepageLike.count.mockResolvedValue(4);
    await expect(controller.toggleLike(req, 7)).resolves.toEqual({
      liked: true,
      count: 4,
    });
    expect(prisma.artistHomepageLike.create).toHaveBeenCalledWith({
      data: { clientUserId: 3, technicianId: 7 },
    });
  });

  it('rejects blank homepage comments', async () => {
    await expect(
      controller.comment(req, 7, { content: '   ' }),
    ).rejects.toThrow('评论内容不能为空');
    expect(prisma.artistHomepageComment.create).not.toHaveBeenCalled();
  });
});
