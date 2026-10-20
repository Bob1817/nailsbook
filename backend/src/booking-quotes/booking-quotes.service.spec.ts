import { BookingQuotesService } from './booking-quotes.service';

describe('BookingQuotesService', () => {
  it('uses authoritative service price and technician attribution', async () => {
    const prisma: any = {
      technician: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          name: '贝贝',
          status: 'active',
          invitationCode: 'ABCD1234',
          shopAddresses:
            '[{"name":"听栖美甲工作室","latitude":"invalid","longitude":"120.1"}]',
          bookingNotes: '迟到请提前联系',
          brandProfile: {
            latePolicy: '迟到 15 分钟请联系主理人',
            cancellationPolicy: '提前一天可免费改期',
          },
        }),
      },
      service: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 11,
            publicId: 'svc-1',
            name: '基础护理',
            priceMinFen: 8800,
            durationMinutes: 60,
          },
        ]),
      },
      bookingQuote: {
        create: jest.fn(async ({ data }) => ({
          id: 1,
          ...data,
          lines: data.lines.create,
        })),
      },
    };
    const service = new BookingQuotesService(prisma, {} as never, {} as never);
    const result = await service.create(7, {
      lines: [
        { lineType: 'service', servicePublicId: 'svc-1', unitPriceFen: 1 },
        {
          lineType: 'material',
          name: '珍珠饰品',
          unitPriceFen: 1200,
          quantity: 2,
        },
      ],
      finalPriceFen: 10500,
      totalDurationMinutes: 150,
    });
    expect(result.invitationCode).toBe('ABCD1234');
    expect(result.lines[0]).toMatchObject({
      unitPriceFen: 8800,
      subtotalFen: 8800,
    });
    expect(result.materialSubtotalFen).toBe(2400);
    expect(result.totalDurationMinutes).toBe(150);
    expect(result.shopLatitude).toBeNull();
    expect(result.shopLongitude).toBe(120.1);
    expect(result.bookingRules).toContain('改期/取消规则：提前一天可免费改期');
    expect(result.sharePath).toContain('invite=ABCD1234');
  });

  it('records a standard decline reason without taking ownership of the quote', async () => {
    const prisma: any = {
      bookingQuote: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          clientUserId: null,
          status: 'viewed',
          expiresAt: new Date(Date.now() + 60000),
          lines: [],
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new BookingQuotesService(prisma, {} as never, {} as never);
    await expect(service.decline('c'.repeat(48), '最近没空')).resolves.toEqual({
      saved: true,
    });
    expect(prisma.bookingQuote.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 1, clientUserId: null }),
        data: expect.objectContaining({ declineReason: '最近没空' }),
      }),
    );
  });

  it('binds the authenticated client to the quote technician when accepting', async () => {
    const quote: any = {
      id: 1,
      quoteNo: 'ONQ1',
      technicianId: 7,
      invitationCodeSnapshot: 'ABCD1234',
      clientUserId: null,
      status: 'viewed',
      expiresAt: new Date(Date.now() + 60000),
      lines: [],
    };
    const tx: any = {
      clientTechBinding: { upsert: jest.fn() },
      customer: { upsert: jest.fn().mockResolvedValue({ id: 22 }) },
      bookingQuote: {
        update: jest.fn().mockResolvedValue({
          ...quote,
          clientUserId: 8,
          customerId: 22,
          status: 'accepted_pending_schedule',
        }),
      },
    };
    const prisma: any = {
      bookingQuote: { findUnique: jest.fn().mockResolvedValue(quote) },
      clientUser: {
        findUnique: jest.fn().mockResolvedValue({
          id: 8,
          status: 'active',
          phone: '13800000000',
          nickname: '客户',
        }),
      },
      clientTechBinding: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn((fn) => fn(tx)),
    };
    const service = new BookingQuotesService(prisma, {} as never, {} as never);
    const result = await service.accept(8, 'd'.repeat(48));
    expect(tx.clientTechBinding.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          clientId: 8,
          techId: 7,
          inviteCode: 'ABCD1234',
          bindSource: 'booking_quote',
        }),
      }),
    );
    expect(result.status).toBe('accepted_pending_schedule');
  });

  it('prevents another client from accepting an attributed quote', async () => {
    const prisma: any = {
      bookingQuote: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          technicianId: 7,
          clientUserId: 8,
          status: 'accepted_pending_schedule',
          expiresAt: new Date(Date.now() + 60000),
          lines: [],
        }),
      },
    };
    const service = new BookingQuotesService(prisma, {} as never, {} as never);
    await expect(service.accept(9, 'a'.repeat(48))).rejects.toThrow('其他客户');
  });

  it('books with server-owned idempotency and quoted duration', async () => {
    const quote: any = {
      id: 5,
      quoteNo: 'ONQ1',
      technicianId: 7,
      clientUserId: 8,
      status: 'accepted_pending_schedule',
      version: 1,
      expiresAt: new Date(Date.now() + 60000),
      serviceType: '到店美甲',
      requirement: '参考图款式',
      referenceImages: null,
      serviceSubtotalFen: 8800,
      materialSubtotalFen: 1200,
      surchargeSubtotalFen: 0,
      discountAmountFen: 500,
      finalPriceFen: 9500,
      totalDurationMinutes: 105,
      shopNameSnapshot: '听栖美甲工作室',
      lines: [
        {
          id: 1,
          lineType: 'service',
          serviceId: 11,
          servicePublicIdSnapshot: 'svc-1',
          nameSnapshot: '基础护理',
          unitPriceFen: 8800,
          durationMinutes: 60,
          quantity: 1,
          subtotalFen: 8800,
          sortOrder: 0,
        },
        {
          id: 2,
          lineType: 'material',
          serviceId: null,
          servicePublicIdSnapshot: null,
          nameSnapshot: '饰品',
          unitPriceFen: 1200,
          durationMinutes: 45,
          quantity: 1,
          subtotalFen: 1200,
          sortOrder: 1,
        },
      ],
    };
    const tx: any = {
      order: { update: jest.fn() },
      bookingQuote: {
        update: jest.fn().mockResolvedValue({
          ...quote,
          status: 'booked',
          orderId: 33,
          order: { id: 33, orderNo: 'O1' },
        }),
      },
    };
    const prisma: any = {
      bookingQuote: { findUnique: jest.fn().mockResolvedValue(quote) },
      $transaction: jest.fn((fn) => fn(tx)),
    };
    const clientOrders: any = {
      create: jest.fn().mockResolvedValue({ id: 33 }),
    };
    const service = new BookingQuotesService(prisma, clientOrders, {} as never);
    await service.book(8, 'b'.repeat(48), {
      version: 1,
      serviceDate: '2099-01-01',
      startTime: '10:00',
    });
    expect(clientOrders.create).toHaveBeenCalledWith(
      8,
      expect.objectContaining({
        applicationKey: 'booking-quote-5',
        shopAddress: { name: '听栖美甲工作室' },
      }),
      expect.objectContaining({
        totalDurationMinutes: 105,
        finalPriceFen: 9500,
      }),
    );
  });
});
