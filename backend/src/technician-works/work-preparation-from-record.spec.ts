import { BadRequestException } from '@nestjs/common';
import { TechnicianWorksService } from './technician-works.service';

describe('TechnicianWorksService work preparation from service record', () => {
  function setup() {
    const prisma = {
      nailWork: {
        findFirst: jest.fn().mockResolvedValue({ id: 11 }),
      },
      serviceRecord: {
        findUnique: jest.fn().mockResolvedValue({
          id: 31,
          technicianId: 7,
          status: 'complete',
          tools: '晕染笔、短柄笔',
          materials: '渐变胶',
          techniques: '薄涂两遍后晕染',
          nailCondition: '甲面偏薄',
          nextServiceNotes: '该客户下次缩短甲长',
          actualStartTime: new Date('2026-10-20T02:00:00.000Z'),
          actualEndTime: new Date('2026-10-20T03:30:00.000Z'),
        }),
      },
      workPreparation: {
        findUnique: jest.fn().mockResolvedValue({
          tools: '短柄笔、打磨头',
          materials: '底胶',
          steps: '原步骤',
          estimatedMinutes: 80,
          sourceRecordId: 20,
          sourceRecordCount: 2,
        }),
        upsert: jest.fn().mockResolvedValue({ id: 1 }),
      },
    };
    const service = new TechnicianWorksService(
      prisma as never,
      {} as never,
      {} as never,
    );
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 11 } as never);
    return { service, prisma };
  }

  it('merges reusable tools and materials without copying customer-specific notes', async () => {
    const { service, prisma } = setup();

    await service.updatePreparationFromRecord(7, 11, 31);

    expect(prisma.workPreparation.upsert).toHaveBeenCalledWith({
      where: { workId: 11 },
      create: expect.objectContaining({
        workId: 11,
        tools: '短柄笔、打磨头、晕染笔',
        materials: '底胶、渐变胶',
        steps: '薄涂两遍后晕染',
        estimatedMinutes: 90,
        sourceRecordId: 31,
        sourceRecordCount: 3,
      }),
      update: expect.not.objectContaining({
        riskNotes: expect.anything(),
        preparation: expect.anything(),
      }),
    });
  });

  it('preserves existing reusable values and count when the same record is retried', async () => {
    const { service, prisma } = setup();
    prisma.serviceRecord.findUnique.mockResolvedValueOnce({
      id: 20,
      technicianId: 7,
      status: 'complete',
      tools: null,
      materials: null,
      techniques: null,
      actualStartTime: null,
      actualEndTime: null,
    });

    await service.updatePreparationFromRecord(7, 11, 20);

    expect(prisma.workPreparation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          tools: '短柄笔、打磨头',
          materials: '底胶',
          steps: '原步骤',
          estimatedMinutes: 80,
          sourceRecordCount: 2,
        }),
      }),
    );
  });

  it('rejects an unfinished service record', async () => {
    const { service, prisma } = setup();
    prisma.serviceRecord.findUnique.mockResolvedValueOnce({
      id: 31,
      technicianId: 7,
      status: 'draft',
    });

    await expect(service.updatePreparationFromRecord(7, 11, 31))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.workPreparation.upsert).not.toHaveBeenCalled();
  });

  it('returns the latest source record and order on technician work detail', async () => {
    const work = {
      id: 11,
      techId: 7,
      title: '法式渐变',
      coverUrl: null,
      images: null,
      tags: null,
      isVisible: false,
      sortOrder: 0,
      createdAt: new Date('2026-10-20T02:00:00.000Z'),
      updatedAt: new Date('2026-10-20T02:00:00.000Z'),
      likes: [],
      favorites: [],
      comments: [],
      clientAccesses: [],
      serviceLines: [],
      preparation: { sourceRecordId: 31, sourceRecordCount: 2 },
      sourceOrder: null,
    };
    const prisma = {
      nailWork: { findFirst: jest.fn().mockResolvedValue(work) },
      serviceRecord: {
        findFirst: jest.fn().mockResolvedValue({
          id: 31,
          orderId: 42,
          status: 'complete',
          completedAt: new Date('2026-10-20T03:30:00.000Z'),
          order: { orderNo: 'NB2026102042' },
        }),
      },
    };
    const service = new TechnicianWorksService(prisma as never, {} as never, {} as never);

    const result = await service.findOne(7, 11);

    expect(prisma.serviceRecord.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 31, technicianId: 7 } }),
    );
    expect(result.sourceService).toEqual(expect.objectContaining({
      orderId: 42,
      orderNo: 'NB2026102042',
      recordId: 31,
      recordStatus: 'complete',
    }));
  });
});
