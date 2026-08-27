import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, INTERCEPTORS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { OperationLogInterceptor } from '../../src/auth/operation-log.interceptor';
import { ContractTestApp, createContractTestApp, prepareContractSqliteDatabase } from './test-app';

describe('Admin authorization HTTP contract', () => {
  let testApp: ContractTestApp;
  let tempDir: string;
  let adminId: number;
  let roleId: number;
  let token: string;
  const routes: Array<{ method: string; path: string; permissions: string[] }> = [];

  beforeAll(async () => {
    tempDir = mkdtempSync(resolve(tmpdir(), 'nailbook-admin-authorization-'));
    const databaseUrl = `file:${resolve(tempDir, 'test.db')}`;
    prepareContractSqliteDatabase(databaseUrl);
    testApp = await createContractTestApp({ databaseUrl, uploadsPath: resolve(tempDir, 'uploads') });
    const role = await testApp.prisma.adminRole.create({ data: { name: 'Contract reader', code: 'contract-reader' } });
    roleId = role.id;
    const admin = await testApp.prisma.adminUser.create({ data: {
      username: 'contract-reader', passwordHash: 'not-used', roleId, status: 'active',
    } });
    adminId = admin.id;
    // Deliberately claim broad permissions in the token: the database must win.
    token = jwt.sign({ sub: adminId, tv: 0, permissions: ['technician:create', 'account:reset-password'] }, process.env.ADMIN_JWT_SECRET!);
  });

  afterAll(async () => {
    await testApp?.cleanup();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('covers every admin business route with authentication, permissions and write auditing', () => {
    for (const module of testApp.app.get(ModulesContainer).values()) {
      for (const wrapper of module.controllers.values()) {
        const controller = wrapper.metatype;
        if (!controller) continue;
        const prefix = Reflect.getMetadata(PATH_METADATA, controller);
        if (typeof prefix !== 'string') continue;
        for (const name of Object.getOwnPropertyNames(controller.prototype)) {
          const handler = controller.prototype[name];
          if (typeof handler !== 'function') continue;
          const method = Reflect.getMetadata(METHOD_METADATA, handler);
          if (method === undefined) continue;
          const suffix = Reflect.getMetadata(PATH_METADATA, handler);
          const path = `/api/${prefix}/${suffix}`.replace(/\/+/g, '/').replace(/\/$/, '');
          if (!path.startsWith('/api/admin/') || path.startsWith('/api/admin/auth/')) continue;
          expect([
            ...(Reflect.getMetadata(GUARDS_METADATA, controller) || []),
            ...(Reflect.getMetadata(GUARDS_METADATA, handler) || []),
          ]).toContain(JwtAuthGuard);
          const permissions = Reflect.getMetadata('permissions', handler);
          expect(permissions?.length).toBeGreaterThan(0);
          if ([RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE].includes(method)) {
            expect(Reflect.getMetadata('operationLog', handler)).toBeDefined();
            expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toContain(OperationLogInterceptor);
          }
          routes.push({ method: RequestMethod[method], path, permissions });
        }
      }
    }
    expect(routes.length).toBeGreaterThan(60);
    expect(routes.sort((a, b) => `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`))).toMatchSnapshot();
  });

  it('rejects every admin business route before resource lookup when permissions are missing', async () => {
    for (const route of routes) {
      const path = route.path.replace(/:[^/]+/g, '999999');
      const client = request(testApp.app.getHttpServer()) as any;
      await client[route.method.toLowerCase()](path).set('Authorization', `Bearer ${token}`).expect(403);
    }
  });

  it('returns 401 without a token and for a disabled administrator', async () => {
    await request(testApp.app.getHttpServer()).get('/api/admin/technicians').expect(401);
    const refreshToken = jwt.sign({ sub: adminId, tokenType: 'refresh' }, process.env.ADMIN_JWT_SECRET!);
    await request(testApp.app.getHttpServer()).get('/api/admin/auth/me').set('Authorization', `Bearer ${refreshToken}`).expect(401);
    await testApp.prisma.adminUser.update({ where: { id: adminId }, data: { status: 'inactive' } });
    await request(testApp.app.getHttpServer()).get('/api/admin/technicians').set('Authorization', `Bearer ${token}`).expect(401);
    await testApp.prisma.adminUser.update({ where: { id: adminId }, data: { status: 'active' } });
  });

  it('grants read-only access and revokes it immediately for the same JWT', async () => {
    const permission = await testApp.prisma.adminPermission.findUniqueOrThrow({ where: { code: 'technician:view' } });
    await testApp.prisma.adminRolePermission.create({ data: { roleId, permissionId: permission.id } });
    await request(testApp.app.getHttpServer()).get('/api/admin/technicians').set('Authorization', `Bearer ${token}`).expect(200);
    await request(testApp.app.getHttpServer()).get('/api/admin/technician-invite-keys').set('Authorization', `Bearer ${token}`).expect(403);
    await request(testApp.app.getHttpServer()).post('/api/admin/technician-invite-keys').set('Authorization', `Bearer ${token}`).send({ count: 1 }).expect(403);
    await testApp.prisma.adminRolePermission.deleteMany({ where: { roleId } });
    await request(testApp.app.getHttpServer()).get('/api/admin/technicians').set('Authorization', `Bearer ${token}`).expect(403);
  });

  it('allows a fully privileged administrator and records the mutation without the invite secret', async () => {
    const permissions = await testApp.prisma.adminPermission.findMany();
    for (const permission of permissions) {
      await testApp.prisma.adminRolePermission.create({ data: { roleId, permissionId: permission.id } });
    }
    await request(testApp.app.getHttpServer())
      .post('/api/admin/technician-invite-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ count: 1 })
      .expect(201);
    const logs = await testApp.prisma.operationLog.findMany({ where: { adminUserId: adminId } });
    expect(logs).toHaveLength(1);
    expect(JSON.parse(logs[0].afterData!)).toEqual({ outcome: 'succeeded' });
  });
});
