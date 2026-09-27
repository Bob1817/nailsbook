import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateAdminUserDto, UpdateAdminUserDto } from './admin-users.dto';

const accountSelect = {
  id: true, username: true, realName: true, roleId: true, status: true,
  lastLoginAt: true, createdAt: true,
  role: { select: { id: true, name: true, code: true } },
} as const;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.adminUser.findMany({ select: accountSelect, orderBy: { id: 'asc' } });
  }

  private async validateRole(roleId: number) {
    const role = await this.prisma.adminRole.findUnique({ where: { id: roleId } });
    if (!role || role.code === 'super_admin') {
      throw new BadRequestException('请选择子管理员角色');
    }
  }

  async create(data: CreateAdminUserDto) {
    await this.validateRole(data.roleId);
    try {
      return await this.prisma.adminUser.create({
        data: { username: data.username, realName: data.realName, roleId: data.roleId,
          passwordHash: await bcrypt.hash(data.password, 10) },
        select: accountSelect,
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('账号已存在');
      }
      throw error;
    }
  }

  async update(id: number, data: UpdateAdminUserDto) {
    const user = await this.prisma.adminUser.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new NotFoundException('账号不存在');
    if (user.role.code === 'super_admin' && (data.roleId !== undefined || data.status !== undefined)) {
      throw new BadRequestException('不能禁用超级管理员或变更其角色');
    }
    if (data.roleId !== undefined) await this.validateRole(data.roleId);
    return this.prisma.adminUser.update({
      where: { id },
      data: {
        realName: data.realName, roleId: data.roleId, status: data.status,
        ...(data.password !== undefined && { passwordHash: await bcrypt.hash(data.password, 10) }),
        ...((data.password !== undefined || data.status !== undefined || data.roleId !== undefined)
          && { tokenVersion: { increment: 1 } }),
      },
      select: accountSelect,
    });
  }
}
