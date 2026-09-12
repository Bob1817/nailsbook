import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import request from 'supertest';
import { OrdersScheduler } from '../../src/orders/orders.scheduler';
import { configureLaunchTechnicianId, launchTechnicianId } from '../../src/common/miniprogram-launch-mode';
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

  it('validates quick booking invitations and preserves existing binding decisions over HTTP', async () => {
    const client = await createClient('quick-share');
    const technician = await createTechnician('quick-share');
    const token = testApp.signClientToken(client.id, client.phone);
    const techToken = testApp.signTechnicianToken(technician.id, technician.phone);
    const previous = process.env.QUICK_BOOKING_TECHNICIAN_IDS;
    process.env.QUICK_BOOKING_TECHNICIAN_IDS = String(technician.id);
    const payload = { techId: technician.id, inviteCode: technician.inviteCode, confirmed: true };
    const send = (body: any, bearer = token) => request(testApp.app.getHttpServer())
      .post('/api/client/auth/bind-quick-booking').set('Authorization', `Bearer ${bearer}`).send(body);
    try {
      await send(payload, techToken).expect(401);
      await send({ ...payload, confirmed: false }).expect(400);
      await send({ ...payload, inviteCode: 'INVALID' }).expect(404);
      await send(payload).expect(201);
      await send(payload).expect(201);
      expect(await testApp.prisma.clientTechBinding.count({ where: { clientId: client.id, techId: technician.id, status: 'active' } })).toBe(1);
      expect(await testApp.prisma.customer.count({ where: { clientUserId: client.id, technicianId: technician.id } })).toBe(1);
      await testApp.prisma.clientTechBinding.updateMany({ where: { clientId: client.id, techId: technician.id }, data: { status: 'inactive' } });
      await send(payload).expect(409);
      delete process.env.QUICK_BOOKING_TECHNICIAN_IDS;
      await send(payload).expect(400);
    } finally {
      if (previous === undefined) delete process.env.QUICK_BOOKING_TECHNICIAN_IDS;
      else process.env.QUICK_BOOKING_TECHNICIAN_IDS = previous;
    }
  });

  it('supports time-only requests, manual quotes and atomic date-level intake without changing legacy bookings', async () => {
    const { accessToken, technician } = await setupClientAndBinding('quick');
    const techToken = testApp.signTechnicianToken(technician.id, technician.phone);
    const previous = process.env.QUICK_BOOKING_TECHNICIAN_IDS;
    process.env.QUICK_BOOKING_TECHNICIAN_IDS = String(technician.id);
    const server = testApp.app.getHttpServer();
    const date = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
    const otherDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const payload = { techId: technician.id, serviceDate: date, startTime: '14:00', serviceType: '到店美甲', shopAddress: { name: 'Contract Studio' }, quickBooking: true };
    const create = (body: any) => request(server).post('/api/client/orders').set('Authorization', `Bearer ${accessToken}`).send(body);
    const quote = (id: number, body: any) => request(server).patch(`/api/technician/orders/${id}/review`).set('Authorization', `Bearer ${techToken}`).send(body);
    const day = (body: any) => request(server).patch(`/api/technician/booking-days/${date}`).set('Authorization', `Bearer ${techToken}`).send(body);
    let referenceWorkId: number | undefined;
    try {
      const referenceWork = await testApp.prisma.nailWork.create({ data: { techId: technician.id, title: '参考作品', publicationStatus: 'approved' } });
      referenceWorkId = referenceWork.id;
      await create({ ...payload, sourceWorkId: referenceWork.id }).expect(400);
      const reference = await create({ ...payload, sourceWorkId: referenceWork.id, referenceOnly: true }).expect(201);
      expect(reference.body).toMatchObject({ status: 'pending_quote', quotePrice: null, totalDurationMinutes: 0 });
      await testApp.prisma.nailWork.update({ where: { id: referenceWork.id }, data: { publicationStatus: 'pending' } });
      await create({ ...payload, sourceWorkId: referenceWork.id, referenceOnly: true }).expect(404);
      const created = await create({ ...payload, applicationKey: `quick-${technician.id}` }).expect(201);
      const id = created.body.id;
      expect(created.body).toMatchObject({ status: 'pending_quote', quickBooking: true, totalDurationMinutes: 0, endTime: null, quotePrice: null });
      expect(await testApp.prisma.blockedTimeSlot.count({ where: { orderId: id } })).toBe(0);
      // A start point near closing is allowed when duration is unknown.
      await create({ ...payload, startTime: '20:30' }).expect(201);
      const pending = await create({ ...payload, startTime: '17:00' }).expect(201);
      const terms = { quoteMode: 'manual', amountFen: 30000, durationMinutes: 90, serviceDate: date, startTime: '14:00' };
      await quote(id, terms).expect(200);
      await quote(id, { ...terms, amountFen: -1, continueAccepting: false, dayVersion: 0 }).expect(400);
      await quote(id, { ...terms, quoteVersion: 1, continueAccepting: true, dayVersion: 0 }).expect(200);
      const detail = await request(server).get(`/api/client/orders/${id}`).set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(detail.body).toMatchObject({ status: 'pending_agree', quotePrice: 300, finalPriceFen: 30000, totalDurationMinutes: 90 });
      expect(new Date(detail.body.endTime).getTime() - new Date(detail.body.startTime).getTime()).toBe(90 * 60000);
      expect(await testApp.prisma.blockedTimeSlot.count({ where: { orderId: id } })).toBe(0);
      await request(server).post(`/api/client/orders/${id}/agree`).set('Authorization', `Bearer ${accessToken}`).send({ quoteVersion: 2 }).expect(201);
      await create({ ...payload, startTime: '15:00' }).expect(400);
      await create({ ...payload, startTime: '15:30' }).expect(201);
      const conflict = await create({ ...payload, startTime: '13:30' }).expect(201);
      await quote(conflict.body.id, { ...terms, startTime: '13:30', continueAccepting: false, dayVersion: 1 }).expect(400);
      let settings = await request(server).get(`/api/public/booking-settings/${technician.id}`).expect(200);
      expect(settings.body.days[0]).toMatchObject({ accepting: true, version: 1 });
      await quote(pending.body.id, { ...terms, startTime: '17:00', continueAccepting: false, dayVersion: 0 }).expect(409);
      expect(await testApp.prisma.blockedTimeSlot.count({ where: { orderId: pending.body.id } })).toBe(0);
      await quote(pending.body.id, { ...terms, startTime: '17:00', continueAccepting: false, dayVersion: 1 }).expect(200);
      await create({ ...payload, startTime: '10:00' }).expect(409);
      await request(server).post('/api/client/custom-service-requests').set('Authorization', `Bearer ${accessToken}`).send({ techId: technician.id, serviceDate: date, startTime: '10:00', title: '参考款式' }).expect(409);
      // Old clients and other creation modes also obey the new date policy.
      await create({ ...payload, quickBooking: false, selectedServiceIds: ['contract-basic'], startTime: '10:00' }).expect(409);
      await create({ ...payload, serviceDate: otherDate }).expect(201);
      const retried = await create({ ...payload, applicationKey: `quick-${technician.id}` }).expect(201);
      expect(retried.body.id).toBe(id);
      await day({ accepting: true, version: 0 }).expect(409);
      await request(server).patch(`/api/technician/booking-days/${date}`).set('Authorization', `Bearer ${accessToken}`).send({ accepting: true, version: 2 }).expect(401);
      // Accepted requests can finish confirmation even though intake is now closed.
      await request(server).post(`/api/client/orders/${id}/agree`).set('Authorization', `Bearer ${accessToken}`).send({ quoteVersion: 2 }).expect(201);
      expect((await testApp.prisma.order.findUnique({ where: { id } }))?.status).toBe('pending_shop');
      // Rejecting the other quote releases only its service slot, not the day policy.
      await request(server).post(`/api/client/orders/${pending.body.id}/reject-quote`).set('Authorization', `Bearer ${accessToken}`).send({ reason: '调整款式', quoteVersion: 1 }).expect(201);
      expect(await testApp.prisma.blockedTimeSlot.count({ where: { orderId: pending.body.id } })).toBe(0);
      settings = await request(server).get(`/api/public/booking-settings/${technician.id}`).expect(200);
      expect(settings.body.days[0]).toMatchObject({ accepting: false, version: 2 });
      await day({ accepting: true, version: 2 }).expect(200);
      await create({ ...payload, startTime: '10:00' }).expect(201);
      await day({ accepting: false, version: 3 }).expect(200);
      // Existing pre-closure request can be quoted without reopening the day.
      await quote(pending.body.id, { ...terms, quoteVersion: 1, startTime: '17:00', continueAccepting: false, dayVersion: 4 }).expect(200);
      const duplicate = await Promise.all([quote(pending.body.id, { ...terms, quoteVersion: 2, startTime: '17:00', continueAccepting: true, dayVersion: 5 }), quote(pending.body.id, { ...terms, quoteVersion: 2, startTime: '17:00', continueAccepting: true, dayVersion: 5 })]);
      expect(duplicate.map(r => r.status).sort()).toEqual([200, 400]);
      expect(await testApp.prisma.blockedTimeSlot.count({ where: { orderId: pending.body.id } })).toBe(0);
      const competing = await Promise.all([create({ ...payload, serviceDate: otherDate, startTime: '11:00' }), create({ ...payload, serviceDate: otherDate, startTime: '11:00' })]);
      expect(competing.map(r => r.status)).toEqual([201, 201]);
      const competingQuotes = await Promise.all(competing.map(r => quote(r.body.id, { ...terms, serviceDate: otherDate, startTime: '11:00', continueAccepting: true, dayVersion: 0 })));
      expect(competingQuotes.map(r => r.status).sort()).toEqual([200, 409]);
      expect(await testApp.prisma.blockedTimeSlot.count({ where: { orderId: { in: competing.map(r => r.body.id) } } })).toBe(0);
      const booking = await testApp.prisma.order.findUniqueOrThrow({ where: { id } });
      await (testApp.app.get(OrdersScheduler) as any).autoTransitionToInProgress(booking.startTime);
      await request(server).patch(`/api/technician/orders/${id}/complete`).set('Authorization', `Bearer ${techToken}`)
        .send({ actualStartTime: booking.startTime.toISOString(), actualEndTime: booking.endTime.toISOString(), actualAmount: 300 }).expect(200);
      expect(await testApp.prisma.serviceRecord.count({ where: { orderId: id } })).toBe(1);
      expect(await testApp.prisma.revenue.findUnique({ where: { orderId: id } })).toMatchObject({ amount: 300 });
      delete process.env.QUICK_BOOKING_TECHNICIAN_IDS;
      await create({ ...payload, serviceDate: otherDate }).expect(400);
    } finally {
      if (referenceWorkId) await testApp.prisma.nailWork.delete({ where: { id: referenceWorkId } });
      if (previous === undefined) delete process.env.QUICK_BOOKING_TECHNICIAN_IDS;
      else process.env.QUICK_BOOKING_TECHNICIAN_IDS = previous;
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
    it('runs one launch-mode booking through both roles, completion and income without duplicate accounting', async () => {
      const { accessToken, technician } = await setupClientAndBinding('launch-full-flow');
      const techToken = testApp.signTechnicianToken(technician.id, technician.phone);
      const previousMode = process.env.MINIPROGRAM_LAUNCH_MODE;
      const previousTechId = launchTechnicianId();
      process.env.MINIPROGRAM_LAUNCH_MODE = 'true';
      configureLaunchTechnicianId(technician.id);
      try {
        const payload = {
          techId: technician.id,
          applicationKey: `flow-${technician.id}-${Date.now()}`,
          serviceDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
          startTime: '14:00', serviceType: '到店美甲',
          shopAddress: { name: 'Contract Studio' }, selectedServiceIds: ['contract-basic'],
        };
        const server = testApp.app.getHttpServer();
        const created = await request(server).post('/api/client/orders')
          .set('Authorization', `Bearer ${accessToken}`).send(payload).expect(201);
        const id = created.body.id;
        ownedOrderNos.push(created.body.orderNo);
        expect(created.body).toMatchObject({ status: 'pending_confirm', quotePrice: 128 });
        const retry = await request(server).post('/api/client/orders')
          .set('Authorization', `Bearer ${accessToken}`).send(payload).expect(201);
        expect(retry.body.id).toBe(id);
        expect(await testApp.prisma.blockedTimeSlot.count({ where: { orderId: id } })).toBe(0);

        const expectBothStatus = async (status: string) => {
          for (const [role, token] of [['client', accessToken], ['technician', techToken]]) {
            const detail = await request(server).get(`/api/${role}/orders/${id}`)
              .set('Authorization', `Bearer ${token}`).expect(200);
            expect(detail.body).toMatchObject({ id, status, quotePrice: 128 });
          }
        };
        await expectBothStatus('pending_confirm');
        await request(server).patch(`/api/technician/orders/${id}/complete`)
          .set('Authorization', `Bearer ${techToken}`).expect(400);
        await request(server).patch(`/api/technician/orders/${id}/confirm`)
          .set('Authorization', `Bearer ${techToken}`).expect(200);
        await expectBothStatus('pending_shop');
        expect(await testApp.prisma.blockedTimeSlot.count({ where: { orderId: id } })).toBe(1);
        expect(await testApp.prisma.bookingTradeOrder.count({ where: { bookingId: id } })).toBe(1);

        // Inject the scheduled time, not a database state mutation or real payment.
        const booking = await testApp.prisma.order.findUniqueOrThrow({ where: { id } });
        await (testApp.app.get(OrdersScheduler) as any).autoTransitionToInProgress(booking.startTime);
        await expectBothStatus('in_progress');
        await request(server).patch(`/api/technician/orders/${id}/complete`)
          .set('Authorization', `Bearer ${techToken}`)
          .send({ actualStartTime: booking.startTime.toISOString(), actualEndTime: booking.endTime.toISOString(), actualAmount: 128 })
          .expect(200);
        await expectBothStatus('completed');
        await request(server).patch(`/api/technician/orders/${id}/complete`)
          .set('Authorization', `Bearer ${techToken}`).expect(400);
        expect(await testApp.prisma.serviceRecord.count({ where: { orderId: id } })).toBe(1);
        const revenues = await testApp.prisma.revenue.findMany({ where: { orderId: id } });
        expect(revenues).toHaveLength(1);
        expect(revenues[0]).toMatchObject({ amount: 128 });
        const calendar = await request(server).get('/api/technician/orders/income-calendar')
          .set('Authorization', `Bearer ${techToken}`).expect(200);
        expect(calendar.body.orders).toHaveLength(1);
        expect(calendar.body.orders[0]).toMatchObject({ status: 'completed', quotePrice: 128 });
        expect(await testApp.prisma.message.count({ where: { relatedType: 'order', relatedId: id } })).toBeGreaterThan(0);

        const cancellation = await request(server).post('/api/client/orders')
          .set('Authorization', `Bearer ${accessToken}`).send({
            ...payload, applicationKey: payload.applicationKey + '-cancel',
            serviceDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
          }).expect(201);
        const cancelId = cancellation.body.id;
        ownedOrderNos.push(cancellation.body.orderNo);
        await request(server).patch(`/api/technician/orders/${cancelId}/confirm`)
          .set('Authorization', `Bearer ${techToken}`).expect(200);
        expect(await testApp.prisma.blockedTimeSlot.count({ where: { orderId: cancelId } })).toBe(1);
        await request(server).patch(`/api/client/orders/${cancelId}/status`)
          .set('Authorization', `Bearer ${accessToken}`).send({ status: 'cancelled' }).expect(200);
        for (const [role, token] of [['client', accessToken], ['technician', techToken]]) {
          const detail = await request(server).get(`/api/${role}/orders/${cancelId}`)
            .set('Authorization', `Bearer ${token}`).expect(200);
          expect(detail.body.status).toBe('cancelled');
        }
        expect(await testApp.prisma.blockedTimeSlot.count({ where: { orderId: cancelId } })).toBe(0);
        expect(await testApp.prisma.revenue.count({ where: { orderId: cancelId } })).toBe(0);
        expect(await testApp.prisma.bookingTradeOrder.findUnique({ where: { bookingId: cancelId } }))
          .toMatchObject({ status: 'cancelled' });
      } finally {
        if (previousMode === undefined) delete process.env.MINIPROGRAM_LAUNCH_MODE;
        else process.env.MINIPROGRAM_LAUNCH_MODE = previousMode;
        configureLaunchTechnicianId(previousTechId);
      }
    });

    it('creates an order, lists it, and returns detail with quote fields', async () => {
      const {
        accessToken,
        client: _client,
        technician,
      } = await setupClientAndBinding('order-create');
      const _address = await createAddress(accessToken, 'Order Addr');

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
        status: 'pending_confirm',
        serviceType: '到店美甲',
        remark: 'Contract test order',
        quotePrice: 128,
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
        status: 'pending_confirm',
        serviceType: '到店美甲',
      });
    });

    it('rejects booking before technician service items are initialized', async () => {
      const { accessToken, technician } = await setupClientAndBinding(
        'order-default-service',
        { serviceItems: null },
      );

      const createRes = await request(testApp.app.getHttpServer())
        .post('/api/client/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          techId: technician.id,
          serviceDate: '2026-06-16',
          startTime: '14:00',
          serviceType: '到店美甲',
          shopAddress: { name: 'Contract Studio' },
          selectedServiceIds: ['svc_basic_care_1'],
        })
        .expect(400);

      expect(createRes.body.message).toContain('服务项目');
    });

    it('updates an order with new address, date, and time', async () => {
      const { accessToken, technician } =
        await setupClientAndBinding('order-update');
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
      const { accessToken, technician } =
        await setupClientAndBinding('order-quote');
      const _address = await createAddress(accessToken, 'Quote Addr');

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
      const { accessToken, technician } =
        await setupClientAndBinding('order-cancel');
      const _address = await createAddress(accessToken, 'Cancel Addr');

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
      const { accessToken, technician } =
        await setupClientAndBinding('order-trips');
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
      const { accessToken, technician } =
        await setupClientAndBinding('design-crud');

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
      const { accessToken, client, technician } =
        await setupClientAndBinding('design-switch');
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
      const { accessToken, technician } =
        await setupClientAndBinding('csr-crud');

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
      const { accessToken, technician } =
        await setupClientAndBinding('csr-actions');

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

  async function setupClientAndBinding(
    label: string,
    technicianOverrides: Parameters<typeof createTechnician>[1] = {},
  ) {
    const client = await createClient(label);
    const technician = await createTechnician(label, technicianOverrides);
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
      serviceItems?: string | null;
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
        serviceItems:
          overrides.serviceItems === undefined
            ? JSON.stringify([
                {
                  id: 'contract-basic',
                  name: 'Basic Care',
                  category: 'basic_care',
                  price: 128,
                  durationMinutes: 60,
                  isActive: true,
                  sortOrder: 1,
                },
              ])
            : overrides.serviceItems,
        serviceSchedule: JSON.stringify({
          activeSchemeId: 'contract',
          schemes: [
            {
              id: 'contract',
              days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
              startTime: '08:00',
              endTime: '22:00',
            },
          ],
          restDays: [],
        }),
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

  async function createBinding(
    clientId: number,
    techId: number,
    inviteCode: string,
  ) {
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

  async function seedQuoteOnOrder(
    orderId: number,
    price: number,
    remark: string,
  ) {
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

  async function seedQuoteOnCustomServiceRequest(
    requestId: number,
    price: number,
    remark: string,
  ) {
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

    const _allIds = [...ownedClientIds, ...ownedTechnicianIds];
    const allCodes = [...ownedInviteCodes];

    await testApp.prisma.actionTask.deleteMany({ where: { technicianId: { in: ownedTechnicianIds } } });
    await testApp.prisma.contentPublicationTask.deleteMany({ where: { technicianId: { in: ownedTechnicianIds } } });
    await testApp.prisma.serviceRecord.deleteMany({ where: { technicianId: { in: ownedTechnicianIds } } });
    await testApp.prisma.bookingTradeOrder.deleteMany({ where: { technicianId: { in: ownedTechnicianIds } } });

    await testApp.prisma.revenue
      .deleteMany({
        where: {
          OR: [
            { order: { orderNo: { in: ownedOrderNos } } },
            { technicianId: { in: ownedTechnicianIds } },
          ],
        },
      })
      .catch(() => {});

    await testApp.prisma.blockedTimeSlot
      .deleteMany({
        where: { techId: { in: ownedTechnicianIds } },
      })
      .catch(() => {});

    await testApp.prisma.order
      .deleteMany({
        where: {
          OR: [
            { orderNo: { in: ownedOrderNos } },
            { clientUserId: { in: ownedClientIds } },
            { technicianId: { in: ownedTechnicianIds } },
          ],
        },
      })
      .catch(() => {});

    await testApp.prisma.customServiceRequest
      .deleteMany({
        where: {
          OR: [
            { requestNo: { in: ownedRequestNos } },
            { clientId: { in: ownedClientIds } },
            { techId: { in: ownedTechnicianIds } },
          ],
        },
      })
      .catch(() => {});

    await testApp.prisma.clientDesignRequest
      .deleteMany({
        where: {
          OR: [
            { clientId: { in: ownedClientIds } },
            { techId: { in: ownedTechnicianIds } },
          ],
        },
      })
      .catch(() => {});

    await testApp.prisma.clientAddress
      .deleteMany({
        where: { clientId: { in: ownedClientIds } },
      })
      .catch(() => {});

    await testApp.prisma.message
      .deleteMany({
        where: {
          conversation: {
            OR: [
              { clientId: { in: ownedClientIds } },
              { techId: { in: ownedTechnicianIds } },
            ],
          },
        },
      })
      .catch(() => {});

    await testApp.prisma.conversation
      .deleteMany({
        where: {
          OR: [
            { clientId: { in: ownedClientIds } },
            { techId: { in: ownedTechnicianIds } },
          ],
        },
      })
      .catch(() => {});

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
    await testApp.prisma.technicianSubscription.deleteMany({
      where: { technicianId: { in: ownedTechnicianIds } },
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
