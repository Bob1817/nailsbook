// Runs only inside the disposable QA backend; never target a production database.
const assert = require('node:assert/strict');
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const jwt = require('/app/node_modules/jsonwebtoken');
const prisma = new PrismaClient();

(async () => {
  assert.equal(process.env.DATABASE_URL, 'file:/app/data/qa.db');
  const role = await prisma.adminRole.create({ data: { name: 'Proxy QA', code: `proxy-qa-${Date.now()}` } });
  const admin = await prisma.adminUser.create({ data: {
    username: `proxy-qa-${Date.now()}`, passwordHash: 'not-a-login-password', roleId: role.id, status: 'active',
  } });
  const token = jwt.sign({ sub: admin.id, tv: 0, permissions: ['technician:create'] }, process.env.ADMIN_JWT_SECRET);
  async function check(path, expected, bearer = token, method = 'GET') {
    const response = await fetch(`http://nginx/api/admin/${path}`, {
      method,
      headers: { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: JSON.stringify({ count: 1 }) } : {}),
    });
    await response.text();
    assert.equal(response.status, expected, `${method} ${path}`);
  }
  await check('technicians', 401, null);
  await check('technicians', 403);
  await check('technician-invite-keys', 403, token, 'POST');
  const view = await prisma.adminPermission.findUniqueOrThrow({ where: { code: 'technician:view' } });
  await prisma.adminRolePermission.create({ data: { roleId: role.id, permissionId: view.id } });
  await check('technicians', 200);
  await check('technician-invite-keys', 403, token, 'POST');
  await prisma.adminRolePermission.deleteMany({ where: { roleId: role.id } });
  await check('technicians', 403);
  for (const permission of await prisma.adminPermission.findMany()) {
    await prisma.adminRolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
  }
  await check('technician-invite-keys', 201, token, 'POST');
  const logs = await prisma.operationLog.findMany({ where: { adminUserId: admin.id } });
  assert.equal(logs.length, 1);
  assert.deepEqual(JSON.parse(logs[0].afterData), { outcome: 'succeeded' });
  await prisma.adminUser.update({ where: { id: admin.id }, data: { status: 'inactive' } });
  await check('technicians', 401);
  console.log('Proxy authorization passed: anonymous, no-permission, read-only, revoked, privileged, disabled; audit persisted without secrets.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
