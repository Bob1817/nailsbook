import { OrdersService } from './orders.service';

describe('P0-21 review lifecycle', () => {
  it('only creates an expiring unique invitation for a completed order', async () => {
    const prisma: any = {
      order: { findFirst: jest.fn().mockResolvedValue({ id: 3 }) },
      serviceReview: { findUnique: jest.fn().mockResolvedValue(null) },
      reviewInvitation: {
        upsert: jest.fn().mockResolvedValue({ id: 5 }),
      },
    };
    const result = await new OrdersService(
      prisma,
      {} as never,
    ).createReviewInvitation(7, 3);
    expect(result.path).toContain('reviewToken=');
    expect(prisma.reviewInvitation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderId: 3 },
        create: expect.objectContaining({
          orderId: 3,
          technicianId: 7,
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt: expect.any(Date),
        }),
      }),
    );
  });

  it('publishes only through moderation without changing verified origin', async () => {
    const prisma: any = {
      serviceReview: {
        findFirst: jest.fn().mockResolvedValue({ id: 8 }),
        update: jest.fn().mockResolvedValue({ id: 8 }),
      },
    };
    await new OrdersService(prisma, {} as never).moderateReview(
      7,
      8,
      'approved',
    );
    expect(prisma.serviceReview.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: expect.objectContaining({
        moderationStatus: 'approved',
        publicationStatus: 'public',
        moderatorId: 7,
      }),
    });
    expect(
      prisma.serviceReview.update.mock.calls[0][0].data,
    ).not.toHaveProperty('verificationSource');
  });

  it('stores a trimmed technician reply', async () => {
    const prisma: any = {
      serviceReview: {
        findFirst: jest.fn().mockResolvedValue({ id: 8 }),
        update: jest.fn().mockResolvedValue({ id: 8 }),
      },
    };
    await new OrdersService(prisma, {} as never).replyToReview(
      7,
      8,
      ' 谢谢认可 ',
    );
    expect(prisma.serviceReview.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { technicianReply: '谢谢认可', repliedAt: expect.any(Date) },
    });
  });
});
