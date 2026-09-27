import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import request from 'supertest';
import { AuthService } from '../../src/auth/auth.service';
import { ProductionSeedService } from '../../src/production-seed.service';
import { ContractTestApp, createContractTestApp, prepareContractSqliteDatabase } from './test-app';

describe('Administrator accounts', () => {
  let ctx: ContractTestApp;
  let directory: string;
  let token: string;
  let roleId: number;
  let childId: number;
  let childToken: string;
  let refreshToken: string;
  const account = { username: 'operator', password: 'operator1234', realName: '运营' };
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    directory = mkdtempSync(resolve(tmpdir(), 'admin-users-'));
    const databaseUrl = `file:${resolve(directory, 'test.db')}`;
    prepareContractSqliteDatabase(databaseUrl);
    ctx = await createContractTestApp({ databaseUrl, uploadsPath: resolve(directory, 'uploads') });
  });
  afterAll(async () => { await ctx?.cleanup(); rmSync(directory, { recursive: true, force: true }); });

  it('initializes the default super admin and permits login', async () => {
    const response = await http().post('/api/admin/auth/login').send({ username: 'admin', password: 'admin1234' }).expect(201);
    token = response.body.accessToken;
    expect(response.body.user.roleCode).toBe('super_admin');
  });

  it('creates a role and child account without returning credentials', async () => {
    const role = await http().post('/api/admin/roles').set('Authorization', `Bearer ${token}`).send({ name: '运营', code: 'operator' }).expect(201);
    roleId = role.body.id;
    const result = await http().post('/api/admin/users').set('Authorization', `Bearer ${token}`).send({ ...account, roleId }).expect(201);
    childId = result.body.id;
    expect(result.body.passwordHash).toBeUndefined();
    await http().post('/api/admin/users').set('Authorization', `Bearer ${token}`).send({ ...account, roleId }).expect(409);
    await http().post('/api/admin/users').set('Authorization', `Bearer ${token}`).send({ ...account, username: 'bad', password: '123', roleId }).expect(400);
    const login = await ctx.app.get(AuthService).login(account.username, account.password);
    childToken = login.accessToken;
    refreshToken = login.refreshToken;
  });

  it('enforces feature permissions immediately and blocks privilege escalation', async () => {
    await http().get('/api/admin/technicians').set('Authorization', `Bearer ${childToken}`).expect(403);
    const permissions = await ctx.prisma.adminPermission.findMany({ where: { code: { in: ['technician:view', 'role:create', 'role:update', 'role:view'] } } });
    await http().patch(`/api/admin/roles/${roleId}`).set('Authorization', `Bearer ${token}`).send({ permissionIds: permissions.map(p => p.id) }).expect(200);
    await http().get('/api/admin/technicians').set('Authorization', `Bearer ${childToken}`).expect(200);
    await http().post('/api/admin/roles').set('Authorization', `Bearer ${childToken}`).send({ name: '提权', code: 'escalate' }).expect(403);
    await http().get('/api/admin/users').set('Authorization', `Bearer ${childToken}`).expect(403);
    await http().patch(`/api/admin/roles/${roleId}`).set('Authorization', `Bearer ${token}`).send({ permissionIds: [] }).expect(200);
    await http().get('/api/admin/technicians').set('Authorization', `Bearer ${childToken}`).expect(403);
  });

  it('revokes access and refresh tokens on password reset and disable', async () => {
    await http().patch(`/api/admin/users/${childId}`).set('Authorization', `Bearer ${token}`).send({ password: 'updated1234' }).expect(200);
    await http().get('/api/admin/auth/me').set('Authorization', `Bearer ${childToken}`).expect(401);
    await expect(ctx.app.get(AuthService).refreshAccessToken(refreshToken)).rejects.toThrow();
    await expect(ctx.app.get(AuthService).login(account.username, account.password)).rejects.toThrow();
    const login = await ctx.app.get(AuthService).login(account.username, 'updated1234');
    await http().patch(`/api/admin/users/${childId}`).set('Authorization', `Bearer ${token}`).send({ status: 'inactive' }).expect(200);
    await http().get('/api/admin/auth/me').set('Authorization', `Bearer ${login.accessToken}`).expect(401);
    await expect(ctx.app.get(AuthService).login(account.username, 'updated1234')).rejects.toThrow();
  });

  it('protects super admin and never overwrites its password on startup', async () => {
    const admin = await ctx.prisma.adminUser.findUniqueOrThrow({ where: { username: 'admin' } });
    await http().patch(`/api/admin/users/${admin.id}`).set('Authorization', `Bearer ${token}`).send({ status: 'inactive' }).expect(400);
    await http().patch(`/api/admin/roles/${admin.roleId}`).set('Authorization', `Bearer ${token}`).send({ permissionIds: [] }).expect(400);
    await http().post('/api/admin/users').set('Authorization', `Bearer ${token}`).send({ ...account, username: 'extra_admin', roleId: admin.roleId }).expect(400);
    await http().patch(`/api/admin/users/${admin.id}`).set('Authorization', `Bearer ${token}`).send({ password: 'changed1234' }).expect(200);
    await ctx.app.get(ProductionSeedService).onModuleInit();
    await expect(ctx.app.get(AuthService).login('admin', 'changed1234')).resolves.toBeDefined();
    const logs = await ctx.prisma.operationLog.findMany({ where: { module: 'admin-user' } });
    expect(JSON.stringify(logs)).not.toContain('changed1234');
    expect(JSON.stringify(logs)).not.toContain('passwordHash');
  });
});
