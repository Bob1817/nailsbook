import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import request from 'supertest';
import {
  ContractTestApp,
  createContractTestApp,
  prepareContractSqliteDatabase,
} from './test-app';

describe('Client booking and design HTTP contract', () => {
  let testApp: ContractTestApp;
  let tempDir: string;
  let databaseUrl: string;
  let uploadsPath: string;
  let ownedClientIds: number[] = [];
  let ownedTechnicianIds: number[] = [];
  let ownedInviteCodes: string[] = [];
  let ownedOrderNos: string[] = [];
  let ownedRequestNos: string[] = [];

  beforeAll(async () => {
    tempDir = mkdtempSync(resolve(tmpdir(), 'nailbook-client-order-contract-'));
    databaseUrl = `file:${resolve(tempDir, 'client-order-contract.db')}`;
    uploadsPath = resolve(tempDir, 'uploads');

    prepareContractSqliteDatabase(databaseUrl);
    testApp = await createContractTestApp({ databaseUrl, uploadsPath });
  });

  beforeEach(() => {
    ownedClientIds = [];
    ownedTechnicianIds = [];
    ownedInviteCodes = [];
    ownedOrderNos = [];
    ownedRequestNos = [];
  });

  afterEach(async () => {
    await cleanupOwnedRecords();
  });

  afterAll(async () => {
    await testApp?.cleanup();
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Addresses', () => {
    it('lists, creates, updates, deletes, and sets default address', async () => {
      const { accessToken } = await setupClientAndBinding('addr');

      const listBefore = await request(testApp.app.getHttpServer())
        .get('/api/client/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(listBefore.body).toEqual([]);

      const createRes = await request(testApp.app.getHttpServer())
        .post('/api/client/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          contactName: 'Contract User',
          contactPhone: '13800000001',
          province: 'Guangdong',
          city: 'Shenzhen',
          district: 'Nanshan',
          detailAddress: '88 Tech Park Road',
          doorInfo: 'A1203',
          isDefault: true,
        })
        .expect(201);

      expect(createRes.body).toMatchObject({
        id: expect.any(Number),
        contactName: 'Contract User',
        contactPhone: '13800000001',
        province: 'Guangdong',
        city: 'Shenzhen',
        district: 'Nanshan',
        detailAddress: '88 Tech Park Road',
        doorInfo: 'A1203',
        isDefault: true,
      });

      const addressId = createRes.body.id;

      const listAfter = await request(testApp.app.getHttpServer())
        .get('/api/client/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(listAfter.body).toHaveLength(1);
      expect(listAfter.body[0].id).toBe(addressId);

      await request(testApp.app.getHttpServer())
        .patch(`/api/client/addresses/${addressId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ contactName: 'Updated Name' })
        .expect(200);

      const secondAddr = await request(testApp.app.getHttpServer())
        .post('/api/client/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          contactName: 'Second Contact',
          city: 'Shanghai',
          detailAddress: '99 Test Ave',
          isDefault: false,
        })
        .expect(201);

      await request(testApp.app.getHttpServer())
        .post(`/api/client/addresses/${secondAddr.body.id}/default`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const afterDefault = await request(testApp.app.getHttpServer())
        .get('/api/client/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const defaultAddr = afterDefault.body.find((a: any) => a.isDefault);
      expect(defaultAddr.id).toBe(secondAddr.body.id);

      await request(testApp.app.getHttpServer())
        .delete(`/api/client/addresses/${secondAddr.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Orders', () => {
    it('creates an order, lists it, and returns detail with quote fields', async () => {
      const { accessToken, client, technician } = await setupClientAndBinding('order-create');
      const address = await createAddress(accessToken, 'Order Addr');

      const createRes = await request(testApp.app.getHttpServer())
        .post('/api/client/orders')
        .set('Authorization', `Bearer ${accessToken}`)
.send({
          techId: technician.id,
          serviceDate: '2026-06-15',
          startTime: '14:00',
          serviceType: '到店美甲',
          shopAddress: { name: 'Contract Studio' },
          selectedServiceIds: ['contract-basic'],
          remark: 'Contract test order',
        })
        .expect(201);

      expect(createRes.body).toMatchObject({
        id: expect.any(Number),
        orderNo: expect.any(String),
        status: 'pending_quote',
        serviceType: '到店美甲',
        remark: 'Contract test order',
        quotePrice: 0,
        quoteRemark: null,
      });
      ownedOrderNos.push(createRes.body.orderNo);

      const listRes = await request(testApp.app.getHttpServer())
        .get('/api/client/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(listRes.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: createRes.body.id }),
        ]),
      );

      const detailRes = await request(testApp.app.getHttpServer())
        .get(`/api/client/orders/${createRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(detailRes.body.id).toBe(createRes.body.id);
      expect(detailRes.body).toMatchObject({
        orderNo: createRes.body.orderNo,
        status: 'pending_quote',
        serviceType: '到店美甲',
      });
    });

    it('updates an order with new address, date, and time', async () => {
      const { accessToken, technician } = await setupClientAndBinding('order-update');
      const address = await createAddress(accessToken, 'Update Addr');
      const secondAddress = await createAddress(accessToken, 'Second Addr');

      const order = await request(testApp.app.getHttpServer())
        .post('/api/client/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          techId: technician.id,
          serviceDate: '2026-06-15',
          startTime: '14:00',
          serviceType: '上门美甲',
          addressId: address.id,
          selectedServiceIds: ['contract-basic'],
        })
        .expect(201);
      ownedOrderNos.push(order.body.orderNo);

      const updateRes = await request(testApp.app.getHttpServer())
        .patch(`/api/client/orders/${order.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          addressId: secondAddress.id,
          serviceDate: '2026-06-20',
          startTime: '10:00',
        })
        .expect(200);

      expect(updateRes.body).toMatchObject({
        id: order.body.id,
      });
    });

    it('agrees to a quoted order and rejects a quote with reason', async () => {
      const { accessToken, technician } = await setupClientAndBinding('order-quote');
      const address = await createAddress(accessToken, 'Quote Addr');

      const order = await request(testApp.app.getHttpServer())
        .post('/api/client/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          techId: technician.id,
          serviceDate: '2026-06-15',
          startTime: '14:00',
          serviceType: '到店美甲',
          shopAddress: { name: 'Contract Studio' },
          selectedServiceIds: ['contract-basic'],
        })
        .expect(201);
      ownedOrderNos.push(order.body.orderNo);

      await seedQuoteOnOrder(order.body.id, 299, 'Includes materials');

      const agreeRes = await request(testApp.app.getHttpServer())
        .post(`/api/client/orders/${order.body.id}/agree`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
      expect(agreeRes.body).toMatchObject({
        id: order.body.id,
      });

      const order2 = await request(testApp.app.getHttpServer())
        .post('/api/client/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          techId: technician.id,
          serviceDate: '2026-07-01',
          startTime: '15:00',
          serviceType: '到店美甲',
          shopAddress: { name: 'Contract Studio' },
          selectedServiceIds: ['contract-basic'],
        })
        .expect(201);
      ownedOrderNos.push(order2.body.orderNo);

      await seedQuoteOnOrder(order2.body.id, 500, 'Premium service');

      const rejectRes = await request(testApp.app.getHttpServer())
        .post(`/api/client/orders/${order2.body.id}/reject-quote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'Too expensive' })
        .expect(201);
      expect(rejectRes.body).toMatchObject({
        id: order2.body.id,
      });
    });

    it('updates order status to cancelled', async () => {
      const { accessToken, technician } = await setupClientAndBinding('order-cancel');
      const address = await createAddress(accessToken, 'Cancel Addr');

      const order = await request(testApp.app.getHttpServer())
        .post('/api/client/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          techId: technician.id,
          serviceDate: '2026-06-15',
          startTime: '14:00',
          serviceType: '到店美甲',
          shopAddress: { name: 'Contract Studio' },
          selectedServiceIds: ['contract-basic'],
        })
        .expect(201);
      ownedOrderNos.push(order.body.orderNo);

      const statusRes = await request(testApp.app.getHttpServer())
        .patch(`/api/client/orders/${order.body.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'cancelled' })
        .expect(200);
      expect(statusRes.body).toMatchObject({
        id: order.body.id,
      });
    });

    it('returns trips for home-service orders', async () => {
      const { accessToken, technician } = await setupClientAndBinding('order-trips');
      const address = await createAddress(accessToken, 'Trip Addr');

      await request(testApp.app.getHttpServer())
        .post('/api/client/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          techId: technician.id,
          serviceDate: '2026-06-15',
          startTime: '14:00',
          serviceType: '上门美甲',
          addressId: address.id,
          selectedServiceIds: ['contract-basic'],
        })
        .expect(201);

      const tripsRes = await request(testApp.app.getHttpServer())
        .get('/api/client/orders/trips')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(Array.isArray(tripsRes.body)).toBe(true);
    });
  });

  describe('Designs', () => {
    it('creates a design, lists it, returns detail, and updates it', async () => {
      const { accessToken, technician } = await setupClientAndBinding('design-crud');

      const createRes = await request(testApp.app.getHttpServer())
        .post('/api/client/designs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Contract Design',
          description: 'A test design',
          techId: technician.id,
          imageUrls: ['https://example.com/design1.jpg'],
        })
        .expect(201);

      expect(createRes.body).toMatchObject({
        id: expect.any(Number),
        title: 'Contract Design',
        description: 'A test design',
        status: 'pending_quote',
      });

      const listRes = await request(testApp.app.getHttpServer())
        .get('/api/client/designs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(listRes.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: createRes.body.id }),
        ]),
      );

      const detailRes = await request(testApp.app.getHttpServer())
        .get(`/api/client/designs/${createRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(detailRes.body.id).toBe(createRes.body.id);

      const updateRes = await request(testApp.app.getHttpServer())
        .patch(`/api/client/designs/${createRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated Design Title', description: 'Updated desc' })
        .expect(200);
      expect(updateRes.body).toMatchObject({
        id: createRes.body.id,
        title: 'Updated Design Title',
      });
    });

    it('switches technician on a design and deletes it', async () => {
      const { accessToken, client, technician } = await setupClientAndBinding('design-switch');
      const secondTech = await createTechnician('design-switch-alt');
      await createBinding(client.id, secondTech.id, secondTech.inviteCode);

      const design = await request(testApp.app.getHttpServer())
        .post('/api/client/designs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Switch Test',
          techId: technician.id,
          imageUrls: ['https://example.com/switch1.jpg'],
        })
        .expect(201);

      const switchRes = await request(testApp.app.getHttpServer())
        .patch(`/api/client/designs/${design.body.id}/switch-technician`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ techId: secondTech.id })
        .expect(200);
      expect(switchRes.body).toMatchObject({
        id: design.body.id,
      });

      await request(testApp.app.getHttpServer())
        .delete(`/api/client/designs/${design.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Custom Service Requests', () => {
    it('creates, lists, and returns detail for a custom service request', async () => {
      const { accessToken, technician } = await setupClientAndBinding('csr-crud');

      const createRes = await request(testApp.app.getHttpServer())
        .post('/api/client/custom-service-requests')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          techId: technician.id,
          title: 'Custom Nail Art',
          description: 'Holiday themed nails',
          images: ['https://example.com/ref1.jpg'],
          serviceDate: '2026-06-20',
          startTime: '10:00',
          serviceType: '到店',
        })
        .expect(201);

      expect(createRes.body).toMatchObject({
        id: expect.any(Number),
        requestNo: expect.any(String),
        title: 'Custom Nail Art',
        description: 'Holiday themed nails',
        status: 'pending_quote',
        techId: technician.id,
      });
      ownedRequestNos.push(createRes.body.requestNo);

      const listRes = await request(testApp.app.getHttpServer())
        .get('/api/client/custom-service-requests')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(listRes.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: createRes.body.id }),
        ]),
      );

      const detailRes = await request(testApp.app.getHttpServer())
        .get(`/api/client/custom-service-requests/${createRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(detailRes.body.id).toBe(createRes.body.id);
    });

    it('accepts, rejects, and cancels custom service requests', async () => {
      const { accessToken, technician } = await setupClientAndBinding('csr-actions');

      const csr = await request(testApp.app.getHttpServer())
        .post('/api/client/custom-service-requests')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          techId: technician.id,
          title: 'CSR Accept Test',
          serviceDate: '2026-07-01',
          startTime: '14:00',
          serviceType: '上门',
        })
        .expect(201);
      ownedRequestNos.push(csr.body.requestNo);

      await seedQuoteOnCustomServiceRequest(csr.body.id, 399, 'Includes gel');

      const acceptRes = await request(testApp.app.getHttpServer())
        .patch(`/api/client/custom-service-requests/${csr.body.id}/accept`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(acceptRes.body).toMatchObject({ id: csr.body.id });

      const csr2 = await request(testApp.app.getHttpServer())
        .post('/api/client/custom-service-requests')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          techId: technician.id,
          title: 'CSR Reject Test',
          serviceDate: '2026-07-02',
          startTime: '15:00',
          serviceType: '到店',
        })
        .expect(201);
      ownedRequestNos.push(csr2.body.requestNo);

      await seedQuoteOnCustomServiceRequest(csr2.body.id, 599, 'Premium');

      const rejectRes = await request(testApp.app.getHttpServer())
        .patch(`/api/client/custom-service-requests/${csr2.body.id}/reject`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(rejectRes.body).toMatchObject({ id: csr2.body.id });

      const csr3 = await request(testApp.app.getHttpServer())
        .post('/api/client/custom-service-requests')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          techId: technician.id,
          title: 'CSR Cancel Test',
          serviceDate: '2026-07-03',
          startTime: '16:00',
          serviceType: '到店',
        })
        .expect(201);
      ownedRequestNos.push(csr3.body.requestNo);

      const cancelRes = await request(testApp.app.getHttpServer())
        .patch(`/api/client/custom-service-requests/${csr3.body.id}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(cancelRes.body).toMatchObject({ id: csr3.body.id });
    });
  });

  async function setupClientAndBinding(label: string) {
    const client = await createClient(label);
    const technician = await createTechnician(label);
    await createBinding(client.id, technician.id, technician.inviteCode);
    const accessToken = testApp.signClientToken(client.id, client.phone);
    return { accessToken, client, technician };
  }

  async function createClient(label: string) {
    const phone = uniquePhone();
    const client = await testApp.prisma.clientUser.create({
      data: {
        phone,
        nickname: `Contract Client ${label}`,
        status: 'active',
      },
    });
    ownedClientIds.push(client.id);
    return { id: client.id, phone: client.phone, nickname: client.nickname };
  }

  async function createTechnician(
    label: string,
    overrides: {
      city?: string;
      serviceArea?: string;
      status?: string;
    } = {},
  ) {
    const phone = uniquePhone();
    const inviteCode = uniqueInviteCode(label);
    ownedInviteCodes.push(inviteCode);

    const technician = await testApp.prisma.technician.create({
      data: {
        name: `Contract Tech ${label}`,
        phone,
        avatarUrl: null,
        city: overrides.city ?? 'Shanghai',
        serviceArea: overrides.serviceArea ?? 'Downtown',
        status: overrides.status ?? 'active',
        invitationCode: inviteCode,
        homeService: true,
        shopService: true,
        shopAddresses: JSON.stringify([
          {
            name: 'Contract Studio',
            city: 'Shanghai',
            detailAddress: '88 Test Road',
            enabled: true,
          },
        ]),
        serviceItems: JSON.stringify([
          {
            id: 'contract-basic',
            name: 'Basic Care',
            category: 'basic_care',
            isActive: true,
            sortOrder: 1,
          },
        ]),
      },
    });
    ownedTechnicianIds.push(technician.id);
    return {
      id: technician.id,
      name: technician.name,
      phone: technician.phone,
      inviteCode,
    };
  }

  async function createBinding(clientId: number, techId: number, inviteCode: string) {
    await testApp.prisma.clientTechBinding.create({
      data: {
        clientId,
        techId,
        inviteCode,
        bindSource: 'invite',
        isDefault: true,
        status: 'active',
      },
    });
  }

  async function createAddress(accessToken: string, label: string) {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/client/addresses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contactName: label,
        contactPhone: '13800000001',
        city: 'Shanghai',
        district: 'Pudong',
        detailAddress: `${label} 88 Road`,
        isDefault: true,
      })
      .expect(201);
    return { id: res.body.id };
  }

  async function seedQuoteOnOrder(orderId: number, price: number, remark: string) {
    await testApp.prisma.order.update({
      where: { id: orderId },
      data: {
        quotePrice: price,
        quoteRemark: remark,
        quotedAt: new Date(),
        status: 'pending_agree',
      },
    });
  }

  async function seedQuoteOnCustomServiceRequest(requestId: number, price: number, remark: string) {
    await testApp.prisma.customServiceRequest.update({
      where: { id: requestId },
      data: {
        quotePrice: price,
        quoteRemark: remark,
        quotedAt: new Date(),
        status: 'quoted',
      },
    });
  }

  async function cleanupOwnedRecords() {
    if (!testApp) return;

    const allIds = [...ownedClientIds, ...ownedTechnicianIds];
    const allCodes = [...ownedInviteCodes];

    await testApp.prisma.revenue.deleteMany({
      where: {
        OR: [
          { order: { orderNo: { in: ownedOrderNos } } },
          { technicianId: { in: ownedTechnicianIds } },
        ],
      },
    }).catch(() => {});

    await testApp.prisma.order.deleteMany({
      where: {
        OR: [
          { orderNo: { in: ownedOrderNos } },
          { clientUserId: { in: ownedClientIds } },
          { technicianId: { in: ownedTechnicianIds } },
        ],
      },
    }).catch(() => {});

    await testApp.prisma.customServiceRequest.deleteMany({
      where: {
        OR: [
          { requestNo: { in: ownedRequestNos } },
          { clientId: { in: ownedClientIds } },
          { techId: { in: ownedTechnicianIds } },
        ],
      },
    }).catch(() => {});

    await testApp.prisma.clientDesignRequest.deleteMany({
      where: {
        OR: [
          { clientId: { in: ownedClientIds } },
          { techId: { in: ownedTechnicianIds } },
        ],
      },
    }).catch(() => {});

    await testApp.prisma.clientAddress.deleteMany({
      where: { clientId: { in: ownedClientIds } },
    }).catch(() => {});

    await testApp.prisma.message.deleteMany({
      where: {
        conversation: {
          OR: [
            { clientId: { in: ownedClientIds } },
            { techId: { in: ownedTechnicianIds } },
          ],
        },
      },
    }).catch(() => {});

    await testApp.prisma.conversation.deleteMany({
      where: {
        OR: [
          { clientId: { in: ownedClientIds } },
          { techId: { in: ownedTechnicianIds } },
        ],
      },
    }).catch(() => {});

    await testApp.prisma.clientTechBinding.deleteMany({
      where: {
        OR: [
          { clientId: { in: ownedClientIds } },
          { techId: { in: ownedTechnicianIds } },
          { inviteCode: { in: allCodes } },
        ],
      },
    });

    await testApp.prisma.customer.deleteMany({
      where: {
        OR: [
          { technicianId: { in: ownedTechnicianIds } },
          { clientUserId: { in: ownedClientIds } },
        ],
      },
    });

    await testApp.prisma.clientUser.deleteMany({
      where: { id: { in: ownedClientIds } },
    });
    await testApp.prisma.technician.deleteMany({
      where: { id: { in: ownedTechnicianIds } },
    });
  }

  function uniquePhone() {
    const digits = `${Date.now()}${Math.floor(Math.random() * 100000)}`
      .slice(-9)
      .padStart(9, '0');
    return `17${digits}`;
  }

  function uniqueInviteCode(label: string) {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 100000)}`
      .slice(-8)
      .toUpperCase();
    return `${label.replace(/[^a-z0-9]/gi, '').slice(0, 8)}${suffix}`.toUpperCase();
  }
});