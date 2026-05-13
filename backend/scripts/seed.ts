import { PrismaClient, AdminPermission } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

  const operationRole = await prisma.adminRole.upsert({
    where: { code: 'operation' },
    update: {},
    create: {
      name: '运营',
      code: 'operation',
      description: '用户和数据管理',
    },
  });

  const financeRole = await prisma.adminRole.upsert({
    where: { code: 'finance' },
    update: {},
    create: {
      name: '财务',
      code: 'finance',
      description: '订阅和收入管理',
    },
  });

  const techRole = await prisma.adminRole.upsert({
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

  const createdPermissions: AdminPermission[] = [];
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

  const operationPerms = ['dashboard:view', 'technician:view', 'customer:view', 'quote:view', 'booking:view', 'revenue:view'];
  for (const permCode of operationPerms) {
    const perm = createdPermissions.find(p => p.code === permCode);
    if (perm) {
      await prisma.adminRolePermission.upsert({
        where: { roleId_permissionId: { roleId: operationRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: operationRole.id, permissionId: perm.id },
      });
    }
  }

  const financePerms = ['dashboard:view', 'revenue:view', 'subscription:view', 'subscription:update'];
  for (const permCode of financePerms) {
    const perm = createdPermissions.find(p => p.code === permCode);
    if (perm) {
      await prisma.adminRolePermission.upsert({
        where: { roleId_permissionId: { roleId: financeRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: financeRole.id, permissionId: perm.id },
      });
    }
  }

  const techPerms = ['system:config', 'log:view'];
  for (const permCode of techPerms) {
    const perm = createdPermissions.find(p => p.code === permCode);
    if (perm) {
      await prisma.adminRolePermission.upsert({
        where: { roleId_permissionId: { roleId: techRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: techRole.id, permissionId: perm.id },
      });
    }
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

  const proPlan = await prisma.subscriptionPlan.findUnique({
    where: { code: 'pro' },
  });

  const technician = await prisma.technician.upsert({
    where: { phone: '13800138000' },
    update: {
      name: '小美',
      city: '上海',
      serviceArea: '上海市区（半径15km）',
      status: 'active',
      invitationCode: '123456',
    },
    create: {
      name: '小美',
      phone: '13800138000',
      city: '上海',
      serviceArea: '上海市区（半径15km）',
      status: 'active',
      invitationCode: '123456',
    },
  });

  if (proPlan) {
    await prisma.technicianSubscription.upsert({
      where: { technicianId: technician.id },
      update: {
        planId: proPlan.id,
        status: 'active',
      },
      create: {
        technicianId: technician.id,
        planId: proPlan.id,
        status: 'active',
        startedAt: new Date('2026-04-01T00:00:00.000Z'),
      },
    });
  }

  const customerInputs = [
    { name: '王小美', phone: '13800138001', address: '朝阳区建国路88号', tags: '常客,高频', notes: '喜欢精致简约风格' },
    { name: '李小红', phone: '13800138002', address: '海淀区中关村大街1号', tags: '新客,裸色系', notes: '偏爱低饱和颜色' },
    { name: '张小丽', phone: '13800138003', address: '西城区金融街19号', tags: '常客,延长款', notes: '愿意尝试复杂款式' },
  ];

  const seededCustomers: Array<{ id: number }> = [];
  for (const input of customerInputs) {
    let customer = await prisma.customer.findFirst({
      where: {
        technicianId: technician.id,
        phone: input.phone,
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          technicianId: technician.id,
          name: input.name,
          phone: input.phone,
          address: input.address,
          tags: input.tags,
          notes: input.notes,
        },
      });
    }

    seededCustomers.push(customer);
  }

  const orders = [
    {
      orderNo: 'OD20260428001',
      customerId: seededCustomers[0].id,
      address: '朝阳区建国路88号',
      startTime: new Date('2026-04-28T10:00:00.000Z'),
      endTime: new Date('2026-04-28T12:00:00.000Z'),
      quotePrice: 299,
      status: 'pending_quote',
      isDepositPaid: false,
    },
    {
      orderNo: 'OD20260428002',
      customerId: seededCustomers[1].id,
      address: '海淀区中关村大街1号',
      startTime: new Date('2026-04-28T14:00:00.000Z'),
      endTime: new Date('2026-04-28T16:00:00.000Z'),
      quotePrice: 399,
      status: 'confirmed',
      isDepositPaid: true,
      confirmedAt: new Date('2026-04-27T10:00:00.000Z'),
    },
    {
      orderNo: 'OD20260428003',
      customerId: seededCustomers[2].id,
      address: '西城区金融街19号',
      startTime: new Date('2026-04-28T18:00:00.000Z'),
      endTime: new Date('2026-04-28T20:00:00.000Z'),
      quotePrice: 499,
      status: 'completed',
      isDepositPaid: true,
      confirmedAt: new Date('2026-04-27T12:00:00.000Z'),
      completedAt: new Date('2026-04-28T20:30:00.000Z'),
    },
  ];

  for (const input of orders) {
    await prisma.order.upsert({
      where: { orderNo: input.orderNo },
      update: {
        address: input.address,
        startTime: input.startTime,
        endTime: input.endTime,
        quotePrice: input.quotePrice,
        status: input.status,
        isDepositPaid: input.isDepositPaid,
        confirmedAt: input.confirmedAt,
        completedAt: input.completedAt,
      },
      create: {
        orderNo: input.orderNo,
        technicianId: technician.id,
        customerId: input.customerId,
        address: input.address,
        startTime: input.startTime,
        endTime: input.endTime,
        quotePrice: input.quotePrice,
        status: input.status,
        isDepositPaid: input.isDepositPaid,
        confirmedAt: input.confirmedAt,
        completedAt: input.completedAt,
      },
    });
  }

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
