import { CustomServiceRequestsService } from './custom-service-requests.service';

describe('CustomServiceRequestsService', () => {
  it('links the created appointment back to the accepted custom request', async () => {
    const request = {
      id: 17,
      requestNo: 'CS17',
      clientId: 5,
      techId: 9,
      title: '法式定制',
      description: '短方圆甲',
      images: null,
      referenceWorkIds: null,
      serviceDate: '2099-01-05',
      startTime: '14:00',
      serviceType: '到店美甲',
      addressId: null,
      shopAddress: JSON.stringify({ city: '杭州市', detailAddress: '测试店' }),
      status: 'quoted',
      quotePrice: 398,
      quoteRemark: null,
      quotedAt: new Date(),
      acceptedAt: null,
      rejectedAt: null,
      cancelledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      client: { nickname: '小美', phone: '13800000000' },
    };
    const update = jest.fn().mockResolvedValue({
      ...request,
      status: 'accepted',
      acceptedAt: new Date(),
    });
    const createOrder = jest.fn().mockResolvedValue({ id: 31, orderNo: 'OD31' });
    const tx = {
      customServiceRequest: { update },
      customer: { upsert: jest.fn().mockResolvedValue({ id: 23 }) },
      order: { create: createOrder },
      conversation: { findUnique: jest.fn().mockResolvedValue(null) },
      message: { create: jest.fn() },
    };
    const prisma = {
      customServiceRequest: { findFirst: jest.fn().mockResolvedValue(request) },
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = new CustomServiceRequestsService(prisma as never);

    await service.acceptQuote(5, 17);

    expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ customServiceRequestId: 17 }),
    }));
  });
});
