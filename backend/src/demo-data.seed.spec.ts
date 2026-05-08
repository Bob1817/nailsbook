import { ensureDemoData } from './demo-data.seed';

describe('ensureDemoData', () => {
  it('upserts a stable demo dataset for the primary technician, five clients, and platform-side records', async () => {
    const planIds = new Map<string, number>([
      ['free', 1],
      ['pro', 2],
      ['studio_plus', 3],
    ]);
    const technicianIds = new Map<string, number>();
    const clientIds = new Map<string, number>();
    const customerIds = new Map<string, number>();
    const addressIds = new Map<string, number>();
    const conversationIds = new Map<string, number>();
    const quoteIds = new Map<string, number>();
    const bookingIds = new Map<string, number>();

    let nextTechnicianId = 10;
    let nextClientId = 100;
    let nextCustomerId = 200;
    let nextAddressId = 300;
    let nextConversationId = 400;
    let nextQuoteId = 500;
    let nextBookingId = 600;

    const prisma = {
      subscriptionPlan: {
        upsert: jest.fn(async ({ where, create }: any) => ({
          id: planIds.get(where.code) ?? planIds.get(create.code) ?? 999,
          code: create.code,
        })),
      },
      technician: {
        upsert: jest.fn(async ({ where, create, update }: any) => {
          const phone = where.phone;
          if (!technicianIds.has(phone)) {
            technicianIds.set(phone, nextTechnicianId++);
          }
          return {
            id: technicianIds.get(phone),
            phone,
            ...(create ?? update),
          };
        }),
      },
      technicianSubscription: {
        upsert: jest.fn(async ({ where, create, update }: any) => ({
          id: where.technicianId,
          technicianId: where.technicianId,
          ...(create ?? update),
        })),
      },
      clientUser: {
        upsert: jest.fn(async ({ where, create, update }: any) => {
          const phone = where.phone;
          if (!clientIds.has(phone)) {
            clientIds.set(phone, nextClientId++);
          }
          return {
            id: clientIds.get(phone),
            phone,
            ...(create ?? update),
          };
        }),
      },
      clientTechBinding: {
        upsert: jest.fn(async ({ where, create, update }: any) => ({
          id: where.clientId_techId.clientId * 1000 + where.clientId_techId.techId,
          clientId: where.clientId_techId.clientId,
          techId: where.clientId_techId.techId,
          ...(create ?? update),
        })),
      },
      customer: {
        upsert: jest.fn(async ({ where, create, update }: any) => {
          const key = `${where.technicianId_clientUserId.technicianId}:${where.technicianId_clientUserId.clientUserId}`;
          if (!customerIds.has(key)) {
            customerIds.set(key, nextCustomerId++);
          }
          return {
            id: customerIds.get(key),
            technicianId: where.technicianId_clientUserId.technicianId,
            clientUserId: where.technicianId_clientUserId.clientUserId,
            ...(create ?? update),
          };
        }),
      },
      clientAddress: {
        findFirst: jest.fn(async ({ where }: any) => {
          const key = `${where.clientId}:${where.detailAddress}`;
          if (!addressIds.has(key)) {
            return null;
          }
          return { id: addressIds.get(key), clientId: where.clientId, detailAddress: where.detailAddress };
        }),
        updateMany: jest.fn(async () => ({ count: 1 })),
        create: jest.fn(async ({ data }: any) => {
          const key = `${data.clientId}:${data.detailAddress}`;
          if (!addressIds.has(key)) {
            addressIds.set(key, nextAddressId++);
          }
          return { id: addressIds.get(key), ...data };
        }),
      },
      nailWork: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({ id: data.sortOrder + 700, ...data })),
        update: jest.fn(async ({ data }: any) => ({ id: 701, ...data })),
      },
      nailWorkLike: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({ id: 1, ...data })),
      },
      nailWorkFavorite: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({ id: 1, ...data })),
      },
      nailWorkComment: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({ id: 1, ...data })),
      },
      clientDesignRequest: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({ id: 801, ...data })),
        update: jest.fn(async ({ data }: any) => ({ id: 801, ...data })),
      },
      conversation: {
        upsert: jest.fn(async ({ where, create, update }: any) => {
          const key = `${where.clientId_techId.clientId}:${where.clientId_techId.techId}`;
          if (!conversationIds.has(key)) {
            conversationIds.set(key, nextConversationId++);
          }
          return {
            id: conversationIds.get(key),
            clientId: where.clientId_techId.clientId,
            techId: where.clientId_techId.techId,
            ...(create ?? update),
          };
        }),
      },
      message: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({ id: 1, ...data })),
        update: jest.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      },
      quote: {
        upsert: jest.fn(async ({ where, create, update }: any) => {
          const quoteNo = where.quoteNo;
          if (!quoteIds.has(quoteNo)) {
            quoteIds.set(quoteNo, nextQuoteId++);
          }
          return {
            id: quoteIds.get(quoteNo),
            quoteNo,
            ...(create ?? update),
          };
        }),
      },
      booking: {
        upsert: jest.fn(async ({ where, create, update }: any) => {
          const bookingNo = where.bookingNo;
          if (!bookingIds.has(bookingNo)) {
            bookingIds.set(bookingNo, nextBookingId++);
          }
          return {
            id: bookingIds.get(bookingNo),
            bookingNo,
            ...(create ?? update),
          };
        }),
      },
      revenue: {
        upsert: jest.fn(async ({ where, create, update }: any) => ({
          id: 900,
          revenueNo: where.revenueNo,
          ...(create ?? update),
        })),
      },
      artistApplication: {
        findMany: jest.fn(async ({ where }: any) => {
          if (where.phone === '13800138121') {
            return [{ id: 1001, phone: where.phone }];
          }
          return [];
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          if (where.phone === '13800138121') {
            return { id: 1001, phone: where.phone };
          }
          return null;
        }),
        update: jest.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
        create: jest.fn(async ({ data }: any) => ({ id: 1002, ...data })),
        deleteMany: jest.fn(async () => ({ count: 0 })),
      },
    };

    const result = await ensureDemoData(prisma as any);

    expect(prisma.subscriptionPlan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: 'pro' },
      }),
    );
    expect(prisma.technician.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone: '13800138000' },
      }),
    );
    expect(prisma.clientUser.upsert).toHaveBeenCalledTimes(5);
    expect(prisma.booking.upsert).toHaveBeenCalledTimes(8);
    expect(prisma.revenue.upsert).toHaveBeenCalledTimes(4);
    expect(prisma.artistApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1001 },
      }),
    );
    expect(prisma.artistApplication.create).toHaveBeenCalled();
    expect(result.clientPhones).toEqual([
      '13800138001',
      '13800138002',
      '13800138003',
      '13800138004',
      '13800138005',
    ]);
    expect(result.bookingNos).toContain('DEMO-BKG-1008');
    expect(result.artistApplicationPhones).toEqual([
      '13800138120',
      '13800138121',
      '13800138122',
      '13800138123',
    ]);
  });
});
