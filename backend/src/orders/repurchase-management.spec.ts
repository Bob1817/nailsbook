import { OrdersService } from './orders.service';

describe('P1-02 repurchase management', () => {
  it('creates a repeat booking from an owned historical service', async () => {
    const prisma: any = {
      serviceRecord: {
        findFirst: jest.fn().mockResolvedValue({
          id: 5,
          customerId: 3,
          actualAmount: 288,
          order: {
            service: { publicId: 'svc_1', name: '法式延长' },
            customer: { sourceType: 'xiaohongshu' },
            serviceType: '到店美甲',
          },
        }),
      },
    };
    const service = new OrdersService(prisma, {} as never);
    jest
      .spyOn(service, 'createForTechnician')
      .mockResolvedValue({ id: 9 } as never);
    await service.repeatFromServiceRecord(7, 5, {
      startTime: '2026-09-01T08:00:00Z',
      endTime: '2026-09-01T10:00:00Z',
      address: '原服务地址',
    });
    expect(service.createForTechnician).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        customerId: 3,
        serviceId: 'svc_1',
        price: 288,
        sourceServiceRecordId: 5,
        isRepeatBooking: true,
      }),
    );
  });
});
