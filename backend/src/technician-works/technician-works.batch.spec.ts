import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TechnicianWorksService } from './technician-works.service';

describe('TechnicianWorksService batchAction & reorder', () => {
  function setup() {
    const prisma = {
      nailWork: {
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    const service = new TechnicianWorksService(
      prisma as never,
      { assertCanCreateWork: jest.fn() } as never,
      { deleteImageVariants: jest.fn() } as never,
    );
    return { service, prisma };
  }

  it('batch hides owned works and rejects when any work is not owned', async () => {
    const { service, prisma } = setup();
    prisma.nailWork.findMany.mockResolvedValueOnce([{ id: 1, tags: '法式' }, { id: 2, tags: '裸色' }]);

    const res = await service.batchAction(7, { workIds: [1, 2], action: 'hide' });
    expect(res).toEqual({ affected: 2 });
    expect(prisma.nailWork.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] }, techId: 7 },
      data: { isVisible: false },
    });

    prisma.nailWork.findMany.mockResolvedValueOnce([{ id: 1, tags: '法式' }]);
    await expect(
      service.batchAction(7, { workIds: [1, 99], action: 'hide' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('batch adds and removes tags without duplicates', async () => {
    const { service, prisma } = setup();
    prisma.nailWork.findMany.mockResolvedValueOnce([
      { id: 1, tags: '法式,简约' },
      { id: 2, tags: '裸色' },
    ]);

    await service.batchAction(7, {
      workIds: [1, 2],
      action: 'add_tags',
      tags: ['简约', '秋冬'],
    });
    expect(prisma.nailWork.update).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      data: { tags: '法式,简约,秋冬' },
    });
    expect(prisma.nailWork.update).toHaveBeenNthCalledWith(2, {
      where: { id: 2 },
      data: { tags: '裸色,简约,秋冬' },
    });

    prisma.nailWork.findMany.mockResolvedValueOnce([{ id: 1, tags: '法式' }]);
    await expect(
      service.batchAction(7, { workIds: [1], action: 'add_tags', tags: ['  '] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('reorders owned works in sequence', async () => {
    const { service, prisma } = setup();
    prisma.nailWork.findMany.mockResolvedValueOnce([{ id: 3 }, { id: 1 }, { id: 2 }]);

    const res = await service.reorder(7, [3, 1, 2]);
    expect(res).toEqual({ updated: 3 });
    expect(prisma.nailWork.update).toHaveBeenNthCalledWith(1, { where: { id: 3 }, data: { sortOrder: 0 } });
    expect(prisma.nailWork.update).toHaveBeenNthCalledWith(2, { where: { id: 1 }, data: { sortOrder: 1 } });
    expect(prisma.nailWork.update).toHaveBeenNthCalledWith(3, { where: { id: 2 }, data: { sortOrder: 2 } });
  });
});
