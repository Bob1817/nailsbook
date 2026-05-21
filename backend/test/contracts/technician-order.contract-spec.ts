import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import request from 'supertest';
import {
  ContractTestApp,
  createContractTestApp,
  prepareContractSqliteDatabase,
} from './test-app';

describe('Technician operation HTTP contract', () => {
  let testApp: ContractTestApp;
  let tempDir: string;
  let databaseUrl: string;
  let uploadsPath: string;
  let ownedTechnicianIds: number[] = [];
  let ownedClientIds: number[] = [];
  let ownedCustomerIds: number[] = [];
  let ownedOrderNos: string[] = [];
  let ownedInviteCodes: string[] = [];

  beforeAll(async () => {
    tempDir = mkdtempSync(resolve(tmpdir(), 'nailbook-tech-order-contract-'));
    databaseUrl = `file:${resolve(tempDir, 'tech-order-contract.db')}`;
    uploadsPath = resolve(tempDir, 'uploads');

    prepareContractSqliteDatabase(databaseUrl);
    testApp = await createContractTestApp({ databaseUrl, uploadsPath });
  });

  beforeEach(() => {
    ownedTechnicianIds = [];
    ownedClientIds = [];
    ownedCustomerIds = [];
    ownedOrderNos = [];
    ownedInviteCodes = [];
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

  describe('Technician Auth', () => {
    it('returns technician profile from /auth/me', async () => {
      const { accessToken, technician } = await setupTechnician('me');

      const res = await request(testApp.app.getHttpServer())
        .get('/api/technician/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: technician.id,
        name: technician.name,
        phone: technician.phone,
        status: 'active',
        homeService: true,
        shopService: true,
      });
    });

    it('updates technician status', async () => {
      const { accessToken, technician } = await setupTechnician('status');

      const res = await request(testApp.app.getHttpServer())
        .patch('/api/technician/auth/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'inactive' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: technician.id,
        status: 'inactive',
      });
    });

    it('updates technician profile', async () => {
      const { accessToken, technician } = await setupTechnician('profile');

      const res = await request(testApp.app.getHttpServer())
        .patch('/api/technician/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name', city: 'Beijing', serviceArea: 'Chaoyang' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: technician.id,
        name: 'Updated Name',
        city: 'Beijing',
        serviceArea: 'Chaoyang',
      });
    });

    it('updates service type with shop addresses', async () => {
      const { accessToken, technician } = await setupTechnician('svc-type');

      const res = await request(testApp.app.getHttpServer())
        .patch('/api/technician/auth/service-type')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          homeService: true,
          shopService: true,
          shopAddresses: [
            {
              name: 'New Studio',
              city: 'Beijing',
              detailAddress: '100 Art Road',
              enabled: true,
            },
          ],
        })
        .expect(200);

      expect(res.body).toMatchObject({
        id: technician.id,
        homeService: true,
        shopService: true,
      });
    });
  });

  describe('Technician Orders', () => {
    it('creates an order for a customer and lists it', async () => {
      const { accessToken, technician, customer } = await setupTechnicianWithCustomer('order-create');

      const createRes = await request(testApp.app.getHttpServer())
        .post('/api/technician/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customerId: customer.id,
          serviceName: 'Basic Care',
          startTime: '2026-06-15T14:00:00.000Z',
          endTime: '2026-06-15T16:00:00.000Z',
          address: '88 Test Road',
          serviceType: '上门服务',
        })
        .expect(201);

      expect(createRes.body).toMatchObject({
        id: expect.any(Number),
        orderNo: expect.any(String),
        status: expect.any(String),
        serviceType: '上门服务',
      });
      ownedOrderNos.push(createRes.body.orderNo);

      const listRes = await request(testApp.app.getHttpServer())
        .get('/api/technician/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const ordersList = Array.isArray(listRes.body) ? listRes.body : listRes.body.data;
      expect(Array.isArray(ordersList)).toBe(true);
    });

    it('reviews/quotes, confirms, completes, and cancels orders', async () => {
      const { accessToken, technician, customer } = await setupTechnicianWithCustomer('order-flow');

      const order = await seedOrder(technician.id, customer.id, 'pending_quote');

      const reviewRes = await request(testApp.app.getHttpServer())
        .patch(`/api/technician/orders/${order.id}/review`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          price: 299,
          serviceDate: '2026-06-15',
          startTime: '14:00',
          durationMinutes: 120,
          remark: 'Includes materials',
        })
        .expect(200);
      expect(reviewRes.body).toMatchObject({ id: order.id });

      const order2 = await seedOrder(technician.id, customer.id, 'pending_confirm');

      const confirmRes = await request(testApp.app.getHttpServer())
        .patch(`/api/technician/orders/${order2.id}/confirm`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ depositConfirmed: true })
        .expect(200);
      expect(confirmRes.body).toMatchObject({ id: order2.id });

      const order3 = await seedOrder(technician.id, customer.id, 'in_progress');

      const completeRes = await request(testApp.app.getHttpServer())
        .patch(`/api/technician/orders/${order3.id}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(completeRes.body).toMatchObject({
        orderId: order3.id,
        status: 'confirmed',
      });

      const order4 = await seedOrder(technician.id, customer.id, 'pending_quote');

      const cancelRes = await request(testApp.app.getHttpServer())
        .patch(`/api/technician/orders/${order4.id}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(cancelRes.body).toMatchObject({ id: order4.id });
    });

    it('returns trips and order detail', async () => {
      const { accessToken, technician, customer } = await setupTechnicianWithCustomer('order-detail');

      const order = await seedOrder(technician.id, customer.id, 'pending_agree');

      const detailRes = await request(testApp.app.getHttpServer())
        .get(`/api/technician/orders/${order.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(detailRes.body.id).toBe(order.id);

      const tripsRes = await request(testApp.app.getHttpServer())
        .get('/api/technician/orders/trips')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(Array.isArray(tripsRes.body)).toBe(true);
    });
  });

  describe('Technician Customers', () => {
    it('lists customers, returns detail, and updates tags', async () => {
      const { accessToken, technician, customer } = await setupTechnicianWithCustomer('cust-crud');

      const listRes = await request(testApp.app.getHttpServer())
        .get('/api/technician/customers')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const customersList = Array.isArray(listRes.body) ? listRes.body : listRes.body.data;
      expect(Array.isArray(customersList)).toBe(true);
      expect(customersList).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: customer.id }),
        ]),
      );

      const detailRes = await request(testApp.app.getHttpServer())
        .get(`/api/technician/customers/${customer.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(detailRes.body.id).toBe(customer.id);

      const tagsRes = await request(testApp.app.getHttpServer())
        .patch(`/api/technician/customers/${customer.id}/tags`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tags: JSON.stringify(['VIP', 'Regular']) })
        .expect(200);
      expect(tagsRes.body).toMatchObject({ id: customer.id });
    });
  });

  describe('Technician Works', () => {
    it('creates, lists, updates, and deletes works', async () => {
      const { accessToken, technician } = await setupTechnician('works-crud');

      const createRes = await request(testApp.app.getHttpServer())
        .post('/api/technician/works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Contract Work',
          description: 'A test work',
          tags: 'nail,test',
          isVisible: true,
        })
        .expect(201);

      expect(createRes.body).toMatchObject({
        id: expect.any(Number),
        title: 'Contract Work',
        isVisible: true,
      });

      const listRes = await request(testApp.app.getHttpServer())
        .get('/api/technician/works')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(Array.isArray(listRes.body)).toBe(true);

      const detailRes = await request(testApp.app.getHttpServer())
        .get(`/api/technician/works/${createRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(detailRes.body.id).toBe(createRes.body.id);

      const updateRes = await request(testApp.app.getHttpServer())
        .patch(`/api/technician/works/${createRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated Work Title' })
        .expect(200);
      expect(updateRes.body).toMatchObject({
        id: createRes.body.id,
        title: 'Updated Work Title',
      });

      await request(testApp.app.getHttpServer())
        .delete(`/api/technician/works/${createRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('toggles visible, pinned, and featured', async () => {
      const { accessToken, technician } = await setupTechnician('works-toggle');

      const work = await testApp.prisma.nailWork.create({
        data: {
          techId: technician.id,
          title: 'Toggle Test Work',
          isVisible: true,
          isPinned: false,
          isFeatured: false,
        },
      });

      const visibleRes = await request(testApp.app.getHttpServer())
        .post(`/api/technician/works/${work.id}/toggle-visible`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
      expect(visibleRes.body).toMatchObject({ id: work.id });

      const pinnedRes = await request(testApp.app.getHttpServer())
        .post(`/api/technician/works/${work.id}/toggle-pinned`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
      expect(pinnedRes.body).toMatchObject({ id: work.id });

      const featuredRes = await request(testApp.app.getHttpServer())
        .post(`/api/technician/works/${work.id}/toggle-featured`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
      expect(featuredRes.body).toMatchObject({ id: work.id });
    });
  });

  describe('Technician Services', () => {
    it('creates, lists, updates, toggles, and deletes services', async () => {
      const { accessToken, technician } = await setupTechnician('svc-crud');

      const createRes = await request(testApp.app.getHttpServer())
        .post('/api/technician/services')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Contract Service',
          description: 'A test service',
          category: 'basic_care',
        })
        .expect(201);

      expect(createRes.body).toMatchObject({
        id: expect.any(String),
        name: 'Contract Service',
        category: 'basic_care',
      });

      const listRes = await request(testApp.app.getHttpServer())
        .get('/api/technician/services')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(Array.isArray(listRes.body)).toBe(true);

      const updateRes = await request(testApp.app.getHttpServer())
        .patch(`/api/technician/services/${createRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Service', description: 'Updated desc' })
        .expect(200);
      expect(updateRes.body).toMatchObject({
        id: createRes.body.id,
        name: 'Updated Service',
      });

      const toggleRes = await request(testApp.app.getHttpServer())
        .patch(`/api/technician/services/${createRes.body.id}/toggle`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(toggleRes.body).toMatchObject({ id: createRes.body.id });

      await request(testApp.app.getHttpServer())
        .delete(`/api/technician/services/${createRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  async function setupTechnician(label: string) {
    const phone = uniquePhone();
    const inviteCode = uniqueInviteCode(label);
    ownedInviteCodes.push(inviteCode);

    const technician = await testApp.prisma.technician.create({
      data: {
        name: `Contract Tech ${label}`,
        phone,
        avatarUrl: null,
        city: 'Shanghai',
        serviceArea: 'Downtown',
        status: 'active',
        invitationCode: inviteCode,
        homeService: true,
        shopService: true,
        shopAddresses: JSON.stringify([
          { name: 'Contract Studio', city: 'Shanghai', detailAddress: '88 Test Road', enabled: true },
        ]),
        serviceItems: JSON.stringify([
          { id: 'contract-basic', name: 'Basic Care', category: 'basic_care', isActive: true, sortOrder: 1 },
        ]),
      },
    });
    ownedTechnicianIds.push(technician.id);

    const accessToken = testApp.signTechnicianToken(technician.id, technician.phone);
    return { accessToken, technician: { id: technician.id, name: technician.name, phone: technician.phone } };
  }

  async function setupTechnicianWithCustomer(label: string) {
    const result = await setupTechnician(label);
    const client = await testApp.prisma.clientUser.create({
      data: { phone: uniquePhone(), nickname: `Client ${label}`, status: 'active' },
    });
    ownedClientIds.push(client.id);

    const customer = await testApp.prisma.customer.create({
      data: {
        technicianId: result.technician.id,
        clientUserId: client.id,
        name: `Customer ${label}`,
        phone: client.phone,
      },
    });
    ownedCustomerIds.push(customer.id);

    return { ...result, client: { id: client.id }, customer: { id: customer.id, name: customer.name } };
  }

  async function seedOrder(technicianId: number, customerId: number, status: string) {
    const orderNo = uniqueOrderNo();
    ownedOrderNos.push(orderNo);
    const order = await testApp.prisma.order.create({
      data: {
        orderNo,
        technicianId,
        customerId,
        startTime: new Date('2026-06-15T14:00:00.000Z'),
        endTime: new Date('2026-06-15T16:00:00.000Z'),
        address: '88 Test Road',
        serviceType: '上门服务',
        status,
        source: 'technician',
      },
    });
    return { id: order.id, orderNo: order.orderNo };
  }

  async function cleanupOwnedRecords() {
    if (!testApp) return;

    await testApp.prisma.revenue.deleteMany({
      where: { order: { orderNo: { in: ownedOrderNos } } },
    }).catch(() => {});
    await testApp.prisma.order.deleteMany({
      where: { orderNo: { in: ownedOrderNos } },
    }).catch(() => {});
    await testApp.prisma.customer.deleteMany({
      where: { id: { in: ownedCustomerIds } },
    }).catch(() => {});
    await testApp.prisma.nailWork.deleteMany({
      where: { techId: { in: ownedTechnicianIds } },
    }).catch(() => {});
    await testApp.prisma.clientUser.deleteMany({
      where: { id: { in: ownedClientIds } },
    }).catch(() => {});
    await testApp.prisma.technician.deleteMany({
      where: { id: { in: ownedTechnicianIds } },
    }).catch(() => {});
  }

  function uniquePhone() {
    const digits = `${Date.now()}${Math.floor(Math.random() * 100000)}`.slice(-9).padStart(9, '0');
    return `18${digits}`;
  }

  function uniqueInviteCode(label: string) {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 100000)}`.slice(-8).toUpperCase();
    return `${label.replace(/[^a-z0-9]/gi, '').slice(0, 8)}${suffix}`.toUpperCase();
  }

  function uniqueOrderNo() {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 10000).toString(36).toUpperCase().padStart(4, '0');
    return `CO${ts}${rand}`;
  }
});