import { LeadsService } from './leads.service';
describe('manual lead capture', () => {
  it('deduplicates the same WeChat contact within 30 seconds', async () => {
    const prisma: any = {
      nailWork: { findFirst: jest.fn() },
      lead: { upsert: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    const service = new LeadsService(prisma);
    await service.createManual(7, { nickname: '小美', contact: 'WX_ABC' });
    await service.createManual(7, { nickname: '小美', contact: 'wx_abc' });
    const first = prisma.lead.upsert.mock.calls[0][0].where.dedupeKey,
      second = prisma.lead.upsert.mock.calls[1][0].where.dedupeKey;
    expect(first).toBe(second);
    expect(prisma.lead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          firstTouchpoint: 'wechat_private',
          nextFollowUpAt: expect.any(Date),
        }),
      }),
    );
  });
});
