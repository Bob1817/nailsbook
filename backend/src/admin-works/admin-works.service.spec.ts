import { BadRequestException } from '@nestjs/common';
import { AdminWorksService } from './admin-works.service';

describe('AdminWorksService publication review', () => {
  const prisma: any = {
    nailWork: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new AdminWorksService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('审核通过后记录发布人与发布时间', async () => {
    prisma.nailWork.findUnique.mockResolvedValue({ id: 1 });
    prisma.nailWork.update.mockImplementation(({ data }: any) => ({
      id: 1,
      ...data,
    }));

    const result = await service.review(1, 9, 'approved');

    expect(prisma.nailWork.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        publicationStatus: 'approved',
        reviewedBy: 9,
        publishedAt: expect.any(Date),
      }),
    });
    expect(result.publicationStatus).toBe('approved');
  });

  it('驳回必须填写原因并取消精选', async () => {
    prisma.nailWork.findUnique.mockResolvedValue({ id: 1 });
    await expect(service.review(1, 9, 'rejected', ' ')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    prisma.nailWork.update.mockImplementation(({ data }: any) => ({
      id: 1,
      ...data,
    }));
    await service.review(1, 9, 'rejected', '图片不清晰');
    expect(prisma.nailWork.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        publicationStatus: 'rejected',
        isHomepageFeatured: false,
        isFeatured: false,
      }),
    });
  });

  it('待审核作品不能设为首页精选', async () => {
    prisma.nailWork.findUnique.mockResolvedValue({
      id: 1,
      isHomepageFeatured: false,
      publicationStatus: 'pending',
    });
    await expect(service.toggleHomepageFeatured(1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
