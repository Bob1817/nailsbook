import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from './common/prisma/prisma.service';

/**
 * 生产环境种子数据服务 —— 在所有环境下运行
 * 确保 super_admin 角色、权限和管理员账户始终存在
 * 使用 upsert，幂等安全，不会覆盖已有数据
 */
@Injectable()
export class ProductionSeedService implements OnModuleInit {
  private readonly logger = new Logger(ProductionSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureAdminFixtures();
  }

  private async ensureAdminFixtures() {
    // 1. 确保 super_admin 角色存在
    const role = await this.prisma.adminRole.upsert({
      where: { code: 'super_admin' },
      update: {},
      create: {
        name: '超级管理员',
        code: 'super_admin',
        description: '超级管理员角色，拥有全部权限',
      },
    });

    // 2. 定义全部权限
    const permissions = [
      { name: '注销申请查看', code: 'account-deletion:view', module: 'account-deletion', action: 'view' },
      { name: '注销申请审核', code: 'account-deletion:manage', module: 'account-deletion', action: 'manage' },
      {
        name: '数据看板查看',
        code: 'dashboard:view',
        module: 'dashboard',
        action: 'view',
      },
      {
        name: '美甲师查看',
        code: 'technician:view',
        module: 'technician',
        action: 'view',
      },
      {
        name: '美甲师创建',
        code: 'technician:create',
        module: 'technician',
        action: 'create',
      },
      {
        name: '美甲师更新',
        code: 'technician:update',
        module: 'technician',
        action: 'update',
      },
      {
        name: '美甲师禁用',
        code: 'technician:disable',
        module: 'technician',
        action: 'disable',
      },
      {
        name: '美甲师删除',
        code: 'technician:delete',
        module: 'technician',
        action: 'delete',
      },
      {
        name: '客户查看',
        code: 'customer:view',
        module: 'customer',
        action: 'view',
      },
      {
        name: '账号密码重置',
        code: 'account:reset-password',
        module: 'account',
        action: 'reset-password',
      },
      { name: '报价查看', code: 'quote:view', module: 'quote', action: 'view' },
      {
        name: '报价取消',
        code: 'quote:cancel',
        module: 'quote',
        action: 'cancel',
      },
      {
        name: '预约查看',
        code: 'booking:view',
        module: 'booking',
        action: 'view',
      },
      {
        name: '预约确认',
        code: 'booking:confirm',
        module: 'booking',
        action: 'confirm',
      },
      {
        name: '预约完成',
        code: 'booking:complete',
        module: 'booking',
        action: 'complete',
      },
      {
        name: '预约取消',
        code: 'booking:cancel',
        module: 'booking',
        action: 'cancel',
      },
      {
        name: '收入查看',
        code: 'revenue:view',
        module: 'revenue',
        action: 'view',
      },
      {
        name: '订阅查看',
        code: 'subscription:view',
        module: 'subscription',
        action: 'view',
      },
      {
        name: '订阅更新',
        code: 'subscription:update',
        module: 'subscription',
        action: 'update',
      },
      {
        name: '系统配置',
        code: 'system:config',
        module: 'system',
        action: 'config',
      },
      { name: '日志查看', code: 'log:view', module: 'log', action: 'view' },
      {
        name: '功能开关查看',
        code: 'feature_flag:view',
        module: 'feature_flag',
        action: 'view',
      },
      {
        name: '功能开关更新',
        code: 'feature_flag:update',
        module: 'feature_flag',
        action: 'update',
      },
      { name: '角色查看', code: 'role:view', module: 'role', action: 'view' },
      {
        name: '角色创建',
        code: 'role:create',
        module: 'role',
        action: 'create',
      },
      {
        name: '角色更新',
        code: 'role:update',
        module: 'role',
        action: 'update',
      },
      {
        name: '角色删除',
        code: 'role:delete',
        module: 'role',
        action: 'delete',
      },
      {
        name: '权限查看',
        code: 'permission:view',
        module: 'permission',
        action: 'view',
      },
      { name: '作品查看', code: 'work:view', module: 'work', action: 'view' },
      {
        name: '作品管理',
        code: 'work:manage',
        module: 'work',
        action: 'manage',
      },
      {
        name: '评论查看',
        code: 'comment:view',
        module: 'comment',
        action: 'view',
      },
      {
        name: '评论管理',
        code: 'comment:manage',
        module: 'comment',
        action: 'manage',
      },
      {
        name: '举报查看',
        code: 'report:view',
        module: 'report',
        action: 'view',
      },
      {
        name: '举报管理',
        code: 'report:manage',
        module: 'report',
        action: 'manage',
      },
      {
        name: '反馈查看',
        code: 'feedback:view',
        module: 'feedback',
        action: 'view',
      },
      {
        name: '反馈管理',
        code: 'feedback:manage',
        module: 'feedback',
        action: 'manage',
      },
      {
        name: '申请查看',
        code: 'application:view',
        module: 'application',
        action: 'view',
      },
      {
        name: '申请管理',
        code: 'application:manage',
        module: 'application',
        action: 'manage',
      },
    ];

    // 3. 逐个创建权限并关联到角色（upsert 幂等）
    for (const perm of permissions) {
      const created = await this.prisma.adminPermission.upsert({
        where: { code: perm.code },
        update: { name: perm.name },
        create: perm,
      });

      await this.prisma.adminRolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: created.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: created.id,
        },
      });
    }

    // 4. 确保 admin 用户存在（仅创建，不覆盖已有账户）
    const username = process.env.ADMIN_INITIAL_USERNAME || 'admin';
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { username },
    });
    if (!adminUser) {
      const configuredPassword = process.env.ADMIN_INITIAL_PASSWORD;
      if (process.env.NODE_ENV === 'production' && !configuredPassword) {
        throw new Error(
          '首次生产部署必须配置 ADMIN_INITIAL_PASSWORD，系统不会创建默认弱密码管理员',
        );
      }
      const password = configuredPassword || '123456';
      if (process.env.NODE_ENV === 'production' && password.length < 12) {
        throw new Error('ADMIN_INITIAL_PASSWORD 长度不得少于 12 位');
      }
      const hash = await bcrypt.hash(password, 10);
      await this.prisma.adminUser.create({
        data: {
          username,
          passwordHash: hash,
          realName: '超级管理员',
          roleId: role.id,
          status: 'active',
        },
      });
      this.logger.log(`已创建初始管理员账户: ${username}`);
    }

    this.logger.log('Production seed: admin fixtures verified ✓');
  }
}
