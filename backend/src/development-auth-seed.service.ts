import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from './common/prisma/prisma.service';

@Injectable()
export class DevelopmentAuthSeedService implements OnModuleInit {
  private readonly logger = new Logger(DevelopmentAuthSeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    if (this.configService.get<string>('NODE_ENV') !== 'development') {
      return;
    }

    await this.ensureFixtures();
  }

  private async ensureFixtures() {
    const role = await this.prisma.adminRole.upsert({
      where: { code: 'super_admin' },
      update: {},
      create: {
        name: '超级管理员',
        code: 'super_admin',
        description: '开发环境默认超级管理员',
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
      { name: '功能开关查看', code: 'feature_flag:view', module: 'feature_flag', action: 'view' },
      { name: '功能开关更新', code: 'feature_flag:update', module: 'feature_flag', action: 'update' },
      { name: '角色查看', code: 'role:view', module: 'role', action: 'view' },
      { name: '角色创建', code: 'role:create', module: 'role', action: 'create' },
      { name: '角色更新', code: 'role:update', module: 'role', action: 'update' },
      { name: '角色删除', code: 'role:delete', module: 'role', action: 'delete' },
      { name: '权限查看', code: 'permission:view', module: 'permission', action: 'view' },
    ];

    for (const permission of permissions) {
      const createdPermission = await this.prisma.adminPermission.upsert({
        where: { code: permission.code },
        update: {},
        create: permission,
      });

      await this.prisma.adminRolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: createdPermission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: createdPermission.id,
        },
      });
    }

    // Seed editor role for demonstration
    const editorRole = await this.prisma.adminRole.upsert({
      where: { code: 'editor' },
      update: {},
      create: { name: '编辑员', code: 'editor', description: '可管理技师和客户，不可管理系统配置' },
    });
    const editorPermCodes = ['technician:view', 'technician:create', 'customer:view', 'revenue:view', 'order:view'];
    for (const code of editorPermCodes) {
      const perm = await this.prisma.adminPermission.findUnique({ where: { code } });
      if (perm) {
        await this.prisma.adminRolePermission.upsert({
          where: { roleId_permissionId: { roleId: editorRole.id, permissionId: perm.id } },
          update: {},
          create: { roleId: editorRole.id, permissionId: perm.id },
        });
      }
    }

    const adminUser = await this.prisma.adminUser.findUnique({
      where: { username: 'admin' },
    });
    if (!adminUser) {
      await this.prisma.adminUser.create({
        data: {
          username: 'admin',
          passwordHash: await bcrypt.hash('123456', 10),
          realName: '超级管理员',
          roleId: role.id,
          status: 'active',
        },
      });
    }

    let plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code: 'pro' },
    });
    if (!plan) {
      plan = await this.prisma.subscriptionPlan.create({
        data: {
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
    }

    let technician = await this.prisma.technician.findUnique({
      where: { phone: '13800138000' },
    });
    if (!technician) {
      technician = await this.prisma.technician.create({
        data: {
          name: '小美',
          phone: '13800138000',
          city: '上海',
          serviceArea: '上海市区（半径15km）',
          status: 'active',
          invitationCode: '123456',
        },
      });
    }

    const technicianSubscription =
      await this.prisma.technicianSubscription.findUnique({
        where: { technicianId: technician.id },
      });
    if (!technicianSubscription) {
      await this.prisma.technicianSubscription.create({
        data: {
          technicianId: technician.id,
          planId: plan.id,
          status: 'active',
          startedAt: new Date(),
        },
      });
    }

    let clientUser = await this.prisma.clientUser.findUnique({
      where: { phone: '13800138001' },
    });
    if (!clientUser) {
      clientUser = await this.prisma.clientUser.create({
        data: {
          phone: '13800138001',
          nickname: '王小美',
          status: 'active',
        },
      });
    }

    const binding = await this.prisma.clientTechBinding.findUnique({
      where: {
        clientId_techId: {
          clientId: clientUser.id,
          techId: technician.id,
        },
      },
    });
    if (!binding) {
      const activeBindingCount = await this.prisma.clientTechBinding.count({
        where: {
          clientId: clientUser.id,
          status: 'active',
        },
      });

      await this.prisma.clientTechBinding.create({
        data: {
          clientId: clientUser.id,
          techId: technician.id,
          inviteCode: '123456',
          bindSource: 'invite',
          isDefault: activeBindingCount === 0,
          status: 'active',
        },
      });
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        technicianId: technician.id,
        clientUserId: clientUser.id,
      },
    });
    if (!customer) {
      await this.prisma.customer.create({
        data: {
          technicianId: technician.id,
          clientUserId: clientUser.id,
          name: clientUser.nickname || '王小美',
          phone: clientUser.phone,
          address: '上海市静安区南京西路',
        },
      });
    }

    this.logger.log('Development auth fixtures verified');
  }
}
