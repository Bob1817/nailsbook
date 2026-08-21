import { BadRequestException } from '@nestjs/common';
import { TechnicianWorksService } from './technician-works.service';

describe('TechnicianWorksService draft publication flow', () => {
  function setup() {
    const baseWork = {
      id: 11,
      techId: 7,
      title: '春日法式',
      coverUrl: '/uploads/cover.jpg',
      images: '[]',
      description: null,
      designIdea: null,
      suitableScene: null,
      recommendationScore: 5,
      tags: null,
      price: null,
      isVisible: true,
      isPinned: false,
      isFeatured: false,
      sortOrder: 0,
      publicationStatus: 'draft',
      reviewNote: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: [],
      favorites: [],
      comments: [],
    };
    const prisma = {
      nailWork: {
        create: jest.fn().mockResolvedValue(baseWork),
        findFirst: jest.fn().mockResolvedValue({ ...baseWork, clientAccesses: [] }),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...baseWork, ...data })),
      },
    };
    const service = new TechnicianWorksService(
      prisma as never,
      { assertCanCreateWork: jest.fn() } as never,
      { deleteImageVariants: jest.fn() } as never,
    );
    return { service, prisma, baseWork };
  }

  it('允许在标题和封面尚未完成时创建不可公开的服务端草稿', async () => {
    const { service, prisma } = setup();
    await service.createDraft(7, { description: '先记录灵感' });
    expect(prisma.nailWork.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          techId: 7,
          title: null,
          publicationStatus: 'draft',
        }),
      }),
    );
  });

  it('保存草稿会撤回审核状态并清理旧审核结论', async () => {
    const { service, prisma } = setup();
    await service.saveDraft(7, 11, { title: '修改后的标题' });
    expect(prisma.nailWork.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: '修改后的标题',
          publicationStatus: 'draft',
          reviewNote: null,
          publishedAt: null,
        }),
      }),
    );
  });

  it('完整草稿发布后进入待审核状态', async () => {
    const { service, prisma } = setup();
    const result = await service.publish(7, 11);
    expect(prisma.nailWork.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ publicationStatus: 'pending' }) }),
    );
    expect(result.publicationStatus).toBe('pending');
  });

  it('拒绝发布缺少标题或封面的草稿', async () => {
    const { service, prisma, baseWork } = setup();
    prisma.nailWork.findFirst.mockResolvedValueOnce({ ...baseWork, title: null, clientAccesses: [] });
    await expect(service.publish(7, 11)).rejects.toBeInstanceOf(BadRequestException);
    prisma.nailWork.findFirst.mockResolvedValueOnce({ ...baseWork, coverUrl: null, clientAccesses: [] });
    await expect(service.publish(7, 11)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('客户专属草稿必须完成客户授权后才能发布', async () => {
    const { service, prisma, baseWork } = setup();
    prisma.nailWork.findFirst.mockResolvedValueOnce({
      ...baseWork,
      visibilityScope: 'authorized_clients',
      clientAccesses: [],
    });
    await expect(service.publish(7, 11)).rejects.toThrow('至少需要授权一位客户');
  });
});
