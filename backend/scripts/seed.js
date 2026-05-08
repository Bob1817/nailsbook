const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  const adminRole = await prisma.adminRole.upsert({
    where: { code: 'super_admin' },
    update: {},
    create: {
      name: '超级管理员',
      code: 'super_admin',
      description: '拥有所有权限',
    },
  });

  await prisma.adminRole.upsert({
    where: { code: 'operation' },
    update: {},
    create: {
      name: '运营',
      code: 'operation',
      description: '用户和数据管理',
    },
  });

  await prisma.adminRole.upsert({
    where: { code: 'finance' },
    update: {},
    create: {
      name: '财务',
      code: 'finance',
      description: '订阅和收入管理',
    },
  });

  await prisma.adminRole.upsert({
    where: { code: 'technical' },
    update: {},
    create: {
      name: '技术',
      code: 'technical',
      description: '系统配置管理',
    },
  });

  const permissions = [
    { name: '数据看板查看', code: 'dashboard:view', module: 'dashboard', action: 'view' },
    { name: '美甲师查看', code: 'technician:view', module: 'technician', action: 'view' },
    { name: '美甲师创建', code: 'technician:create', module: 'technician', action: 'create' },
    { name: '美甲师更新', code: 'technician:update', module: 'technician', action: 'update' },
    { name: '美甲师禁用', code: 'technician:disable', module: 'technician', action: 'disable' },
    { name: '客户查看', code: 'customer:view', module: 'customer', action: 'view' },
    { name: '报价查看', code: 'quote:view', module: 'quote', action: 'view' },
    { name: '报价取消', code: 'quote:cancel', module: 'quote', action: 'cancel' },
    { name: '预约查看', code: 'booking:view', module: 'booking', action: 'view' },
    { name: '预约确认', code: 'booking:confirm', module: 'booking', action: 'confirm' },
    { name: '预约完成', code: 'booking:complete', module: 'booking', action: 'complete' },
    { name: '预约取消', code: 'booking:cancel', module: 'booking', action: 'cancel' },
    { name: '收入查看', code: 'revenue:view', module: 'revenue', action: 'view' },
    { name: '订阅查看', code: 'subscription:view', module: 'subscription', action: 'view' },
    { name: '订阅更新', code: 'subscription:update', module: 'subscription', action: 'update' },
    { name: '系统配置', code: 'system:config', module: 'system', action: 'config' },
    { name: '日志查看', code: 'log:view', module: 'log', action: 'view' },
  ];

  const createdPermissions = [];
  for (const perm of permissions) {
    const p = await prisma.adminPermission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
    createdPermissions.push(p);
  }

  for (const perm of createdPermissions) {
    await prisma.adminRolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hashedPassword,
      realName: '超级管理员',
      roleId: adminRole.id,
      status: 'active',
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: 'free' },
    update: {},
    create: {
      name: '免费版',
      code: 'free',
      price: 0,
      billingCycle: 'free',
      maxCustomers: 50,
      maxMonthlyBookings: 30,
      features: JSON.stringify(['basic_tags']),
      status: 'active',
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: 'pro' },
    update: {},
    create: {
      name: 'Pro版',
      code: 'pro',
      price: 29,
      billingCycle: 'monthly',
      maxCustomers: null,
      maxMonthlyBookings: null,
      features: JSON.stringify(['customer_tags', 'analytics', 'unlimited_bookings']),
      status: 'active',
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: 'premium' },
    update: {},
    create: {
      name: 'Premium版',
      code: 'premium',
      price: 59,
      billingCycle: 'monthly',
      maxCustomers: null,
      maxMonthlyBookings: null,
      features: JSON.stringify(['customer_tags', 'analytics', 'unlimited_bookings', 'priority_support']),
      status: 'active',
    },
  });

  console.log('Seed data inserted successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
