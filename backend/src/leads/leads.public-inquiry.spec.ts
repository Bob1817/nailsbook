import { BadRequestException } from '@nestjs/common';
import { LeadsService } from './leads.service';

describe('LeadsService public inquiry', () => {
  const prisma: any = {
    technician: { findFirst: jest.fn() },
    nailWork: { findFirst: jest.fn() },
    lead: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const dto: any = {
    submissionKey: 'submit-1',
    technicianId: 7,
    workId: 11,
    nickname: '小美',
    contact: 'wx_nail',
    requirement: '想做同款',
    privacyAgreed: true,
    visitorId: 'visitor-1',
    channel: 'xiaohongshu',
  };
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.technician.findFirst.mockResolvedValue({ id: 7 });
    prisma.nailWork.findFirst.mockResolvedValue({ id: 11 });
    prisma.lead.findUnique.mockResolvedValue(null);
  });
  it('requires privacy consent', async () =>
    expect(
      new LeadsService(prisma).submitPublic({ ...dto, privacyAgreed: false }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('returns the original lead for an idempotent retry', async () => {
    prisma.lead.findUnique.mockResolvedValue({ id: 9 });
    await expect(new LeadsService(prisma).submitPublic(dto)).resolves.toEqual({
      submitted: true,
      leadId: 9,
      deduplicated: true,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('creates a lead with first attribution and a submit event', async () => {
    const tx: any = {
      lead: { upsert: jest.fn().mockResolvedValue({ id: 10 }) },
      conversionEvent: { upsert: jest.fn() },
    };
    prisma.$transaction.mockImplementation((fn: any) => fn(tx));
    await expect(new LeadsService(prisma).submitPublic(dto)).resolves.toEqual({
      submitted: true,
      leadId: 10,
      deduplicated: false,
    });
    expect(tx.lead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          sourceChannel: 'xiaohongshu',
          sourceWorkId: 11,
          nickname: '小美',
          privacyAgreedAt: expect.any(Date),
        }),
      }),
    );
    expect(tx.conversionEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ eventType: 'consult_submit' }),
      }),
    );
  });
});
