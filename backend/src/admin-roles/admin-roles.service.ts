import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AdminRolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.adminRole.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.adminRole.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new NotFoundException('角色不存在');
    return role;
  }

  async create(data: { name: string; code: string; description?: string; permissionIds?: number[] }) {
    const existing = await this.prisma.adminRole.findUnique({ where: { code: data.code } });
    if (existing) throw new BadRequestException('角色编码已存在');

    return this.prisma.adminRole.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description || null,
        permissions: data.permissionIds?.length
          ? { create: data.permissionIds.map((pid) => ({ permissionId: pid })) }
          : undefined,
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async update(id: number, data: { name?: string; description?: string; permissionIds?: number[] }) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      if (data.permissionIds !== undefined) {
        await tx.adminRolePermission.deleteMany({ where: { roleId: id } });
        if (data.permissionIds.length > 0) {
          await tx.adminRolePermission.createMany({
            data: data.permissionIds.map((pid) => ({ roleId: id, permissionId: pid })),
          });
        }
      }

      return tx.adminRole.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
        },
        include: { permissions: { include: { permission: true } } },
      });
    });
  }

  async remove(id: number) {
    const role = await this.findOne(id);
    if (role.code === 'super_admin') throw new BadRequestException('不能删除超级管理员角色');
    if ((role as any)._count.users > 0) throw new BadRequestException('该角色下还有用户，不能删除');

    await this.prisma.$transaction(async (tx) => {
      await tx.adminRolePermission.deleteMany({ where: { roleId: id } });
      await tx.adminRole.delete({ where: { id } });
    });

    return { success: true };
  }
}
