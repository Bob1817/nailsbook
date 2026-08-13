import { PublicationConsentsService } from './publication-consents.service';
describe('publication consent', () => {
  it('only allows a customer to authorize an associated work', async () => {
    const prisma: any = {
      nailWork: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    await expect(
      new PublicationConsentsService(prisma).grant(8, {
        contentType: 'work_photo',
        contentId: 11,
        displayIdentity: 'anonymous',
        acquisitionMethod: 'client_form',
      }),
    ).rejects.toThrow('作品不存在或不属于当前客户');
    expect(prisma.nailWork.findFirst).toHaveBeenCalledWith({
      where: { id: 11, clientAccesses: { some: { clientUserId: 8 } } },
      select: { id: true },
    });
  });

  it('revoking work consent immediately makes work internal', async () => {
    const tx: any = {
      publicationConsent: { update: jest.fn() },
      nailWork: { update: jest.fn() },
    };
    const prisma: any = {
      publicationConsent: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          clientUserId: 8,
          contentType: 'work_photo',
          contentId: 11,
        }),
      },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    await new PublicationConsentsService(prisma).revoke(8, 1);
    expect(tx.nailWork.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: {
        publicAuthorizationStatus: 'revoked',
        assetStatus: 'internal',
        isVisible: false,
      },
    });
  });
  it('revoking review consent stops public review and photo use', async () => {
    const tx: any = {
      publicationConsent: { update: jest.fn() },
      serviceReview: { update: jest.fn() },
    };
    const prisma: any = {
      publicationConsent: {
        findFirst: jest.fn().mockResolvedValue({
          id: 2,
          clientUserId: 8,
          contentType: 'review_publication',
          contentId: 12,
        }),
      },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    await new PublicationConsentsService(prisma).revoke(8, 2);
    expect(tx.serviceReview.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { photoUseAuthorized: false, photoUseAuthorizedAt: null },
    });
  });

  it('revokes every active consent before customer deletion', async () => {
    const operations = [{}, {}, {}];
    const prisma: any = {
      publicationConsent: {
        findMany: jest.fn().mockResolvedValue([
          { contentType: 'review_publication', contentId: 12 },
          { contentType: 'work_photo', contentId: 11 },
        ]),
        updateMany: jest.fn().mockReturnValue(operations[0]),
      },
      serviceReview: { updateMany: jest.fn().mockReturnValue(operations[1]) },
      nailWork: { updateMany: jest.fn().mockReturnValue(operations[2]) },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const result = await new PublicationConsentsService(prisma).revokeAll(8);
    expect(result.revokedCount).toBe(2);
    expect(prisma.serviceReview.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [12] } },
      data: { photoUseAuthorized: false, photoUseAuthorizedAt: null },
    });
    expect(prisma.nailWork.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [11] } },
      data: {
        publicAuthorizationStatus: 'revoked',
        assetStatus: 'internal',
        isVisible: false,
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(operations);
  });
});
