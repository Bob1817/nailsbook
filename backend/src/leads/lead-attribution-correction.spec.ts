import { LeadsService } from './leads.service';

describe('P1-06 attribution correction', () => {
  it('records correction and propagates it without changing first touchpoint', async () => {
    const tx: any = {
      attributionCorrection: { create: jest.fn() },
      lead: { update: jest.fn().mockResolvedValue({ id: 1 }) },
      order: { update: jest.fn() },
    };
    const prisma: any = {
      nailWork: { findFirst: jest.fn().mockResolvedValue({ id: 8 }) },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    const service = new LeadsService(prisma);
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({
        id: 1,
        sourceChannel: 'direct',
        sourceWorkId: null,
        convertedOrderId: 9,
      } as never);
    await service.correctAttribution(7, 1, 'xhs', 8, '客户确认来自小红书');
    expect(tx.attributionCorrection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        oldChannel: 'direct',
        newChannel: 'xiaohongshu',
        newWorkId: 8,
        reason: '客户确认来自小红书',
      }),
    });
    expect(tx.lead.update.mock.calls[0][0].data).not.toHaveProperty(
      'firstTouchpoint',
    );
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { attributionChannel: 'xiaohongshu', sourceWorkId: 8 },
    });
  });
});
