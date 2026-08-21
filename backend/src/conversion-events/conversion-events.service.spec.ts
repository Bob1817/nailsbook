import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConversionEventsService } from './conversion-events.service';

describe('ConversionEventsService', () => {
  const prisma = {
    technician: { findFirst: jest.fn() },
    nailWork: { findFirst: jest.fn() },
    conversionEvent: { upsert: jest.fn() },
  };
  let service: ConversionEventsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.technician.findFirst.mockResolvedValue({ id: 7 });
    prisma.nailWork.findFirst.mockResolvedValue({ id: 11 });
    prisma.conversionEvent.upsert.mockResolvedValue({ id: 23 });
    service = new ConversionEventsService(prisma as never);
  });

  it('以客户端事件 ID 幂等记录公开作品浏览', async () => {
    await expect(
      service.recordPublic({
        eventId: 'event-1',
        technicianId: 7,
        workId: 11,
        eventType: 'work_view',
        visitorId: 'visitor-1',
        source: 'Public_Work',
      }),
    ).resolves.toEqual({ recorded: true, id: 23 });

    expect(prisma.conversionEvent.upsert).toHaveBeenCalledWith({
      where: { eventId: 'event-1' },
      create: expect.objectContaining({
        technicianId: 7,
        workId: 11,
        visitorId: 'visitor-1',
        eventType: 'work_view',
        source: 'public_work',
      }),
      update: {},
      select: { id: true },
    });
  });

  it('拒绝缺少作品的作品浏览事件', async () => {
    await expect(
      service.recordPublic({
        eventId: 'event-2',
        technicianId: 7,
        eventType: 'work_view',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.conversionEvent.upsert).not.toHaveBeenCalled();
  });

  it('拒绝归属不匹配或未公开的作品', async () => {
    prisma.nailWork.findFirst.mockResolvedValue(null);
    await expect(
      service.recordPublic({
        eventId: 'event-3',
        technicianId: 7,
        workId: 12,
        eventType: 'booking_intent',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
