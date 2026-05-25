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
    const orderIds = new Map<string, number>();

    let nextTechnicianId = 10;
    let nextClientId = 100;
    let nextCustomerId = 200;
    let nextAddressId = 300;
    let nextConversationId = 400;
    let nextOrderId = 600;

    const prisma = {
      subscriptionPlan: {
        upsert: jest.fn(({ where, create }: any) => ({
          id: planIds.get(where.code) ?? planIds.get(create.code) ?? 999,
          code: create.code,
        })),
      },
      technician: {
        upsert: jest.fn(({ where, create, update }: any) => {
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
        upsert: jest.fn(({ where, create, update }: any) => ({
          id: where.technicianId,
          technicianId: where.technicianId,
          ...(create ?? update),
        })),
      },
      clientUser: {
        upsert: jest.fn(({ where, create, update }: any) => {
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
        upsert: jest.fn(({ where, create, update }: any) => ({
          id:
            where.clientId_techId.clientId * 1000 +
            where.clientId_techId.techId,
          clientId: where.clientId_techId.clientId,
          techId: where.clientId_techId.techId,
          ...(create ?? update),
        })),
      },
      customer: {
        upsert: jest.fn(({ where, create, update }: any) => {
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
        findFirst: jest.fn(({ where }: any) => {
          const key = `${where.clientId}:${where.detailAddress}`;
          if (!addressIds.has(key)) {
            return null;
          }
          return {
            id: addressIds.get(key),
            clientId: where.clientId,
            detailAddress: where.detailAddress,
          };
        }),
        updateMany: jest.fn(() => ({ count: 1 })),
        create: jest.fn(({ data }: any) => {
          const key = `${data.clientId}:${data.detailAddress}`;
          if (!addressIds.has(key)) {
            addressIds.set(key, nextAddressId++);
          }
          return { id: addressIds.get(key), ...data };
        }),
      },
      nailWork: {
        findFirst: jest.fn(() => null),
        create: jest.fn(({ data }: any) => ({
          id: data.sortOrder + 700,
          ...data,
        })),
        update: jest.fn(({ data }: any) => ({ id: 701, ...data })),
      },
      nailWorkLike: {
        findFirst: jest.fn(() => null),
        create: jest.fn(({ data }: any) => ({ id: 1, ...data })),
      },
      nailWorkFavorite: {
        findFirst: jest.fn(() => null),
        create: jest.fn(({ data }: any) => ({ id: 1, ...data })),
      },
      nailWorkComment: {
        findFirst: jest.fn(() => null),
        create: jest.fn(({ data }: any) => ({ id: 1, ...data })),
      },
      clientDesignRequest: {
        findFirst: jest.fn(() => null),
        create: jest.fn(({ data }: any) => ({ id: 801, ...data })),
        update: jest.fn(({ data }: any) => ({ id: 801, ...data })),
      },
      conversation: {
        upsert: jest.fn(({ where, create, update }: any) => {
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
        findFirst: jest.fn(() => null),
        create: jest.fn(({ data }: any) => ({ id: 1, ...data })),
        update: jest.fn(({ where, data }: any) => ({
          id: where.id,
          ...data,
        })),
      },
      order: {
        upsert: jest.fn(({ where, create, update }: any) => {
          const orderNo = where.orderNo;
          if (!orderIds.has(orderNo)) {
            orderIds.set(orderNo, nextOrderId++);
          }
          return {
            id: orderIds.get(orderNo),
            orderNo,
            ...(create ?? update),
          };
        }),
        findFirst: jest.fn(({ where }: any) => {
          const orderNo = where.orderNo;
          return orderIds.has(orderNo)
            ? { id: orderIds.get(orderNo), orderNo }
            : null;
        }),
      },
      revenue: {
        upsert: jest.fn(({ where, create, update }: any) => ({
          id: 900,
          revenueNo: where.revenueNo,
          ...(create ?? update),
        })),
      },
      customServiceRequest: {
        findFirst: jest.fn(() => null),
        create: jest.fn(({ data }: any) => ({ id: 950, ...data })),
        update: jest.fn(({ data }: any) => ({ id: 950, ...data })),
      },
      featureFlag: {
        upsert: jest.fn(({ where, create, update }: any) => ({
          id: 960,
          featureCode: where.featureCode,
          ...(create ?? update),
        })),
      },
      adminRole: {
        upsert: jest.fn(({ where, create, update }: any) => ({
          id: 970,
          code: where.code,
          ...(create ?? update),
        })),
      },
      adminUser: {
        upsert: jest.fn(({ where, create, update }: any) => ({
          id: 971,
          username: where.username,
          ...(create ?? update),
        })),
      },
      operationLog: {
        findFirst: jest.fn(() => null),
        create: jest.fn(({ data }: any) => ({ id: 972, ...data })),
      },
      artistApplication: {
        findMany: jest.fn(({ where }: any) => {
          if (where.phone === '13800138121') {
            return [{ id: 1001, phone: where.phone }];
          }
          return [];
        }),
        findFirst: jest.fn(({ where }: any) => {
          if (where.phone === '13800138121') {
            return { id: 1001, phone: where.phone };
          }
          return null;
        }),
        update: jest.fn(({ where, data }: any) => ({
          id: where.id,
          ...data,
        })),
        create: jest.fn(({ data }: any) => ({ id: 1002, ...data })),
        deleteMany: jest.fn(() => ({ count: 0 })),
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
    expect(prisma.order.upsert).toHaveBeenCalledTimes(10);
    expect(prisma.revenue.upsert).toHaveBeenCalledTimes(5);
    expect(prisma.customServiceRequest.create).toHaveBeenCalled();
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
    expect(result.orderNos).toContain('DEMO-OD-1008');
    expect(result.artistApplicationPhones).toEqual([
      '13800138120',
      '13800138121',
      '13800138122',
      '13800138123',
    ]);
  });
});
