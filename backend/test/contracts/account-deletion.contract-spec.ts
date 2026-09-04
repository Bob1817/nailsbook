import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AccountDeletionService } from '../../src/account-deletion/account-deletion.service';
import { ChatGateway } from '../../src/chat/chat.gateway';
import { assertBookingAccountState } from '../../src/orders/booking-account-state';
import { ContractTestApp, createContractTestApp, prepareContractSqliteDatabase } from './test-app';

describe('Account deletion lifecycle HTTP contract', () => {
  let app: ContractTestApp;
  let dir: string;
  let adminId: number;
  let adminToken: string;
  let sequence = 0;
  beforeAll(async () => {
    dir = mkdtempSync(resolve(tmpdir(), 'nailbook-deletion-'));
    const databaseUrl = `file:${resolve(dir, 'test.db')}`;
    prepareContractSqliteDatabase(databaseUrl);
    app = await createContractTestApp({ databaseUrl, uploadsPath: resolve(dir, 'uploads') });
    const role = await app.prisma.adminRole.create({ data: { code: 'deletion-test', name: '注销审核测试' } });
    for (const code of ['account-deletion:view', 'account-deletion:manage', 'technician:delete', 'technician:update', 'technician:disable']) {
      const permission = await app.prisma.adminPermission.upsert({ where: { code }, create: { code, name: code, module: 'account-deletion', action: code.split(':')[1] }, update: {} });
      await app.prisma.adminRolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
    }
    const admin = await app.prisma.adminUser.create({ data: { username: 'deletion-reviewer', passwordHash: 'unused', roleId: role.id } });
    adminId = admin.id;
    adminToken = jwt.sign({ sub: adminId, tv: 0 }, process.env.ADMIN_JWT_SECRET!);
  });
  afterAll(async () => { await app?.cleanup(); if (dir) rmSync(dir, { recursive: true, force: true }); });
  const api = () => request(app.app.getHttpServer());
  async function fixture() {
    const n = ++sequence;
    const client = await app.prisma.clientUser.create({ data: { phone: '1390000' + String(n).padStart(4, '0'), nickname: '客户', passwordHash: 'hash', avatarUrl: '/old.png' } });
    const technician = await app.prisma.technician.create({ data: { phone: '1380000' + String(n).padStart(4, '0'), name: '美甲师', status: 'active', passwordHash: 'hash', invitationCode: 'deletion-' + n } });
    const customer = await app.prisma.customer.create({ data: { technicianId: technician.id, clientUserId: client.id, name: '客户', phone: client.phone, address: '测试地址' } });
    const identity = await app.prisma.wechatIdentity.create({ data: { appId: 'test', openId: 'deletion-' + n, clientUserId: client.id, technicianId: technician.id } });
    await app.prisma.clientTechBinding.create({ data: { clientId: client.id, techId: technician.id, status: 'active', isDefault: true, bindSource: 'test' } });
    return { client, technician, customer, identity, token: app.signClientToken(client.id, client.phone), techToken: app.signTechnicianToken(technician.id, technician.phone) };
  }
  async function submit(token: string, type = 'client') {
    return api().post(`/api/${type}/account-deletion`).set('Authorization', 'Bearer ' + token).send({ reason: '不再使用', confirmed: true }).expect(201);
  }
  async function review(id: number, action = 'complete', identityVerified = true) {
    return api().post(`/api/admin/account-deletions/${id}/review`).set('Authorization', 'Bearer ' + adminToken).send({ action, identityVerified, note: '已联系本人确认' });
  }
  it('requires confirmation, isolates identities and keeps withdrawal/reapplication history', async () => {
    const f = await fixture();
    await api().post('/api/client/account-deletion').set('Authorization', 'Bearer ' + f.token).send({ reason: '注销' }).expect(400);
    await api().get('/api/technician/account-deletion').set('Authorization', 'Bearer ' + f.token).expect(401);
    const first = await submit(f.token);
    const duplicate = await submit(f.token);
    expect(duplicate.body.id).toBe(first.body.id);
    await api().post('/api/client/account-deletion/cancel').set('Authorization', 'Bearer ' + f.token).expect(201);
    await review(first.body.id).then(r => expect(r.status).toBe(409));
    const again = await submit(f.token);
    expect(JSON.parse(again.body.events).map(e => e.action)).toEqual(['submitted', 'cancelled', 'submitted']);
    await review(first.body.id, 'reject').then(r => expect(r.status).toBe(201));
    const resubmitted = await submit(f.token);
    expect(JSON.parse(resubmitted.body.events)).toHaveLength(5);
  });
  it('rechecks orders, payments and funds at final review and requires identity verification', async () => {
    const f = await fixture();
    const row = await submit(f.token);
    await review(row.body.id, 'complete', false).then(r => expect(r.status).toBe(400));
    const order = await app.prisma.order.create({ data: { orderNo: 'deletion-block', technicianId: f.technician.id, customerId: f.customer.id, clientUserId: f.client.id, startTime: new Date(), endTime: new Date(), status: 'in_progress' } });
    await review(row.body.id).then(r => expect(r.status).toBe(409));
    await app.prisma.order.update({ where: { id: order.id }, data: { status: 'completed' } });
    const payment = await app.prisma.paymentOrder.create({ data: { paymentNo: 'deletion-payment', idempotencyKey: 'deletion-payment', clientUserId: f.client.id, technicianId: f.technician.id, paymentType: 'deposit', amountCents: 100, status: 'refund_pending' } });
    await review(row.body.id).then(r => expect(r.status).toBe(409));
    await app.prisma.paymentOrder.update({ where: { id: payment.id }, data: { status: 'refunded' } });
    const fund = await app.prisma.rewardAccount.create({ data: { clientUserId: f.client.id, technicianId: f.technician.id, ledger: { create: { amount: 20, status: 'available', entryType: 'grant', sourceType: 'test', sourceId: 'deletion' } } } });
    await review(row.body.id).then(r => expect(r.status).toBe(409));
    await app.prisma.rewardLedger.create({ data: { accountId: fund.id, amount: -20, status: 'used', entryType: 'use', sourceType: 'test', sourceId: 'deletion-use' } });
    await review(row.body.id).then(r => expect(r.status).toBe(201));
    expect(await app.prisma.order.findUnique({ where: { id: order.id } })).not.toBeNull();
  });
  it('anonymizes client data, invalidates HTTP/WS access and preserves the other WeChat identity', async () => {
    const f = await fixture();
    const row = await submit(f.token);
    await review(row.body.id).then(r => expect(r.status).toBe(201));
    expect(await app.prisma.clientUser.findUnique({ where: { id: f.client.id } })).toMatchObject({ status: 'deleted', nickname: '已注销用户', passwordHash: '', avatarUrl: null, tokenVersion: 1 });
    expect(await app.prisma.customer.findUnique({ where: { id: f.customer.id } })).toMatchObject({ name: '已注销用户', phone: null, address: null });
    expect(await app.prisma.wechatIdentity.findUnique({ where: { id: f.identity.id } })).toMatchObject({ clientUserId: null, technicianId: f.technician.id });
    await api().get('/api/client/account-deletion').set('Authorization', 'Bearer ' + f.token).expect(401);
    await api().get('/api/technician/account-deletion').set('Authorization', 'Bearer ' + f.techToken).expect(200);
    const socket: any = { userId: f.client.id, userType: 'client', tokenVersion: 0, disconnect: jest.fn() };
    await expect(app.app.get(ChatGateway).handleMessageRead(socket, { conversationId: 1 })).rejects.toThrow();
    expect(socket.disconnect).toHaveBeenCalled();
    const handshake: any = { handshake: { auth: { token: f.token } }, emit: jest.fn(), disconnect: jest.fn() };
    await app.app.get(ChatGateway).handleConnection(handshake);
    expect(handshake.disconnect).toHaveBeenCalled();
    await expect(app.prisma.$transaction(tx => assertBookingAccountState(tx, f.technician.id, f.client.id))).rejects.toThrow('客户账号不可预约');
  });
  it('rejects historically deleted accounts even when the token version still matches', async () => {
    const f = await fixture();
    await app.prisma.clientUser.update({ where: { id: f.client.id }, data: { status: 'deleted' } });
    await app.prisma.technician.update({ where: { id: f.technician.id }, data: { status: 'deleted' } });
    await api().get('/api/client/account-deletion').set('Authorization', 'Bearer ' + f.token).expect(401);
    await api().get('/api/technician/account-deletion').set('Authorization', 'Bearer ' + f.techToken).expect(401);
    for (const [role, id, secret] of [['client', f.client.id, process.env.CLIENT_JWT_SECRET], ['technician', f.technician.id, process.env.TECHNICIAN_JWT_SECRET]] as const) {
      const refreshToken = jwt.sign({ sub: id, tokenType: 'refresh', tv: 0 }, secret!);
      await api().post(`/api/${role}/auth/refresh`).send({ refreshToken }).expect(401);
    }
  });
  it('rolls back all changes if transactional auditing fails', async () => {
    const f = await fixture();
    const row = await submit(f.token);
    await expect(app.app.get(AccountDeletionService).review(row.body.id, -1, 'complete', '测试审计失败', true)).rejects.toThrow();
    expect(await app.prisma.clientUser.findUnique({ where: { id: f.client.id } })).toMatchObject({ status: 'active', tokenVersion: 0 });
    expect(await app.prisma.accountDeletionRequest.findUnique({ where: { id: row.body.id } })).toMatchObject({ status: 'pending' });
    expect(await app.prisma.wechatIdentity.findUnique({ where: { id: f.identity.id } })).toMatchObject({ clientUserId: f.client.id });
  });
  it('deletes the technician identity, hides works, retains client and denies legacy deletion/status bypasses', async () => {
    const f = await fixture();
    const work = await app.prisma.nailWork.create({ data: { techId: f.technician.id, title: '测试作品' } });
    await api().delete(`/api/admin/technicians/${f.technician.id}`).set('Authorization', 'Bearer ' + adminToken).expect(400);
    await api().patch(`/api/admin/technicians/${f.technician.id}`).set('Authorization', 'Bearer ' + adminToken).send({ status: 'deleted' }).expect(400);
    const row = await submit(f.techToken, 'technician');
    await review(row.body.id).then(r => expect(r.status).toBe(201));
    await api().patch(`/api/admin/technicians/${f.technician.id}/status`).set('Authorization', 'Bearer ' + adminToken).send({ status: 'active' }).expect(400);
    await api().patch(`/api/admin/technicians/${f.technician.id}`).set('Authorization', 'Bearer ' + adminToken).send({ status: 'active' }).expect(400);
    expect(await app.prisma.nailWork.findUnique({ where: { id: work.id } })).toMatchObject({ isVisible: false });
    expect(await app.prisma.wechatIdentity.findUnique({ where: { id: f.identity.id } })).toMatchObject({ clientUserId: f.client.id, technicianId: null });
    await api().get('/api/technician/account-deletion').set('Authorization', 'Bearer ' + f.techToken).expect(401);
    await api().get('/api/client/account-deletion').set('Authorization', 'Bearer ' + f.token).expect(200);
    expect(await app.prisma.operationLog.count({ where: { module: 'account-deletion', action: 'complete', targetId: f.technician.id, targetType: 'technician' } })).toBe(1);
    await expect(app.prisma.$transaction(tx => assertBookingAccountState(tx, f.technician.id, f.client.id))).rejects.toThrow('美甲师账号不可预约');
  });
});
